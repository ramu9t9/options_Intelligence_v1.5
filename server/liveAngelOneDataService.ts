import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc } from 'drizzle-orm';
import { 
  symbols, 
  liveMarketSnapshots, 
  historicalCandleData, 
  historicalOptionChain,
  dataSources,
  InsertLiveMarketSnapshot,
  InsertHistoricalCandleData,
  InsertHistoricalOptionChain
} from '../shared/enhanced-schema.js';
import { angelOneProvider } from './angelOneProvider.js';
import { dataFallbackService } from './dataFallbackService.js';
import logger from './logger.js';
import { EventEmitter } from 'events';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
const sql = postgres(connectionString, { max: 10 });
const db = drizzle(sql);

interface LiveDataUpdate {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  oi?: number;
  changeOi?: number;
  timestamp: Date;
  source: string;
}

class LiveAngelOneDataService extends EventEmitter {
  private isRunning = false;
  private liveDataInterval: NodeJS.Timeout | null = null;
  private historicalDataInterval: NodeJS.Timeout | null = null;
  private optionChainInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activeSymbols: Array<{ id: number; name: string; symbolToken?: string }> = [];
  private lastDataUpdate = new Map<string, Date>();
  private circuitBreaker = {
    failures: 0,
    maxFailures: 5,
    isOpen: false,
    lastFailure: null as Date | null,
    resetTimeout: 5 * 60 * 1000 // 5 minutes
  };
  private dataBuffer: LiveDataUpdate[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeService();
  }

  private async initializeService() {
    try {
      logger.info('🚀 Initializing Live Angel One Data Service...');
      
      // Load active symbols from database
      await this.loadActiveSymbols();
      
      // Initialize Angel One provider
      const angelOneInitialized = await angelOneProvider.initialize();
      if (angelOneInitialized) {
        logger.info('✅ Angel One provider initialized successfully');
      } else {
        logger.warn('⚠️ Angel One provider failed to initialize, will use fallback data sources');
      }
      
      // Start live data collection
      await this.startLiveDataCollection();
      
      // Start historical data collection (every 15 minutes)
      await this.startHistoricalDataCollection();
      
      // Start option chain data collection (every 5 minutes)
      await this.startOptionChainCollection();
      
      // Start heartbeat monitoring
      this.startHeartbeat();
      
      // Start buffer flush mechanism
      this.startBufferFlush();
      
      logger.info('✅ Live Angel One Data Service initialized successfully');
      this.emit('service_started');
      
    } catch (error) {
      logger.error('❌ Failed to initialize Live Angel One Data Service:', error);
      this.emit('service_error', error);
    }
  }

  private async loadActiveSymbols() {
    try {
      const activeSymbolsData = await db
        .select({
          id: symbols.id,
          name: symbols.name,
          symbolToken: symbols.symbolToken
        })
        .from(symbols)
        .where(eq(symbols.isActive, true));
      
      this.activeSymbols = activeSymbolsData;
      logger.info(`📊 Loaded ${this.activeSymbols.length} active symbols for live data collection`);
      
    } catch (error) {
      // Fallback to hardcoded symbols if database is not available
      logger.warn('⚠️ Database not available, using fallback symbols list');
      this.activeSymbols = [
        { id: 1, name: 'NIFTY', symbolToken: '99926000' },
        { id: 2, name: 'BANKNIFTY', symbolToken: '99926009' },
        { id: 3, name: 'FINNIFTY', symbolToken: '99926037' },
        { id: 4, name: 'RELIANCE', symbolToken: '738561' },
        { id: 5, name: 'TCS', symbolToken: '11536' },
        { id: 6, name: 'HDFC', symbolToken: '1333' },
        { id: 7, name: 'INFY', symbolToken: '408065' },
        { id: 8, name: 'ITC', symbolToken: '424961' }
      ];
    }
  }

  // ===========================
  // LIVE DATA COLLECTION (5-second updates)
  // ===========================

