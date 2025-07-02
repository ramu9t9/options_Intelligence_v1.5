import { EventEmitter } from 'events';
import { PatternDetector, type PatternResult, type OptionChainData, type MarketContext } from './patternDetector';
import { angelOneProvider } from './angelOneProvider';
import { alertSystem } from './alertSystem';
import { storage } from './storage';

export interface MarketDataUpdate {
  underlying: string;
  price: number;
  previousPrice: number;
  timestamp: Date;
  optionChain: OptionChainData[];
  patterns: PatternResult[];
  volume: number;
  change: number;
  changePercent: number;
}

export interface DataProvider {
  name: string;
  priority: number;
  isActive: boolean;
  lastUpdate?: Date;
  errorCount: number;
  initialize(): Promise<boolean>;
  getQuote(symbol: string): Promise<any>;
  getOptionChain?(symbol: string): Promise<any>;
  disconnect(): void;
}

export class MarketDataService extends EventEmitter {
  private providers: Map<string, DataProvider> = new Map();
  private activeSubscriptions = new Set<string>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();
  private lastPrices = new Map<string, number>();
  private isRunning = false;
  private updateFrequency = 5000; // 5 seconds

  async initialize(): Promise<void> {
    console.log('Initializing Market Data Service...');

    // Initialize providers in priority order
    await this.initializeProviders();
    
    // Initialize pattern detector and alert system
    await alertSystem.initialize();
    
    console.log('Market Data Service initialized successfully');
  }

  private async initializeProviders(): Promise<void> {
    // Get provider configurations from database
    const providerConfigs = await storage.getServiceProviders();
    
    for (const config of providerConfigs) {
      try {
        let provider: DataProvider;
        
        switch (config.providerName) {
          case 'Angel One':
            provider = {
              name: 'Angel One',
              priority: config.priority,
              isActive: config.isActive,
              errorCount: 0,
              initialize: () => angelOneProvider.initialize(),
              getQuote: (symbol: string) => angelOneProvider.getQuote(symbol),
              getOptionChain: (symbol: string) => angelOneProvider.getOptionChain(symbol, this.getNextExpiry()),
              disconnect: () => angelOneProvider.disconnect()
            };
            break;
            
          case 'Mock Provider':
            provider = {
              name: 'Mock Provider',
              priority: config.priority,
              isActive: config.isActive,
              errorCount: 0,
              initialize: async () => true,
              getQuote: (symbol: string) => this.generateMockQuote(symbol),
              getOptionChain: async (symbol: string) => this.generateMockOptionChain(symbol),
              disconnect: () => {}
            };
            break;
            
          default:
            continue;
        }
        
        if (await provider.initialize()) {
          this.providers.set(provider.name, provider);
          console.log(`Provider ${provider.name} initialized successfully`);
        }
      } catch (error) {
        console.error(`Failed to initialize provider ${config.providerName}:`, error);
      }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log('Starting Market Data Service...');
    
    // Get active instruments from database
    const instruments = await storage.getInstruments();
    
    for (const instrument of instruments) {
      await this.subscribeToInstrument(instrument.symbol);
    }
    
    this.isRunning = true;
    console.log(`Market Data Service started with ${instruments.length} instruments`);
  }

  async subscribeToInstrument(symbol: string): Promise<void> {
    if (this.activeSubscriptions.has(symbol)) return;
    
    this.activeSubscriptions.add(symbol);
    
    // Start periodic updates
    const interval = setInterval(async () => {
      await this.updateInstrumentData(symbol);
    }, this.updateFrequency);
    
    this.updateIntervals.set(symbol, interval);
    
    // Get initial data
    await this.updateInstrumentData(symbol);
    
    console.log(`Subscribed to ${symbol}`);
  }

  private async updateInstrumentData(symbol: string): Promise<void> {
    try {
      const quote = await this.getQuoteFromBestProvider(symbol);
      if (!quote) return;

      const previousPrice = this.lastPrices.get(symbol) || quote.ltp;
      this.lastPrices.set(symbol, quote.ltp);

      // Get option chain data
      const optionChainRaw = await this.getOptionChainFromBestProvider(symbol);
      const optionChain = this.transformOptionChainData(optionChainRaw);

      // Analyze patterns
      const marketContext: MarketContext = {
        underlying: symbol,
        currentPrice: quote.ltp,
        previousPrice,
        volatility: this.calculateVolatility(quote),
        marketHours: this.isMarketHours(),
        timeframe: '5min'
      };

      const patterns = await PatternDetector.analyzeOptionChain(optionChain, marketContext);

      // Check alerts
      const instrument = await storage.getInstrumentBySymbol(symbol);
      if (instrument) {
        await alertSystem.checkPriceAlerts(instrument.id, quote.ltp, previousPrice);
        await alertSystem.checkPatternAlerts(patterns);
      }

      // Create market data update
      const update: MarketDataUpdate = {
        underlying: symbol,
        price: quote.ltp,
        previousPrice,
        timestamp: new Date(),
        optionChain,
        patterns,
        volume: quote.volume || 0,
        change: quote.ltp - previousPrice,
        changePercent: ((quote.ltp - previousPrice) / previousPrice) * 100
      };

      // Emit update
      this.emit('marketDataUpdate', update);
      this.emit(`update:${symbol}`, update);

      // Store significant patterns
      if (patterns.length > 0) {
        console.log(`${patterns.length} patterns detected for ${symbol}`);
      }

    } catch (error) {
      console.error(`Error updating ${symbol}:`, error);
    }
  }

  private async getQuoteFromBestProvider(symbol: string): Promise<any> {
    const sortedProviders = Array.from(this.providers.values())
      .filter(p => p.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const provider of sortedProviders) {
      try {
        const quote = await provider.getQuote(symbol);
        if (quote) {
          provider.errorCount = 0;
          provider.lastUpdate = new Date();
          return quote;
        }
      } catch (error) {
        provider.errorCount++;
        console.warn(`Provider ${provider.name} failed for ${symbol}:`, error);
        
        if (provider.errorCount > 5) {
          provider.isActive = false;
          console.error(`Deactivating provider ${provider.name} due to repeated failures`);
        }
      }
    }

    return null;
  }

  private async getOptionChainFromBestProvider(symbol: string): Promise<any> {
    const sortedProviders = Array.from(this.providers.values())
      .filter(p => p.isActive && p.getOptionChain)
      .sort((a, b) => a.priority - b.priority);

    for (const provider of sortedProviders) {
      try {
        if (provider.getOptionChain) {
          const optionChain = await provider.getOptionChain(symbol);
          if (optionChain) return optionChain;
        }
      } catch (error) {
        console.warn(`Option chain failed for ${provider.name}:`, error);
      }
    }

    // Fallback to mock data for development
    return this.generateMockOptionChain(symbol);
  }

  private transformOptionChainData(rawData: any): OptionChainData[] {
    if (!rawData) return [];

    // Transform different provider formats to standardized format
    if (Array.isArray(rawData)) {
      return rawData;
    }

    if (rawData.data && Array.isArray(rawData.data)) {
      return rawData.data.map((item: any) => ({
        strike: item.strikePrice || item.strike,
        callOI: item.CE?.openInterest || 0,
        callOIChange: item.CE?.changeinOpenInterest || 0,
        callLTP: item.CE?.lastPrice || 0,
        callLTPChange: item.CE?.pctChange || 0,
        callVolume: item.CE?.totalTradedVolume || 0,
        putOI: item.PE?.openInterest || 0,
        putOIChange: item.PE?.changeinOpenInterest || 0,
        putLTP: item.PE?.lastPrice || 0,
        putLTPChange: item.PE?.pctChange || 0,
        putVolume: item.PE?.totalTradedVolume || 0
      }));
    }

    return [];
  }

  private generateMockQuote(symbol: string): any {
    const basePrice = this.getBasePrice(symbol);
    const randomChange = (Math.random() - 0.5) * basePrice * 0.02; // ±1% random change
    
    return {
      tradingsymbol: symbol,
      ltp: basePrice + randomChange,
      open: basePrice,
      high: basePrice + Math.abs(randomChange) * 1.5,
      low: basePrice - Math.abs(randomChange) * 1.5,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      close: basePrice
    };
  }

  private generateMockOptionChain(symbol: string): OptionChainData[] {
    const basePrice = this.getBasePrice(symbol);
    const strikes: number[] = [];
    
    // Generate strikes around current price
    const startStrike = Math.floor(basePrice / 100) * 100 - 500;
    for (let i = 0; i < 20; i++) {
      strikes.push(startStrike + (i * 100));
    }

    return strikes.map(strike => ({
      strike,
      callOI: Math.floor(Math.random() * 50000) + 1000,
      callOIChange: Math.floor(Math.random() * 10000) - 5000,
      callLTP: Math.max(1, basePrice - strike + Math.random() * 50),
      callLTPChange: (Math.random() - 0.5) * 20,
      callVolume: Math.floor(Math.random() * 10000),
      putOI: Math.floor(Math.random() * 50000) + 1000,
      putOIChange: Math.floor(Math.random() * 10000) - 5000,
      putLTP: Math.max(1, strike - basePrice + Math.random() * 50),
      putLTPChange: (Math.random() - 0.5) * 20,
      putVolume: Math.floor(Math.random() * 10000)
    }));
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      'NIFTY': 22000,
      'BANKNIFTY': 45000,
      'FINNIFTY': 18000,
      'GOLD': 62000,
      'SILVER': 72000,
      'CRUDEOIL': 6500
    };
    return prices[symbol] || 10000;
  }

