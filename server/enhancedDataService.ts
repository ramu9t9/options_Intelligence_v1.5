import { EventEmitter } from 'events';
import { db } from './db';
import { 
  dailyOptionOI, 
  intradayOptionOI, 
  oiDeltaLog, 
  priceData, 
  supportResLevels,
  rawDataArchive,
  dataSourceMetrics,
  instruments 
} from '@shared/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { angelOneProvider } from './angelOneProvider';
import type { 
  InsertDailyOptionOI, 
  InsertIntradayOptionOI, 
  InsertOIDeltaLog, 
  InsertPriceData,
  InsertSupportResLevels,
  InsertRawDataArchive
} from '@shared/schema';

export interface DataRefreshRequest {
  symbols?: string[];
  triggerReason: 'manual_refresh' | 'scheduled' | 'alert_trigger';
  includeHistorical?: boolean;
}

export interface EnhancedMarketSnapshot {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  volume: number;
  optionChain: Array<{
    strike: number;
    optionType: 'CE' | 'PE';
    openInterest: number;
    oiChange: number;
    volume: number;
    lastPrice: number;
    impliedVolatility?: number;
  }>;
  supportLevels: number[];
  resistanceLevels: number[];
  dataSource: string;
  timestamp: Date;
}

export class EnhancedDataService extends EventEmitter {
  public isInitialized = false;
  private redisConnected = false; // For future Redis integration
  private activeSymbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
  private lastOICache = new Map<string, number>(); // Cache for OI delta calculation

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize data source priorities
      await this.initializeDataSources();
      
      // Start enhanced periodic collection
      this.startEnhancedDataCollection();
      