  private async startLiveDataCollection() {
    if (this.isRunning) {
      logger.warn('⚠️ Live data collection already running');
      return;
    }

    this.isRunning = true;
    logger.info('📡 Starting live data collection (5-second intervals)');

    // Initial collection
    await this.collectLiveDataBatch();

    // Schedule regular collection
    this.liveDataInterval = setInterval(async () => {
      try {
        await this.collectLiveDataBatch();
      } catch (error) {
        logger.error('❌ Live data collection error:', error);
        this.handleDataCollectionError(error);
      }
    }, 5000); // 5 seconds
  }

  private async collectLiveDataBatch() {
    if (this.circuitBreaker.isOpen) {
      if (Date.now() - this.circuitBreaker.lastFailure!.getTime() > this.circuitBreaker.resetTimeout) {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failures = 0;
        logger.info('🔧 Circuit breaker reset, resuming data collection');
      } else {
        return; // Skip collection while circuit breaker is open
      }
    }

    try {
      const startTime = Date.now();
      const symbolNames = this.activeSymbols.map(s => s.name);
      
      // Try Angel One first for bulk quotes
      let dataUpdates: LiveDataUpdate[] = [];
      
      if (angelOneProvider.isAuthenticated()) {
        try {
          const angelOneQuotes = await angelOneProvider.getBulkQuotes(symbolNames, 'NSE');
          
          dataUpdates = Object.entries(angelOneQuotes)
            .filter(([_, quote]) => quote !== null)
            .map(([symbol, quote]) => ({
              symbol,
              price: quote!.ltp,
              volume: quote!.volume,
              change: quote!.ltp - quote!.close,
              changePercent: ((quote!.ltp - quote!.close) / quote!.close) * 100,
              high: quote!.high,
              low: quote!.low,
              oi: 0, // OI not available in quotes
              changeOi: 0,
              timestamp: new Date(),
              source: 'angel-one'
            }));
          
          logger.info(`📊 Collected live data for ${dataUpdates.length} symbols from Angel One (${Date.now() - startTime}ms)`);
          
        } catch (angelError) {
          logger.warn('⚠️ Angel One data collection failed, falling back to other sources:', angelError.message);
          dataUpdates = await this.collectDataWithFallback(symbolNames);
        }
      } else {
        logger.info('🔄 Angel One not authenticated, using fallback data sources');
        dataUpdates = await this.collectDataWithFallback(symbolNames);
      }

      // Buffer the data for batch insertion
      this.dataBuffer.push(...dataUpdates);
      
      // Update last data timestamps
      dataUpdates.forEach(update => {
        this.lastDataUpdate.set(update.symbol, update.timestamp);
      });
      
      // Emit real-time updates
      this.emit('live_data_update', dataUpdates);
      
      // Reset circuit breaker on success
      this.circuitBreaker.failures = 0;
      
    } catch (error) {
      this.handleDataCollectionError(error);
    }
  }

  private async collectDataWithFallback(symbolNames: string[]): Promise<LiveDataUpdate[]> {
    const dataUpdates: LiveDataUpdate[] = [];
    
    for (const symbol of symbolNames) {
      try {
        const result = await dataFallbackService.fetchLiveData(symbol);
        
        dataUpdates.push({
          symbol,
          price: result.data.price,
          volume: result.data.volume || 0,
          change: result.data.change || 0,
          changePercent: result.data.changePercent || 0,
          high: result.data.high,
          low: result.data.low,
          oi: result.data.oi || 0,
          changeOi: result.data.changeOi || 0,
          timestamp: new Date(),
          source: result.source
        });
        
      } catch (error) {
        logger.error(`❌ Failed to collect fallback data for ${symbol}:`, error.message);
      }
    }
    
    return dataUpdates;
  }

