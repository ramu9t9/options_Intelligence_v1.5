import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { 
  symbols, 
  liveMarketSnapshots, 
  historicalCandleData, 
  historicalOptionChain,
  strategies,
  strategyConditions,
  strategyAlerts,
  backtestRuns,
  patternDetections,
  dataSources,
  InsertLiveMarketSnapshot,
  InsertHistoricalCandleData,
  InsertHistoricalOptionChain,
  InsertPatternDetection
} from '../shared/sensibull-schema.js';
import { dataFallbackService } from './dataFallbackService.js';
import logger from './logger.js';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
const sql = postgres(connectionString, { max: 10 });
const db = drizzle(sql);

class SensibullDataService {
  private isLiveDataActive = false;
  private liveDataInterval: NodeJS.Timeout | null = null;
  private historicalDataInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    logger.info('🚀 Initializing Sensibull Data Service...');
    
    try {
      // Start live data collection (every 5 seconds)
      this.startLiveDataCollection();
      
      // Start historical data collection (every 15 minutes)
      this.startHistoricalDataCollection();
      
      logger.info('✅ Sensibull Data Service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Sensibull Data Service:', error);
    }
  }

  // ===========================
  // LIVE DATA MANAGEMENT (5-second updates)
  // ===========================

  startLiveDataCollection() {
    if (this.isLiveDataActive) {
      logger.warn('⚠️ Live data collection already active');
      return;
    }

    this.isLiveDataActive = true;
    logger.info('📡 Starting live data collection (5-second intervals)');

    this.liveDataInterval = setInterval(async () => {
      try {
        await this.collectLiveDataForAllSymbols();
      } catch (error) {
        logger.error('❌ Live data collection error:', error);
      }
    }, 5000); // 5 seconds
  }

  stopLiveDataCollection() {
    if (this.liveDataInterval) {
      clearInterval(this.liveDataInterval);
      this.liveDataInterval = null;
      this.isLiveDataActive = false;
      logger.info('🛑 Stopped live data collection');
    }
  }

  private async collectLiveDataForAllSymbols() {
    try {
      // Get all active symbols
      const activeSymbols = await db
        .select({ id: symbols.id, name: symbols.name })
        .from(symbols)
        .where(eq(symbols.isActive, true));

      logger.info(`📊 Collecting live data for ${activeSymbols.length} symbols`);

      // Collect data for each symbol
      for (const symbol of activeSymbols) {
        try {
          const result = await dataFallbackService.fetchLiveData(symbol.name);
          
          const snapshotData: InsertLiveMarketSnapshot = {
            symbolId: symbol.id,
            price: String(result.data.price),
            volume: result.data.volume || 0,
            oi: result.data.oi || 0,
            changeOi: result.data.changeOi || 0,
            bid: result.data.bid ? String(result.data.bid) : undefined,
            ask: result.data.ask ? String(result.data.ask) : undefined,
            change: String(result.data.change || 0),
            changePercent: String(result.data.changePercent || 0),
            dataSource: result.source
          };

          await db.insert(liveMarketSnapshots).values(snapshotData);
          
        } catch (error) {
          logger.error(`❌ Failed to collect live data for ${symbol.name}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('❌ Error in live data collection:', error);
    }
  }

  // ===========================
  // HISTORICAL DATA MANAGEMENT (15-minute updates)
  // ===========================

  startHistoricalDataCollection() {
    logger.info('📈 Starting historical data collection (15-minute intervals)');

    this.historicalDataInterval = setInterval(async () => {
      try {
        await this.collectHistoricalDataForAllSymbols();
        await this.collectOptionChainDataForAllSymbols();
      } catch (error) {
        logger.error('❌ Historical data collection error:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  stopHistoricalDataCollection() {
    if (this.historicalDataInterval) {
      clearInterval(this.historicalDataInterval);
      this.historicalDataInterval = null;
      logger.info('🛑 Stopped historical data collection');
    }
  }

  private async collectHistoricalDataForAllSymbols() {
    try {
      const activeSymbols = await db
        .select({ id: symbols.id, name: symbols.name })
        .from(symbols)
        .where(eq(symbols.isActive, true));

      logger.info(`📊 Collecting historical data for ${activeSymbols.length} symbols`);

      const timeframes = ['1min', '5min', '15min', '1hr', '1d'];
      const to = new Date();
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      for (const symbol of activeSymbols) {
        for (const timeframe of timeframes) {
          try {
            const result = await dataFallbackService.fetchHistoricalData(
              symbol.name, 
              timeframe, 
              from, 
              to
            );

            for (const candle of result.data) {
              const candleData: InsertHistoricalCandleData = {
                symbolId: symbol.id,
                timeframe: timeframe as any,
                timestamp: candle.timestamp,
                open: String(candle.open),
                high: String(candle.high),
                low: String(candle.low),
                close: String(candle.close),
                volume: candle.volume || 0,
                dataSource: result.source
              };

              await db.insert(historicalCandleData)
                .values(candleData)
                .onConflictDoNothing();
            }
          } catch (error) {
            logger.error(`❌ Failed to collect historical data for ${symbol.name} (${timeframe}):`, error.message);
          }
        }
      }
    } catch (error) {
      logger.error('❌ Error in historical data collection:', error);
    }
  }

  private async collectOptionChainDataForAllSymbols() {
    try {
      const indexSymbols = await db
        .select({ id: symbols.id, name: symbols.name })
        .from(symbols)
        .where(and(
          eq(symbols.isActive, true),
          eq(symbols.type, 'INDEX')
        ));

      logger.info(`⚡ Collecting option chain data for ${indexSymbols.length} index symbols`);

      for (const symbol of indexSymbols) {
        try {
          const result = await dataFallbackService.fetchOptionChain(symbol.name);
          
          if (result.data.strikes) {
            for (const strike of result.data.strikes) {
              // Store call option data
              if (strike.callLTP) {
                const callData: InsertHistoricalOptionChain = {
                  symbolId: symbol.id,
                  timestamp: result.timestamp,
                  ltp: String(strike.callLTP),
                  oiChange: strike.callOI || 0,
                  volume: strike.callVolume || 0,
                  openInterest: strike.callOI || 0,
                  dataSource: result.source
                };
                
                await db.insert(historicalOptionChain).values(callData);
              }
              
              // Store put option data
              if (strike.putLTP) {
                const putData: InsertHistoricalOptionChain = {
                  symbolId: symbol.id,
                  timestamp: result.timestamp,
                  ltp: String(strike.putLTP),
                  oiChange: strike.putOI || 0,
                  volume: strike.putVolume || 0,
                  openInterest: strike.putOI || 0,
                  dataSource: result.source
                };
                
                await db.insert(historicalOptionChain).values(putData);
              }
            }
          }
        } catch (error) {
          logger.error(`❌ Failed to collect option chain for ${symbol.name}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('❌ Error in option chain collection:', error);
    }
  }

  // ===========================
  // DATA RETRIEVAL METHODS
  // ===========================

  async getLiveMarketData(symbolName: string, limit = 100) {
    try {
      const result = await db
        .select({
          id: liveMarketSnapshots.id,
          symbolName: symbols.name,
          timestamp: liveMarketSnapshots.timestamp,
          price: liveMarketSnapshots.price,
          volume: liveMarketSnapshots.volume,
          oi: liveMarketSnapshots.oi,
          changeOi: liveMarketSnapshots.changeOi,
          change: liveMarketSnapshots.change,
          changePercent: liveMarketSnapshots.changePercent,
          dataSource: liveMarketSnapshots.dataSource
        })
        .from(liveMarketSnapshots)
        .innerJoin(symbols, eq(liveMarketSnapshots.symbolId, symbols.id))
        .where(eq(symbols.name, symbolName))
        .orderBy(desc(liveMarketSnapshots.timestamp))
        .limit(limit);

      return result;
    } catch (error) {
      logger.error(`❌ Database error fetching live market data for ${symbolName}, falling back to mock data:`, error.message);
      
      // Fallback to mock data when database is unavailable
      const mockData = await dataFallbackService.fetchLiveData(symbolName);
      return [{
        id: 1,
        symbolName: symbolName,
        timestamp: new Date(),
        price: String(mockData.data.price),
        volume: mockData.data.volume || 0,
        oi: mockData.data.oi || 0,
        changeOi: mockData.data.changeOi || 0,
        change: String(mockData.data.change || 0),
        changePercent: String(mockData.data.changePercent || 0),
        dataSource: mockData.source
      }];
    }
  }

  async getAllLiveMarketData() {
    const activeSymbols = ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFC'];
    const results = [];
    
    for (const symbol of activeSymbols) {
      try {
        const data = await this.getLiveMarketData(symbol, 1);
        if (data && data.length > 0) {
          results.push(data[0]);
        }
      } catch (error) {
        logger.error(`❌ Error getting live data for ${symbol}:`, error.message);
      }
    }
    
    return results;
  }

  async getHistoricalCandles(
    symbolName: string, 
    timeframe: string, 
    from: Date, 
    to: Date
  ) {
    try {
      const result = await db
        .select({
          timestamp: historicalCandleData.timestamp,
          open: historicalCandleData.open,
          high: historicalCandleData.high,
          low: historicalCandleData.low,
          close: historicalCandleData.close,
          volume: historicalCandleData.volume,
          dataSource: historicalCandleData.dataSource
        })
        .from(historicalCandleData)
        .innerJoin(symbols, eq(historicalCandleData.symbolId, symbols.id))
        .where(and(
          eq(symbols.name, symbolName),
          eq(historicalCandleData.timeframe, timeframe),
          gte(historicalCandleData.timestamp, from),
          lte(historicalCandleData.timestamp, to)
        ))
        .orderBy(asc(historicalCandleData.timestamp));

      return result;
    } catch (error) {
      logger.error(`❌ Error fetching historical candles for ${symbolName}:`, error);
      throw error;
    }
  }

  async getOptionChainHistory(symbolName: string, limit = 50) {
    try {
      const result = await db
        .select({
          timestamp: historicalOptionChain.timestamp,
          ltp: historicalOptionChain.ltp,
          iv: historicalOptionChain.iv,
          oiChange: historicalOptionChain.oiChange,
          volume: historicalOptionChain.volume,
          openInterest: historicalOptionChain.openInterest,
          dataSource: historicalOptionChain.dataSource
        })
        .from(historicalOptionChain)
        .innerJoin(symbols, eq(historicalOptionChain.symbolId, symbols.id))
        .where(eq(symbols.name, symbolName))
        .orderBy(desc(historicalOptionChain.timestamp))
        .limit(limit);

      return result;
    } catch (error) {
      logger.error(`❌ Error fetching option chain history for ${symbolName}:`, error);
      throw error;
    }
  }

  async getPatternDetections(symbolName?: string, limit = 100) {
    try {
      let query = db
        .select({
          id: patternDetections.id,
          symbolName: symbols.name,
          patternName: patternDetections.patternName,
          confidence: patternDetections.confidence,
          timeframe: patternDetections.timeframe,
          timestamp: patternDetections.timestamp,
          direction: patternDetections.direction,
          targetPrice: patternDetections.targetPrice,
          stopLoss: patternDetections.stopLoss,
          isActive: patternDetections.isActive
        })
        .from(patternDetections)
        .innerJoin(symbols, eq(patternDetections.symbolId, symbols.id));

      if (symbolName) {
        query = query.where(eq(symbols.name, symbolName));
      }

      const result = await query
        .orderBy(desc(patternDetections.timestamp))
        .limit(limit);

      return result;
    } catch (error) {
      logger.error(`❌ Error fetching pattern detections:`, error);
      throw error;
    }
  }

  // ===========================
  // DATA SOURCE MANAGEMENT
  // ===========================

  async getDataSourceHealth() {
    try {
      const sources = await db.select().from(dataSources);
      const fallbackHealth = dataFallbackService.getSourceHealth();
      
      return sources.map(source => {
        const fallbackData = fallbackHealth.find(f => f.name === source.name);
        return {
          ...source,
          currentUsage: fallbackData?.currentUsage || 0,
          usagePercentage: fallbackData?.usagePercentage || '0.00'
        };
      });
    } catch (error) {
      logger.error('❌ Error fetching data source health:', error);
      throw error;
    }
  }

  async updateDataSourceStatus(sourceName: string, isActive: boolean) {
    try {
      await db
        .update(dataSources)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(dataSources.name, sourceName));
      
      dataFallbackService.updateSourceStatus(sourceName, isActive);
      
      logger.info(`✅ Updated data source ${sourceName} status to ${isActive ? 'active' : 'inactive'}`);
    } catch (error) {
      logger.error(`❌ Error updating data source status:`, error);
      throw error;
    }
  }

  // ===========================
  // PATTERN DETECTION
  // ===========================

  async detectAndStorePatterns() {
    logger.info('🧠 Running AI pattern detection...');
    
    try {
      const activeSymbols = await db
        .select({ id: symbols.id, name: symbols.name })
        .from(symbols)
        .where(eq(symbols.isActive, true));

      for (const symbol of activeSymbols) {
        // Simple pattern detection logic (can be enhanced with ML models)
        const recentCandles = await this.getHistoricalCandles(
          symbol.name, 
          '15min', 
          new Date(Date.now() - 24 * 60 * 60 * 1000), 
          new Date()
        );

        if (recentCandles.length >= 3) {
          const patterns = this.analyzePatterns(recentCandles);
          
          for (const pattern of patterns) {
            const patternData: InsertPatternDetection = {
              symbolId: symbol.id,
              patternName: pattern.name,
              confidence: String(pattern.confidence),
              timeframe: '15min',
              timestamp: new Date(),
              direction: pattern.direction,
              targetPrice: pattern.targetPrice ? String(pattern.targetPrice) : undefined,
              stopLoss: pattern.stopLoss ? String(pattern.stopLoss) : undefined
            };

            await db.insert(patternDetections).values(patternData);
          }
        }
      }
      
      logger.info('✅ Pattern detection completed');
    } catch (error) {
      logger.error('❌ Error in pattern detection:', error);
    }
  }

  private analyzePatterns(candles: any[]): any[] {
    const patterns = [];
    
    // Simple bullish engulfing pattern detection
    if (candles.length >= 2) {
      const prev = candles[candles.length - 2];
      const current = candles[candles.length - 1];
      
      if (
        parseFloat(prev.close) < parseFloat(prev.open) && // Previous red candle
        parseFloat(current.close) > parseFloat(current.open) && // Current green candle
        parseFloat(current.open) < parseFloat(prev.close) && // Gap down open
        parseFloat(current.close) > parseFloat(prev.open) // Engulfing close
      ) {
        patterns.push({
          name: 'bullish_engulfing',
          confidence: 75,
          direction: 'bullish',
          targetPrice: parseFloat(current.close) * 1.02,
          stopLoss: parseFloat(current.open)
        });
      }
    }
    
    return patterns;
  }

  // ===========================
  // CLEANUP AND MAINTENANCE
  // ===========================

  async cleanupOldData() {
    logger.info('🧹 Starting data cleanup...');
    
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      // Clean old live snapshots
      await db
        .delete(liveMarketSnapshots)
        .where(lte(liveMarketSnapshots.timestamp, cutoffDate));
      
      // Clean old pattern detections
      await db
        .delete(patternDetections)
        .where(lte(patternDetections.timestamp, cutoffDate));
      
      logger.info('✅ Data cleanup completed');
    } catch (error) {
      logger.error('❌ Error in data cleanup:', error);
    }
  }

  async shutdown() {
    logger.info('🛑 Shutting down Sensibull Data Service...');
    
    this.stopLiveDataCollection();
    this.stopHistoricalDataCollection();
    
    try {
      await sql.end();
      logger.info('✅ Database connection closed');
    } catch (error) {
      logger.error('❌ Error closing database connection:', error);
    }
  }
}

export const sensibullDataService = new SensibullDataService();