import { EventEmitter } from 'events';
import { db } from './db';
import { 
  historicalMarketData, 
  historicalOptionChain, 
  realtimeDataSnapshots, 
  dataSourceMetrics,
  instruments 
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { angelOneProvider } from './angelOneProvider';

export interface DataSourceStatus {
  name: string;
  isActive: boolean;
  lastSuccessfulFetch: Date | null;
  lastFailedFetch: Date | null;
  successRate: number;
  avgResponseTime: number;
  priority: number;
}

export interface HistoricalDataRequest {
  symbol: string;
  fromDate: Date;
  toDate: Date;
  timeframe: '1MIN' | '5MIN' | '15MIN' | '1HOUR' | '1DAY';
}

export interface MarketDataSnapshot {
  symbol: string;
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  openInterest: number;
  putCallRatio: number;
  maxPainStrike: number;
  optionChain: Array<{
    strike: number;
    callOI: number;
    callOIChange: number;
    callLTP: number;
    putOI: number;
    putOIChange: number;
    putLTP: number;
  }>;
  dataSource: string;
  timestamp: Date;
}

export class DataManagementService extends EventEmitter {
  private isInitialized = false;
  private primaryDataSource: string = 'angel-one';
  private fallbackSources: string[] = ['nse', 'yahoo', 'mock'];
  private historicalDataCache = new Map<string, any>();
  private dataSourcePriorities = new Map<string, number>();

  constructor() {
    super();
    this.setupDataSourcePriorities();
  }

  private setupDataSourcePriorities(): void {
    this.dataSourcePriorities.set('angel-one', 1);  // Highest priority
    this.dataSourcePriorities.set('dhan', 2);
    this.dataSourcePriorities.set('nse', 3);
    this.dataSourcePriorities.set('yahoo', 4);
    this.dataSourcePriorities.set('mock', 5);       // Lowest priority
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize data source metrics
      await this.initializeDataSourceMetrics();
      
      // Start periodic data collection
      this.startPeriodicDataCollection();
      
      this.isInitialized = true;
      console.log('✅ Data Management Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Data Management Service:', error);
      throw error;
    }
  }

  private async initializeDataSourceMetrics(): Promise<void> {
    const sources = ['angel-one', 'dhan', 'nse', 'yahoo', 'mock'];
    
    for (const source of sources) {
      const existing = await db.select()
        .from(dataSourceMetrics)
        .where(eq(dataSourceMetrics.sourceName, source))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(dataSourceMetrics).values({
          sourceName: source,
          isActive: source === this.primaryDataSource,
          priority: this.dataSourcePriorities.get(source) || 5,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0
        });
      }
    }
  }

  private startPeriodicDataCollection(): void {
    // Collect real-time data every 5 seconds during market hours
    setInterval(async () => {
      if (this.isMarketHours()) {
        await this.collectRealTimeData();
      }
    }, 5000);

    // Store historical snapshots every 15 minutes
    setInterval(async () => {
      if (this.isMarketHours()) {
        await this.storeHistoricalSnapshot();
      }
    }, 15 * 60 * 1000);

    // End of day historical data collection
    setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 15 && now.getMinutes() === 45) {
        await this.storeEndOfDayData();
      }
    }, 60 * 1000);
  }

  async collectRealTimeData(): Promise<MarketDataSnapshot[]> {
    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    const snapshots: MarketDataSnapshot[] = [];

    for (const symbol of symbols) {
      try {
        const snapshot = await this.fetchMarketSnapshot(symbol);
        if (snapshot) {
          snapshots.push(snapshot);
          await this.storeRealTimeSnapshot(snapshot);
        }
      } catch (error) {
        console.error(`Error collecting real-time data for ${symbol}:`, error);
      }
    }

    this.emit('realTimeDataUpdated', snapshots);
    return snapshots;
  }

  private async fetchMarketSnapshot(symbol: string): Promise<MarketDataSnapshot | null> {
    const activeSources = await this.getActiveDataSources();
    
    for (const source of activeSources) {
      try {
        const startTime = Date.now();
        let snapshot: MarketDataSnapshot | null = null;

        switch (source.name) {
          case 'angel-one':
            snapshot = await this.fetchFromAngelOne(symbol);
            break;
          case 'dhan':
            snapshot = await this.fetchFromDhan(symbol);
            break;
          case 'nse':
            snapshot = await this.fetchFromNSE(symbol);
            break;
          case 'yahoo':
            snapshot = await this.fetchFromYahoo(symbol);
            break;
          case 'mock':
            snapshot = await this.generateMockSnapshot(symbol);
            break;
        }

        if (snapshot) {
          const responseTime = Date.now() - startTime;
          await this.updateDataSourceMetrics(source.name, true, responseTime);
          return snapshot;
        }
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
        await this.updateDataSourceMetrics(source.name, false);
      }
    }

    return null;
  }

  private async fetchFromAngelOne(symbol: string): Promise<MarketDataSnapshot | null> {
    if (!angelOneProvider.isAuthenticated()) {
      throw new Error('Angel One not authenticated');
    }

    try {
      const quote = await angelOneProvider.getQuote(symbol);
      const optionChain = await angelOneProvider.getOptionChain(symbol, this.getNextExpiry());

      if (!quote) return null;

      const snapshot: MarketDataSnapshot = {
        symbol,
        currentPrice: quote.ltp,
        openPrice: quote.open,
        highPrice: quote.high,
        lowPrice: quote.low,
        volume: quote.volume,
        openInterest: 0,
        putCallRatio: 0,
        maxPainStrike: quote.ltp,
        optionChain: this.transformAngelOneOptionChain(optionChain),
        dataSource: 'angel-one',
        timestamp: new Date()
      };

      // Calculate derived metrics
      this.calculateDerivedMetrics(snapshot);
      
      return snapshot;
    } catch (error) {
      console.error('Angel One fetch error:', error);
      return null;
    }
  }

  private async fetchFromDhan(symbol: string): Promise<MarketDataSnapshot | null> {
    // Placeholder for Dhan integration
    throw new Error('Dhan integration not yet implemented');
  }

  private async fetchFromNSE(symbol: string): Promise<MarketDataSnapshot | null> {
    // Placeholder for NSE integration
    throw new Error('NSE integration not yet implemented');
  }

  private async fetchFromYahoo(symbol: string): Promise<MarketDataSnapshot | null> {
    // Placeholder for Yahoo Finance integration
    throw new Error('Yahoo Finance integration not yet implemented');
  }

  private async generateMockSnapshot(symbol: string): Promise<MarketDataSnapshot> {
    const basePrice = this.getBasePrice(symbol);
    const variance = basePrice * 0.02; // 2% variance
    const currentPrice = basePrice + (Math.random() - 0.5) * variance;

    return {
      symbol,
      currentPrice,
      openPrice: basePrice,
      highPrice: currentPrice * 1.01,
      lowPrice: currentPrice * 0.99,
      volume: Math.floor(Math.random() * 1000000) + 500000,
      openInterest: Math.floor(Math.random() * 5000000) + 2000000,
      putCallRatio: 0.8 + Math.random() * 0.4,
      maxPainStrike: Math.round(currentPrice / 50) * 50,
      optionChain: this.generateMockOptionChain(symbol, currentPrice),
      dataSource: 'mock',
      timestamp: new Date()
    };
  }

  private generateMockOptionChain(symbol: string, currentPrice: number): MarketDataSnapshot['optionChain'] {
    const strikes = this.generateStrikes(currentPrice);
    return strikes.map(strike => {
      const isITM = strike < currentPrice;
      const distance = Math.abs(strike - currentPrice) / currentPrice;
      
      return {
        strike,
        callOI: Math.floor((1 - distance) * 100000 + Math.random() * 50000),
        callOIChange: Math.floor((Math.random() - 0.5) * 10000),
        callLTP: Math.max(0.05, isITM ? (currentPrice - strike) + Math.random() * 10 : Math.random() * 20),
        putOI: Math.floor((1 - distance) * 80000 + Math.random() * 40000),
        putOIChange: Math.floor((Math.random() - 0.5) * 8000),
        putLTP: Math.max(0.05, !isITM ? (strike - currentPrice) + Math.random() * 10 : Math.random() * 20)
      };
    });
  }

  private async storeRealTimeSnapshot(snapshot: MarketDataSnapshot): Promise<void> {
    try {
      const [instrument] = await db.select()
        .from(instruments)
        .where(eq(instruments.symbol, snapshot.symbol))
        .limit(1);

      if (!instrument) return;

      await db.insert(realtimeDataSnapshots).values({
        instrumentId: instrument.id,
        currentPrice: snapshot.currentPrice.toString(),
        changeFromOpen: (snapshot.currentPrice - snapshot.openPrice).toString(),
        changePercent: (((snapshot.currentPrice - snapshot.openPrice) / snapshot.openPrice) * 100).toString(),
        volume: snapshot.volume,
        totalCallOI: snapshot.optionChain.reduce((sum, opt) => sum + opt.callOI, 0),
        totalPutOI: snapshot.optionChain.reduce((sum, opt) => sum + opt.putOI, 0),
        putCallRatio: snapshot.putCallRatio.toString(),
        maxPainStrike: snapshot.maxPainStrike.toString(),
        dataSource: snapshot.dataSource,
        lastUpdated: snapshot.timestamp
      });
    } catch (error) {
      console.error('Error storing real-time snapshot:', error);
    }
  }

  private async storeHistoricalSnapshot(): Promise<void> {
    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    
    for (const symbol of symbols) {
      try {
        const snapshot = await this.fetchMarketSnapshot(symbol);
        if (snapshot) {
          await this.storeHistoricalMarketData(snapshot);
          await this.storeHistoricalOptionChain(snapshot);
        }
      } catch (error) {
        console.error(`Error storing historical snapshot for ${symbol}:`, error);
      }
    }
  }

  private async storeHistoricalMarketData(snapshot: MarketDataSnapshot): Promise<void> {
    try {
      const [instrument] = await db.select()
        .from(instruments)
        .where(eq(instruments.symbol, snapshot.symbol))
        .limit(1);

      if (!instrument) return;

      await db.insert(historicalMarketData).values({
        instrumentId: instrument.id,
        tradingDate: snapshot.timestamp,
        openPrice: snapshot.openPrice.toString(),
        highPrice: snapshot.highPrice.toString(),
        lowPrice: snapshot.lowPrice.toString(),
        closePrice: snapshot.currentPrice.toString(),
        volume: snapshot.volume,
        openInterest: snapshot.openInterest,
        dataSource: snapshot.dataSource,
        timeframe: '15MIN'
      });
    } catch (error) {
      console.error('Error storing historical market data:', error);
    }
  }

  private async storeHistoricalOptionChain(snapshot: MarketDataSnapshot): Promise<void> {
    try {
      const [instrument] = await db.select()
        .from(instruments)
        .where(eq(instruments.symbol, snapshot.symbol))
        .limit(1);

      if (!instrument) return;

      for (const option of snapshot.optionChain) {
        // Store Call options
        await db.insert(historicalOptionChain).values({
          instrumentId: instrument.id,
          tradingDate: snapshot.timestamp,
          strikePrice: option.strike.toString(),
          optionType: 'CE',
          openInterest: option.callOI,
          oiChangeFromPrevDay: option.callOIChange,
          lastTradedPrice: option.callLTP.toString(),
          volume: Math.floor(option.callOI * 0.1), // Estimate volume
          dataSource: snapshot.dataSource
        });

        // Store Put options
        await db.insert(historicalOptionChain).values({
          instrumentId: instrument.id,
          tradingDate: snapshot.timestamp,
          strikePrice: option.strike.toString(),
          optionType: 'PE',
          openInterest: option.putOI,
          oiChangeFromPrevDay: option.putOIChange,
          lastTradedPrice: option.putLTP.toString(),
          volume: Math.floor(option.putOI * 0.1), // Estimate volume
          dataSource: snapshot.dataSource
        });
      }
    } catch (error) {
      console.error('Error storing historical option chain:', error);
    }
  }

  private async storeEndOfDayData(): Promise<void> {
    console.log('📊 Storing end-of-day historical data...');
    
    try {
      // Store final snapshots with 1DAY timeframe
      const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
      
      for (const symbol of symbols) {
        const snapshot = await this.fetchMarketSnapshot(symbol);
        if (snapshot) {
          const [instrument] = await db.select()
            .from(instruments)
            .where(eq(instruments.symbol, symbol))
            .limit(1);

          if (instrument) {
            await db.insert(historicalMarketData).values({
              instrumentId: instrument.id,
              tradingDate: new Date(),
              openPrice: snapshot.openPrice.toString(),
              highPrice: snapshot.highPrice.toString(),
              lowPrice: snapshot.lowPrice.toString(),
              closePrice: snapshot.currentPrice.toString(),
              volume: snapshot.volume,
              openInterest: snapshot.openInterest,
              dataSource: snapshot.dataSource,
              timeframe: '1DAY'
            });
          }
        }
      }
      
      console.log('✅ End-of-day data stored successfully');
    } catch (error) {
      console.error('❌ Error storing end-of-day data:', error);
    }
  }

  async getHistoricalData(request: HistoricalDataRequest): Promise<any[]> {
    try {
      const [instrument] = await db.select()
        .from(instruments)
        .where(eq(instruments.symbol, request.symbol))
        .limit(1);

      if (!instrument) return [];

      const historicalData = await db.select()
        .from(historicalMarketData)
        .where(
          and(
            eq(historicalMarketData.instrumentId, instrument.id),
            eq(historicalMarketData.timeframe, request.timeframe),
            sql`${historicalMarketData.tradingDate} >= ${request.fromDate}`,
            sql`${historicalMarketData.tradingDate} <= ${request.toDate}`
          )
        )
        .orderBy(desc(historicalMarketData.tradingDate));

      return historicalData;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  async getYesterdayOI(symbol: string): Promise<any[]> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const [instrument] = await db.select()
        .from(instruments)
        .where(eq(instruments.symbol, symbol))
        .limit(1);

      if (!instrument) return [];

      const yesterdayOI = await db.select()
        .from(historicalOptionChain)
        .where(
          and(
            eq(historicalOptionChain.instrumentId, instrument.id),
            sql`DATE(${historicalOptionChain.tradingDate}) = DATE(${yesterday})`
          )
        )
        .orderBy(historicalOptionChain.strikePrice);

      return yesterdayOI;
    } catch (error) {
      console.error('Error fetching yesterday OI:', error);
      return [];
    }
  }

  async getDataSourceStatus(): Promise<DataSourceStatus[]> {
    try {
      const metrics = await db.select().from(dataSourceMetrics);
      
      return metrics.map(metric => ({
        name: metric.sourceName,
        isActive: metric.isActive,
        lastSuccessfulFetch: metric.lastSuccessfulFetch,
        lastFailedFetch: metric.lastFailedFetch,
        successRate: metric.totalRequests > 0 
          ? (metric.successfulRequests / metric.totalRequests) * 100 
          : 0,
        avgResponseTime: parseFloat(metric.avgResponseTime || '0'),
        priority: metric.priority
      }));
    } catch (error) {
      console.error('Error fetching data source status:', error);
      return [];
    }
  }

  private async getActiveDataSources(): Promise<{ name: string; priority: number }[]> {
    const metrics = await db.select()
      .from(dataSourceMetrics)
      .where(eq(dataSourceMetrics.isActive, true))
      .orderBy(dataSourceMetrics.priority);

    return metrics.map(m => ({ name: m.sourceName, priority: m.priority }));
  }

  private async updateDataSourceMetrics(sourceName: string, success: boolean, responseTime?: number): Promise<void> {
    try {
      const now = new Date();
      
      await db.update(dataSourceMetrics)
        .set({
          totalRequests: sql`${dataSourceMetrics.totalRequests} + 1`,
          successfulRequests: success 
            ? sql`${dataSourceMetrics.successfulRequests} + 1`
            : dataSourceMetrics.successfulRequests,
          failedRequests: !success 
            ? sql`${dataSourceMetrics.failedRequests} + 1`
            : dataSourceMetrics.failedRequests,
          lastSuccessfulFetch: success ? now : dataSourceMetrics.lastSuccessfulFetch,
          lastFailedFetch: !success ? now : dataSourceMetrics.lastFailedFetch,
          avgResponseTime: responseTime 
            ? ((parseFloat(sql`${dataSourceMetrics.avgResponseTime}`.toString()) + responseTime) / 2).toString()
            : dataSourceMetrics.avgResponseTime,
          updatedAt: now
        })
        .where(eq(dataSourceMetrics.sourceName, sourceName));
    } catch (error) {
      console.error('Error updating data source metrics:', error);
    }
  }

  private transformAngelOneOptionChain(optionChain: any): MarketDataSnapshot['optionChain'] {
    if (!optionChain?.data) return [];
    
    return optionChain.data.map((item: any) => ({
      strike: item.strikePrice,
      callOI: item.CE?.openInterest || 0,
      callOIChange: item.CE?.changeinOpenInterest || 0,
      callLTP: item.CE?.lastPrice || 0,
      putOI: item.PE?.openInterest || 0,
      putOIChange: item.PE?.changeinOpenInterest || 0,
      putLTP: item.PE?.lastPrice || 0
    }));
  }

  private calculateDerivedMetrics(snapshot: MarketDataSnapshot): void {
    if (snapshot.optionChain.length > 0) {
      const totalCallOI = snapshot.optionChain.reduce((sum, opt) => sum + opt.callOI, 0);
      const totalPutOI = snapshot.optionChain.reduce((sum, opt) => sum + opt.putOI, 0);
      
      snapshot.putCallRatio = totalPutOI / totalCallOI;
      snapshot.openInterest = totalCallOI + totalPutOI;
      
      // Calculate max pain (simplified)
      snapshot.maxPainStrike = this.calculateMaxPain(snapshot.optionChain, snapshot.currentPrice);
    }
  }

  private calculateMaxPain(optionChain: MarketDataSnapshot['optionChain'], currentPrice: number): number {
    let minPain = Infinity;
    let maxPainStrike = currentPrice;

    for (const option of optionChain) {
      let totalPain = 0;
      
      // Calculate pain for all strikes
      for (const checkOption of optionChain) {
        if (option.strike > checkOption.strike) {
          totalPain += (option.strike - checkOption.strike) * checkOption.callOI;
        }
        if (option.strike < checkOption.strike) {
          totalPain += (checkOption.strike - option.strike) * checkOption.putOI;
        }
      }
      
      if (totalPain < minPain) {
        minPain = totalPain;
        maxPainStrike = option.strike;
      }
    }

    return maxPainStrike;
  }

  private generateStrikes(currentPrice: number): number[] {
    const baseStrike = Math.round(currentPrice / 50) * 50;
    const strikes: number[] = [];
    
    for (let i = -10; i <= 10; i++) {
      strikes.push(baseStrike + (i * 50));
    }
    
    return strikes.filter(strike => strike > 0);
  }

  private getBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'NIFTY': 22100,
      'BANKNIFTY': 46500,
      'FINNIFTY': 19800
    };
    return basePrices[symbol] || 22100;
  }

  private getNextExpiry(): string {
    const today = new Date();
    const nextThursday = new Date(today);
    nextThursday.setDate(today.getDate() + ((4 - today.getDay() + 7) % 7));
    return nextThursday.toISOString().split('T')[0];
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const marketOpen = 9 * 60 + 15;  // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    return isWeekday && currentTime >= marketOpen && currentTime <= marketClose;
  }

  getCurrentDataSource(): string {
    return this.primaryDataSource;
  }

  async switchDataSource(sourceName: string): Promise<boolean> {
    try {
      // Deactivate current source
      await db.update(dataSourceMetrics)
        .set({ isActive: false })
        .where(eq(dataSourceMetrics.sourceName, this.primaryDataSource));

      // Activate new source
      await db.update(dataSourceMetrics)
        .set({ isActive: true })
        .where(eq(dataSourceMetrics.sourceName, sourceName));

      this.primaryDataSource = sourceName;
      this.emit('dataSourceChanged', sourceName);
      
      return true;
    } catch (error) {
      console.error('Error switching data source:', error);
      return false;
    }
  }

  stop(): void {
    this.isInitialized = false;
    this.removeAllListeners();
  }
}

export const dataManagementService = new DataManagementService();