  private handleDataCollectionError(error: any) {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = new Date();
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.maxFailures) {
      this.circuitBreaker.isOpen = true;
      logger.error(`🔴 Circuit breaker opened after ${this.circuitBreaker.failures} failures. Pausing data collection for 5 minutes.`);
      this.emit('circuit_breaker_open', this.circuitBreaker);
    }
    
    logger.error('❌ Data collection error:', error.message);
    this.emit('data_collection_error', error);
  }

  // ===========================
  // BUFFER FLUSH MECHANISM
  // ===========================

  private startBufferFlush() {
    this.bufferFlushInterval = setInterval(async () => {
      if (this.dataBuffer.length > 0) {
        await this.flushDataBuffer();
      }
    }, 10000); // Flush every 10 seconds
  }

  private async flushDataBuffer() {
    if (this.dataBuffer.length === 0) return;
    
    const batchToFlush = [...this.dataBuffer];
    this.dataBuffer = [];
    
    try {
      // Group by symbol for efficient insertion
      const symbolDataMap = new Map<string, LiveDataUpdate[]>();
      
      batchToFlush.forEach(update => {
        if (!symbolDataMap.has(update.symbol)) {
          symbolDataMap.set(update.symbol, []);
        }
        symbolDataMap.get(update.symbol)!.push(update);
      });
      
      // Insert data for each symbol
      for (const [symbolName, updates] of symbolDataMap) {
        const symbolInfo = this.activeSymbols.find(s => s.name === symbolName);
        if (!symbolInfo) continue;
        
        // Get latest update for this symbol
        const latestUpdate = updates[updates.length - 1];
        
        const snapshotData: InsertLiveMarketSnapshot = {
          symbolId: symbolInfo.id,
          timestamp: latestUpdate.timestamp,
          price: String(latestUpdate.price),
          volume: latestUpdate.volume,
          oi: latestUpdate.oi || 0,
          changeOi: latestUpdate.changeOi || 0,
          change: String(latestUpdate.change),
          changePercent: String(latestUpdate.changePercent),
          high: latestUpdate.high ? String(latestUpdate.high) : undefined,
          low: latestUpdate.low ? String(latestUpdate.low) : undefined,
          dataSource: latestUpdate.source
        };
        
        try {
          await db.insert(liveMarketSnapshots).values(snapshotData);
        } catch (dbError) {
          // Database might not be available, continue with other operations
          logger.warn(`⚠️ Database insertion failed for ${symbolName}, data will be kept in memory`);
        }
      }
      
      logger.info(`💾 Flushed ${batchToFlush.length} live market data points to database`);
      
    } catch (error) {
      logger.error('❌ Error flushing data buffer:', error.message);
      // Put data back in buffer for retry
      this.dataBuffer.unshift(...batchToFlush);
    }
  }

  // ===========================
  // HISTORICAL DATA COLLECTION (15-minute intervals)
  // ===========================

  private async startHistoricalDataCollection() {
    logger.info('📈 Starting historical data collection (15-minute intervals)');

    // Initial collection
    setTimeout(() => this.collectHistoricalData(), 30000); // Wait 30 seconds after service start

    // Schedule regular collection
    this.historicalDataInterval = setInterval(async () => {
      try {
        await this.collectHistoricalData();
      } catch (error) {
        logger.error('❌ Historical data collection error:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  private async collectHistoricalData() {
    try {
      const timeframes = ['1min', '5min', '15min', '1hr'];
      const to = new Date();
      const from = new Date(to.getTime() - 4 * 60 * 60 * 1000); // Last 4 hours

      for (const symbol of this.activeSymbols.slice(0, 5)) { // Limit to first 5 symbols to avoid rate limits
        for (const timeframe of timeframes) {
          try {
            const result = await dataFallbackService.fetchHistoricalData(
              symbol.name, 
              timeframe, 
              from, 
              to
            );

            for (const candle of result.data.slice(-10)) { // Only store last 10 candles
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

              try {
                await db.insert(historicalCandleData)
                  .values(candleData)
                  .onConflictDoNothing();
              } catch (dbError) {
                // Database might not be available, skip
                continue;
              }
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

  // ===========================
  // OPTION CHAIN COLLECTION (5-minute intervals)
  // ===========================

  private async startOptionChainCollection() {
    logger.info('⚡ Starting option chain data collection (5-minute intervals)');

    // Schedule regular collection
    this.optionChainInterval = setInterval(async () => {
      try {
        await this.collectOptionChainData();
      } catch (error) {
        logger.error('❌ Option chain collection error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async collectOptionChainData() {
    try {
      const indexSymbols = this.activeSymbols.filter(s => 
        ['NIFTY', 'BANKNIFTY', 'FINNIFTY'].includes(s.name)
      );

      for (const symbol of indexSymbols) {
        try {
          const result = await dataFallbackService.fetchOptionChain(symbol.name);
          
          if (result.data.strikes) {
            for (const strike of result.data.strikes.slice(0, 20)) { // Limit to 20 strikes
              const timestamp = new Date();
              const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week expiry
              
              // Store call option data
              if (strike.callLTP) {
                const callData: InsertHistoricalOptionChain = {
                  symbolId: symbol.id,
                  timestamp,
                  expiryDate,
                  strikePrice: String(strike.strikePrice || 0),
                  optionType: 'CE',
                  ltp: String(strike.callLTP),
                  oiChange: strike.callOI || 0,
                  volume: strike.callVolume || 0,
                  openInterest: strike.callOI || 0,
                  dataSource: result.source
                };
                
                try {
                  await db.insert(historicalOptionChain).values(callData);
                } catch (dbError) {
                  // Database might not be available, skip
                  continue;
                }
              }
              
              // Store put option data
              if (strike.putLTP) {
                const putData: InsertHistoricalOptionChain = {
                  symbolId: symbol.id,
                  timestamp,
                  expiryDate,
                  strikePrice: String(strike.strikePrice || 0),
                  optionType: 'PE',
                  ltp: String(strike.putLTP),
                  oiChange: strike.putOI || 0,
                  volume: strike.putVolume || 0,
                  openInterest: strike.putOI || 0,
                  dataSource: result.source
                };
                
                try {
                  await db.insert(historicalOptionChain).values(putData);
                } catch (dbError) {
                  // Database might not be available, skip
                  continue;
                }
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
  // HEARTBEAT AND MONITORING
  // ===========================

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const stats = this.getServiceStats();
      logger.info(`💓 Live Data Service Heartbeat - Active: ${stats.isRunning}, Symbols: ${stats.activeSymbols}, Last Update: ${stats.lastUpdate}`);
      this.emit('heartbeat', stats);
    }, 60000); // Every minute
  }

  // ===========================
  // PUBLIC API METHODS
  // ===========================

  public async getLiveData(symbolName?: string): Promise<LiveDataUpdate[]> {
    try {
      if (symbolName) {
        // Get specific symbol data from database or buffer
        const bufferData = this.dataBuffer.filter(d => d.symbol === symbolName);
        if (bufferData.length > 0) {
          return [bufferData[bufferData.length - 1]]; // Return latest
        }
        
        // Try to get from database
        const symbolInfo = this.activeSymbols.find(s => s.name === symbolName);
        if (symbolInfo) {
          try {
            const dbData = await db
              .select()
              .from(liveMarketSnapshots)
              .where(eq(liveMarketSnapshots.symbolId, symbolInfo.id))
              .orderBy(desc(liveMarketSnapshots.timestamp))
              .limit(1);
            
            if (dbData.length > 0) {
              const snapshot = dbData[0];
              return [{
                symbol: symbolName,
                price: parseFloat(snapshot.price),
                volume: snapshot.volume,
                change: parseFloat(snapshot.change),
                changePercent: parseFloat(snapshot.changePercent),
                high: snapshot.high ? parseFloat(snapshot.high) : undefined,
                low: snapshot.low ? parseFloat(snapshot.low) : undefined,
                oi: snapshot.oi,
                changeOi: snapshot.changeOi,
                timestamp: snapshot.timestamp || new Date(),
                source: snapshot.dataSource
              }];
            }
          } catch (dbError) {
            // Database not available, fall through to fallback
          }
        }
        
        // Fallback to real-time fetch
        const result = await dataFallbackService.fetchLiveData(symbolName);
        return [{
          symbol: symbolName,
          price: result.data.price,
          volume: result.data.volume || 0,
          change: result.data.change || 0,
          changePercent: result.data.changePercent || 0,
          high: result.data.high,
          low: result.data.low,
          oi: result.data.oi || 0,
          changeOi: result.data.changeOi || 0,
          timestamp: new Date(),
          source: result.source
        }];
      } else {
        // Get all symbols latest data
        const latestData: LiveDataUpdate[] = [];
        
        // First try to get from buffer
        const symbolsInBuffer = new Set(this.dataBuffer.map(d => d.symbol));
        
        for (const symbol of this.activeSymbols) {
          const symbolData = this.dataBuffer
            .filter(d => d.symbol === symbol.name)
            .slice(-1); // Get latest
          
          if (symbolData.length > 0) {
            latestData.push(symbolData[0]);
          } else {
            // Fallback to fetch individual data
            try {
              const result = await dataFallbackService.fetchLiveData(symbol.name);
              latestData.push({
                symbol: symbol.name,
                price: result.data.price,
                volume: result.data.volume || 0,
                change: result.data.change || 0,
                changePercent: result.data.changePercent || 0,
                high: result.data.high,
                low: result.data.low,
                oi: result.data.oi || 0,
                changeOi: result.data.changeOi || 0,
                timestamp: new Date(),
                source: result.source
              });
            } catch (error) {
              // Skip symbols that fail
              continue;
            }
          }
        }
        
        return latestData;
      }
    } catch (error) {
      logger.error('❌ Error getting live data:', error.message);
      return [];
    }
  }

  public getServiceStats() {
    return {
      isRunning: this.isRunning,
      activeSymbols: this.activeSymbols.length,
      bufferSize: this.dataBuffer.length,
      lastUpdate: Math.max(...Array.from(this.lastDataUpdate.values()).map(d => d.getTime())) || 0,
      circuitBreaker: {
        isOpen: this.circuitBreaker.isOpen,
        failures: this.circuitBreaker.failures
      },
      angelOneStatus: angelOneProvider.getConnectionStatus()
    };
  }

  public async updateDataSourceHealth(sourceName: string, isHealthy: boolean, responseTime: number) {
    try {
      await db
        .update(dataSources)
        .set({
          healthStatus: isHealthy ? 'healthy' : 'degraded',
          lastHealthCheck: new Date(),
          avgResponseTime: responseTime
        })
        .where(eq(dataSources.name, sourceName));
    } catch (error) {
      // Database might not be available, skip
    }
  }

  public stopService() {
    this.isRunning = false;
    
    if (this.liveDataInterval) {
      clearInterval(this.liveDataInterval);
      this.liveDataInterval = null;
    }
    
    if (this.historicalDataInterval) {
      clearInterval(this.historicalDataInterval);
      this.historicalDataInterval = null;
    }
    
    if (this.optionChainInterval) {
      clearInterval(this.optionChainInterval);
      this.optionChainInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }
    
    // Flush remaining buffer data
    if (this.dataBuffer.length > 0) {
      this.flushDataBuffer();
    }
    
    angelOneProvider.disconnect();
    
    logger.info('🛑 Live Angel One Data Service stopped');
    this.emit('service_stopped');
  }
}

// Export singleton instance
export const liveAngelOneDataService = new LiveAngelOneDataService();
export default liveAngelOneDataService;