      this.isInitialized = true;
      console.log('✅ Enhanced Data Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Data Service:', error);
      throw error;
    }
  }

  private async initializeDataSources(): Promise<void> {
    const sources = ['angel-one', 'dhan', 'nse', 'yahoo', 'mock'];
    
    for (const source of sources) {
      const existing = await db.select()
        .from(dataSourceMetrics)
        .where(eq(dataSourceMetrics.sourceName, source))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(dataSourceMetrics).values({
          sourceName: source,
          isActive: source === 'angel-one',
          priority: this.getSourcePriority(source),
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0
        });
      }
    }
  }

  private getSourcePriority(source: string): number {
    const priorities = {
      'angel-one': 1,
      'dhan': 2, 
      'nse': 3,
      'yahoo': 4,
      'mock': 5
    };
    return priorities[source as keyof typeof priorities] || 5;
  }

  private startEnhancedDataCollection(): void {
    // Real-time collection every 15-30 seconds (ChatGPT recommendation)
    setInterval(async () => {
      if (this.isMarketHours()) {
        await this.collectIntradayData('scheduled');
      }
    }, 15000); // 15 seconds for intraday

    // End-of-day processing at 3:45 PM
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 15 && now.getMinutes() === 45) {
        await this.performEODProcessing();
      }
    }, 60 * 1000);

    // Weekend reconciliation (Sunday 2 AM)
    setInterval(async () => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 2) {
        await this.performReconciliationJob();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  // Manual refresh API implementation (ChatGPT recommendation)
  async refreshData(request: DataRefreshRequest): Promise<EnhancedMarketSnapshot[]> {
    const symbols = request.symbols || this.activeSymbols;
    const snapshots: EnhancedMarketSnapshot[] = [];

    console.log(`🔄 Manual data refresh triggered for symbols: ${symbols.join(', ')}`);

    for (const symbol of symbols) {
      try {
        const snapshot = await this.fetchEnhancedSnapshot(symbol, request.triggerReason);
        if (snapshot) {
          snapshots.push(snapshot);
          
          // Update intraday table with upsert logic (ChatGPT recommendation)
          await this.upsertIntradayData(snapshot, request.triggerReason);
          
          // Log OI deltas
          await this.logOIDeltas(snapshot, request.triggerReason);
        }
      } catch (error) {
        console.error(`Error refreshing data for ${symbol}:`, error);
        await this.updateDataSourceMetrics(symbol, false);
      }
    }

    this.emit('dataRefreshed', { snapshots, triggerReason: request.triggerReason });
    return snapshots;
  }

  private async fetchEnhancedSnapshot(symbol: string, triggerReason: string): Promise<EnhancedMarketSnapshot | null> {
    const startTime = Date.now();
    
    try {
      // Try multi-provider fallback
      const marketData = await this.fetchFromPrimarySource(symbol);
      const optionChainData = await this.fetchOptionChainData(symbol);
      const supportResistance = await this.calculateSupportResistance(symbol);

      await this.updateDataSourceMetrics(symbol, true, Date.now() - startTime);

      return {
        symbol,
        currentPrice: marketData.price,
        priceChange: marketData.change,
        volume: marketData.volume,
        optionChain: optionChainData,
        supportLevels: supportResistance.support,
        resistanceLevels: supportResistance.resistance,
        dataSource: marketData.source,
        timestamp: new Date()
      };
    } catch (error) {
      await this.updateDataSourceMetrics(symbol, false, Date.now() - startTime);
      throw error;
    }
  }

  private async fetchFromPrimarySource(symbol: string): Promise<any> {
    // Try Angel One first, then fallback
    try {
      if (angelOneProvider.isAuthenticated()) {
        const quote = await angelOneProvider.getQuote(symbol);
        if (quote) {
          return {
            price: quote.ltp,
            change: quote.ltp - quote.close,
            volume: quote.volume,
            source: 'angel-one'
          };
        }
      }
    } catch (error) {
      console.warn(`Angel One failed for ${symbol}:`, error);
    }

    // Fallback to mock data with clear labeling
    return this.generateMockMarketData(symbol);
  }

  private async fetchOptionChainData(symbol: string): Promise<any[]> {
    try {
      if (angelOneProvider.isAuthenticated()) {
        const expiry = this.getNextExpiry();
        const optionChain = await angelOneProvider.getOptionChain(symbol, expiry);
        if (optionChain?.data) {
          return optionChain.data.map((strike: any) => ({
            strike: strike.strikePrice,
            optionType: 'CE' as const,
            openInterest: strike.CE?.openInterest || 0,
            oiChange: strike.CE?.changeinOpenInterest || 0,
            volume: strike.CE?.totalTradedVolume || 0,
            lastPrice: strike.CE?.lastPrice || 0,
          }));
        }
      }
    } catch (error) {
      console.warn(`Option chain fetch failed for ${symbol}:`, error);
    }

    return this.generateMockOptionChain(symbol);
  }

  // Upsert logic for intraday data (ChatGPT recommendation)
  private async upsertIntradayData(snapshot: EnhancedMarketSnapshot, triggerReason: string): Promise<void> {
    for (const option of snapshot.optionChain) {
      try {
        await db.insert(intradayOptionOI).values({
          symbol: snapshot.symbol,
          timestamp: snapshot.timestamp,
          strike: option.strike.toString(),
          optionType: option.optionType,
          openInterest: option.openInterest,
          oiChange: option.oiChange,
          volume: option.volume,
          lastPrice: option.lastPrice.toString(),
          priceChange: "0",
          dataSource: snapshot.dataSource,
        }).onConflictDoUpdate({
          target: [intradayOptionOI.symbol, intradayOptionOI.timestamp, intradayOptionOI.strike, intradayOptionOI.optionType],
          set: {
            openInterest: option.openInterest,
            oiChange: option.oiChange,
            volume: option.volume,
            lastPrice: option.lastPrice.toString(),
            dataSource: snapshot.dataSource,
          }
        });
      } catch (error) {
        console.error(`Error upserting intraday data:`, error);
      }
    }
  }

  // OI Delta logging (ChatGPT recommendation)
  private async logOIDeltas(snapshot: EnhancedMarketSnapshot, triggerReason: string): Promise<void> {
    for (const option of snapshot.optionChain) {
      const cacheKey = `${snapshot.symbol}_${option.strike}_${option.optionType}`;
      const oldOI = this.lastOICache.get(cacheKey) || 0;
      const newOI = option.openInterest;
      const deltaOI = newOI - oldOI;

      if (Math.abs(deltaOI) > 0) {
        const percentChange = oldOI > 0 ? (deltaOI / oldOI) * 100 : 0;

        await db.insert(oiDeltaLog).values({
          symbol: snapshot.symbol,
          strike: option.strike.toString(),
          optionType: option.optionType,
          timestamp: snapshot.timestamp,
          oldOI,
          newOI,
          deltaOI,
          percentChange: percentChange.toString(),
          triggerReason,
          dataSource: snapshot.dataSource,
        });

        // Update cache
        this.lastOICache.set(cacheKey, newOI);
      }
    }
  }

  private async collectIntradayData(triggerReason: string): Promise<void> {
    try {
      await this.refreshData({ 
        symbols: this.activeSymbols, 
        triggerReason: triggerReason as any 
      });
    } catch (error) {
      console.error('Error in intraday data collection:', error);
    }
  }

  private async performEODProcessing(): Promise<void> {
    console.log('🏁 Starting end-of-day processing');
    
    try {
      // Final snapshots for the day
      const snapshots = await this.refreshData({ 
        triggerReason: 'scheduled',
        includeHistorical: true
      });

      // Upsert into daily EOD table
      for (const snapshot of snapshots) {
        await this.upsertDailyOIData(snapshot);
      }

      // Archive raw data
      await this.archiveRawData(snapshots);

      console.log('✅ End-of-day processing completed');
    } catch (error) {
      console.error('❌ End-of-day processing failed:', error);
    }
  }

  private async upsertDailyOIData(snapshot: EnhancedMarketSnapshot): Promise<void> {
    const tradingDate = new Date().toISOString().split('T')[0];
    
    for (const option of snapshot.optionChain) {
      await db.insert(dailyOptionOI).values({
        symbol: snapshot.symbol,
        tradingDate,
        strike: option.strike.toString(),
        optionType: option.optionType,
        openInterest: option.openInterest,
        volume: option.volume,
        lastPrice: option.lastPrice.toString(),
        dataSource: snapshot.dataSource,
      }).onConflictDoUpdate({
        target: [dailyOptionOI.symbol, dailyOptionOI.tradingDate, dailyOptionOI.strike, dailyOptionOI.optionType],
        set: {
          openInterest: option.openInterest,
          volume: option.volume,
          lastPrice: option.lastPrice.toString(),
          dataSource: snapshot.dataSource,
        }
      });
    }
  }

  private async archiveRawData(snapshots: EnhancedMarketSnapshot[]): Promise<void> {
    const archiveDate = new Date().toISOString().split('T')[0];
    
    for (const snapshot of snapshots) {
      // In production, this would save to S3/GCS
      const filePath = `local_archive/${archiveDate}/${snapshot.symbol}_option_chain.json`;
      const rawData = JSON.stringify(snapshot, null, 2);
      
      await db.insert(rawDataArchive).values({
        archiveDate,
        symbol: snapshot.symbol,
        dataType: 'OPTION_CHAIN',
        filePath,
        fileSize: rawData.length,
        recordCount: snapshot.optionChain.length,
        dataSource: snapshot.dataSource,
        compressionType: 'none',
        checksum: this.calculateChecksum(rawData),
      });
    }
  }

  private async performReconciliationJob(): Promise<void> {
    console.log('🔍 Starting weekly reconciliation job');
    // Implementation for data validation and consistency checks
    // Compare with external bhavcopy data sources
  }

  private async calculateSupportResistance(symbol: string): Promise<{support: number[], resistance: number[]}> {
    // Fetch recent price data and calculate S/R levels
    const basePrice = this.getBasePrice(symbol);
    return {
      support: [basePrice * 0.98, basePrice * 0.95, basePrice * 0.92],
      resistance: [basePrice * 1.02, basePrice * 1.05, basePrice * 1.08]
    };
  }

  private async updateDataSourceMetrics(symbol: string, success: boolean, responseTime?: number): Promise<void> {
    const source = success ? 'angel-one' : 'mock';
    
    await db.update(dataSourceMetrics)
      .set({
        totalRequests: sql`${dataSourceMetrics.totalRequests} + 1`,
        successfulRequests: success ? sql`${dataSourceMetrics.successfulRequests} + 1` : dataSourceMetrics.successfulRequests,
        failedRequests: success ? dataSourceMetrics.failedRequests : sql`${dataSourceMetrics.failedRequests} + 1`,
        lastSuccessfulFetch: success ? new Date() : dataSourceMetrics.lastSuccessfulFetch,
        lastFailedFetch: success ? dataSourceMetrics.lastFailedFetch : new Date(),
        avgResponseTime: responseTime ? responseTime.toString() : dataSourceMetrics.avgResponseTime,
        updatedAt: new Date(),
      })
      .where(eq(dataSourceMetrics.sourceName, source));
  }

  // Utility methods
  private generateMockMarketData(symbol: string): any {
    const basePrice = this.getBasePrice(symbol);
    return {
      price: basePrice + (Math.random() - 0.5) * 100,
      change: (Math.random() - 0.5) * 50,
      volume: Math.floor(Math.random() * 1000000),
      source: 'mock'
    };
  }

  private generateMockOptionChain(symbol: string): any[] {
    const basePrice = this.getBasePrice(symbol);
    const strikes = this.generateStrikes(basePrice);
    
    return strikes.map(strike => ({
      strike,
      optionType: 'CE' as const,
      openInterest: Math.floor(Math.random() * 100000),
      oiChange: Math.floor((Math.random() - 0.5) * 10000),
      volume: Math.floor(Math.random() * 50000),
      lastPrice: Math.max(1, strike - basePrice + Math.random() * 20),
    }));
  }

  private generateStrikes(currentPrice: number): number[] {
    const strikes = [];
    const step = currentPrice > 20000 ? 100 : 50;
    const baseStrike = Math.round(currentPrice / step) * step;
    
    for (let i = -10; i <= 10; i++) {
      strikes.push(baseStrike + (i * step));
    }
    
    return strikes;
  }

  private getBasePrice(symbol: string): number {
    const basePrices = {
      'NIFTY': 23500,
      'BANKNIFTY': 51000, 
      'FINNIFTY': 23800
    };
    return basePrices[symbol as keyof typeof basePrices] || 23500;
  }

  private calculateChecksum(data: string): string {
    // Simple checksum for demo - use crypto.createHash in production
    return data.length.toString();
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();
    
    // Monday to Friday, 9:15 AM to 3:30 PM IST
    return day >= 1 && day <= 5 && hours >= 9 && hours <= 15;
  }

  private getNextExpiry(): string {
    const now = new Date();
    const nextThursday = new Date(now);
    nextThursday.setDate(now.getDate() + (4 - now.getDay() + 7) % 7);
    return nextThursday.toISOString().split('T')[0];
  }

  // Public API methods
  async getIntradayOI(symbol: string, fromTime?: Date): Promise<any[]> {
    let query = db.select().from(intradayOptionOI)
      .where(eq(intradayOptionOI.symbol, symbol))
      .orderBy(desc(intradayOptionOI.timestamp));
    
    if (fromTime) {
      query = db.select().from(intradayOptionOI)
        .where(and(
          eq(intradayOptionOI.symbol, symbol),
          gte(intradayOptionOI.timestamp, fromTime)
        ))
        .orderBy(desc(intradayOptionOI.timestamp));
    }
    
    return await query.limit(1000);
  }

  async getDailyOI(symbol: string, tradingDate: string): Promise<any[]> {
    return await db.select().from(dailyOptionOI)
      .where(and(
        eq(dailyOptionOI.symbol, symbol),
        eq(dailyOptionOI.tradingDate, tradingDate)
      ))
      .orderBy(dailyOptionOI.strike);
  }

  async getOIDeltas(symbol: string, fromTime?: Date): Promise<any[]> {
    if (fromTime) {
      return await db.select().from(oiDeltaLog)
        .where(and(
          eq(oiDeltaLog.symbol, symbol),
          gte(oiDeltaLog.timestamp, fromTime)
        ))
        .orderBy(desc(oiDeltaLog.timestamp))
        .limit(500);
    }
    
    return await db.select().from(oiDeltaLog)
      .where(eq(oiDeltaLog.symbol, symbol))
      .orderBy(desc(oiDeltaLog.timestamp))
      .limit(500);
  }

  getDataSourceMetrics(): Promise<any[]> {
    return db.select().from(dataSourceMetrics).orderBy(dataSourceMetrics.priority);
  }

  stop(): void {
    console.log('🛑 Enhanced Data Service stopped');
  }
}

export const enhancedDataService = new EnhancedDataService();