  private calculateVolatility(quote: any): number {
    const range = (quote.high - quote.low) / quote.ltp;
    return range * 100;
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();
    
    // Indian market hours: Monday-Friday, 9:15 AM - 3:30 PM IST
    return day >= 1 && day <= 5 && hours >= 9 && hours < 16;
  }

  private getNextExpiry(): string {
    const now = new Date();
    const nextThursday = new Date(now);
    const daysUntilThursday = (4 - now.getDay() + 7) % 7;
    if (daysUntilThursday === 0 && now.getHours() >= 15) {
      nextThursday.setDate(now.getDate() + 7);
    } else {
      nextThursday.setDate(now.getDate() + daysUntilThursday);
    }
    
    return nextThursday.toISOString().split('T')[0];
  }

  async unsubscribeFromInstrument(symbol: string): Promise<void> {
    if (!this.activeSubscriptions.has(symbol)) return;
    
    const interval = this.updateIntervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(symbol);
    }
    
    this.activeSubscriptions.delete(symbol);
    console.log(`Unsubscribed from ${symbol}`);
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions);
  }

  getProviderStatus(): Array<{
    name: string;
    isActive: boolean;
    lastUpdate?: Date;
    errorCount: number;
  }> {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      isActive: provider.isActive,
      lastUpdate: provider.lastUpdate,
      errorCount: provider.errorCount
    }));
  }

  async stop(): Promise<void> {
    console.log('Stopping Market Data Service...');
    
    // Clear all intervals
    Array.from(this.updateIntervals.values()).forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();
    this.activeSubscriptions.clear();
    
    // Disconnect providers
    Array.from(this.providers.values()).forEach(provider => provider.disconnect());
    
    // Stop alert system
    alertSystem.stop();
    
    this.isRunning = false;
    console.log('Market Data Service stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();