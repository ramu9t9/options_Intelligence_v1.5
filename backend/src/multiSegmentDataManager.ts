import { EventEmitter } from 'events';
import { angelOneProvider } from './angelOneProvider';

export interface SegmentConfiguration {
  type: 'EQUITY' | 'COMMODITY' | 'CURRENCY';
  instruments: string[];
  marketHours: { open: string; close: string; timezone: string };
  dataInterval: number; // seconds
  strikeInterval: number; // for options
  maxStrikes: number;
  isActive: boolean;
}

export interface SegmentData {
  segment: string;
  instruments: Record<string, {
    ltp: number;
    change: number;
    changePercent: number;
    volume: number;
    optionChain: any[];
    lastRefresh: Date;
  }>;
  lastUpdate: Date;
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_OPEN' | 'POST_CLOSE';
}

export class MultiSegmentDataManager extends EventEmitter {
  private segmentConfigs: Map<string, SegmentConfiguration> = new Map();
  private activeCollectors: Map<string, NodeJS.Timeout> = new Map();
  private segmentData: Map<string, SegmentData> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.initializeSegmentConfigurations();
  }

  private initializeSegmentConfigurations(): void {
    // Equity segment configuration
    this.segmentConfigs.set('EQUITY', {
      type: 'EQUITY',
      instruments: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
      marketHours: { open: '09:15', close: '15:30', timezone: 'Asia/Kolkata' },
      dataInterval: 3,
      strikeInterval: 50,
      maxStrikes: 11,
      isActive: true
    });

    // Commodity segment configuration
    this.segmentConfigs.set('COMMODITY', {
      type: 'COMMODITY',
      instruments: ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER'],
      marketHours: { open: '09:00', close: '23:30', timezone: 'Asia/Kolkata' },
      dataInterval: 5,
      strikeInterval: 100,
      maxStrikes: 11,
      isActive: true
    });

    // Currency segment configuration
    this.segmentConfigs.set('CURRENCY', {
      type: 'CURRENCY',
      instruments: ['USDINR', 'EURINR', 'GBPINR'],
      marketHours: { open: '09:00', close: '17:00', timezone: 'Asia/Kolkata' },
      dataInterval: 10,
      strikeInterval: 0.25,
      maxStrikes: 11,
      isActive: false // Initially disabled
    });

    console.log('🔧 Multi-segment configurations initialized:', Array.from(this.segmentConfigs.keys()));
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Initializing Multi-Segment Data Manager...');

    // Initialize segment data structures
    for (const [segmentName, config] of this.segmentConfigs) {
      if (config.isActive) {
        this.segmentData.set(segmentName, {
          segment: segmentName,
          instruments: {},
          lastUpdate: new Date(),
          marketStatus: this.getMarketStatus(config)
        });

        // Initialize instrument data
        for (const instrument of config.instruments) {
          this.segmentData.get(segmentName)!.instruments[instrument] = {
            ltp: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            optionChain: [],
            lastRefresh: new Date()
          };
        }

        console.log(`✅ Initialized ${segmentName} segment with ${config.instruments.length} instruments`);
      }
    }

    this.isInitialized = true;
    
    // Start data collection for active segments
    await this.startAllActiveSegments();
  }

  async startAllActiveSegments(): Promise<void> {
    for (const [segmentName, config] of this.segmentConfigs) {
      if (config.isActive && this.isMarketOpen(segmentName)) {
        await this.startSegmentCollection(segmentName);
      }
    }
  }

  async startSegmentCollection(segmentName: string): Promise<void> {
    const config = this.segmentConfigs.get(segmentName);
    if (!config) {
      console.error(`❌ Segment configuration not found: ${segmentName}`);
      return;
    }

    // Stop existing collector if running
    if (this.activeCollectors.has(segmentName)) {
      clearInterval(this.activeCollectors.get(segmentName)!);
    }

    console.log(`🚀 Starting data collection for ${segmentName} segment (${config.dataInterval}s interval)`);

    // Create collection interval
    const collector = setInterval(async () => {
      if (this.isMarketOpen(segmentName)) {
        await this.collectSegmentData(segmentName);
      } else {
        console.log(`⏰ Market closed for ${segmentName}, stopping collection`);
        this.stopSegmentCollection(segmentName);
      }
    }, config.dataInterval * 1000);

    this.activeCollectors.set(segmentName, collector);

    // Initial collection
    await this.collectSegmentData(segmentName);
  }

  async stopSegmentCollection(segmentName: string): Promise<void> {
    if (this.activeCollectors.has(segmentName)) {
      clearInterval(this.activeCollectors.get(segmentName)!);
      this.activeCollectors.delete(segmentName);
      console.log(`⏹️ Stopped data collection for ${segmentName} segment`);
    }
  }

  private async collectSegmentData(segmentName: string): Promise<void> {
    const config = this.segmentConfigs.get(segmentName);
    const segmentData = this.segmentData.get(segmentName);

    if (!config || !segmentData) return;

    try {
      // Collect data for each instrument in the segment
      for (const instrument of config.instruments) {
        await this.collectInstrumentData(segmentName, instrument);
      }

      // Update segment last update time
      segmentData.lastUpdate = new Date();
      segmentData.marketStatus = this.getMarketStatus(config);

      // Emit segment update event
      this.emit('segmentUpdate', {
        segment: segmentName,
        data: segmentData,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`❌ Failed to collect data for ${segmentName}:`, error);
    }
  }

  private async collectInstrumentData(segmentName: string, instrument: string): Promise<void> {
    const segmentData = this.segmentData.get(segmentName);
    if (!segmentData) return;

    try {
      let instrumentData;

      if (segmentName === 'EQUITY') {
        // Use existing equity data collection logic
        instrumentData = await this.collectEquityData(instrument);
      } else if (segmentName === 'COMMODITY') {
        // Use commodity-specific data collection
        instrumentData = await this.collectCommodityData(instrument);
      } else if (segmentName === 'CURRENCY') {
        // Use currency-specific data collection
        instrumentData = await this.collectCurrencyData(instrument);
      }

      if (instrumentData) {
        segmentData.instruments[instrument] = {
          ...instrumentData,
          lastRefresh: new Date()
        };

        console.log(`📊 ${segmentName} - ${instrument}: ₹${instrumentData.ltp.toLocaleString()} (${instrumentData.changePercent.toFixed(2)}%)`);
      }

    } catch (error) {
      console.error(`❌ Failed to collect data for ${instrument} in ${segmentName}:`, error);
    }
  }

  private async collectEquityData(instrument: string): Promise<any> {
    // Use existing equity data collection logic
    const currentPrice = this.generateRealisticPrice(instrument);
    const basePrice = this.getBasePrice(instrument);
    const change = currentPrice - basePrice;
    const changePercent = (change / basePrice) * 100;

    return {
      ltp: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 100000) + 50000,
      optionChain: this.generateOptionChain(instrument, currentPrice, 50)
    };
  }

  private async collectCommodityData(instrument: string): Promise<any> {
    // Commodity-specific data collection
    const currentPrice = this.generateRealisticCommodityPrice(instrument);
    const basePrice = this.getCommodityBasePrice(instrument);
    const change = currentPrice - basePrice;
    const changePercent = (change / basePrice) * 100;

    const strikeInterval = this.getCommodityStrikeInterval(instrument);

    return {
      ltp: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 10000) + 5000, // Lower volume than equity
      optionChain: this.generateOptionChain(instrument, currentPrice, strikeInterval)
    };
  }

  private async collectCurrencyData(instrument: string): Promise<any> {
    // Currency-specific data collection
    const currentPrice = this.generateRealisticCurrencyPrice(instrument);
    const basePrice = this.getCurrencyBasePrice(instrument);
    const change = currentPrice - basePrice;
    const changePercent = (change / basePrice) * 100;

    return {
      ltp: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 50000) + 10000,
      optionChain: this.generateOptionChain(instrument, currentPrice, 0.25)
    };
  }

  private generateRealisticPrice(symbol: string): number {
    const basePrice = this.getBasePrice(symbol);
    const volatility = 0.02; // 2% volatility
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    return Math.round(basePrice * randomFactor * 100) / 100;
  }

  private generateRealisticCommodityPrice(symbol: string): number {
    const basePrice = this.getCommodityBasePrice(symbol);
    const volatility = this.getCommodityVolatility(symbol);
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    return Math.round(basePrice * randomFactor * 100) / 100;
  }

  private generateRealisticCurrencyPrice(symbol: string): number {
    const basePrice = this.getCurrencyBasePrice(symbol);
    const volatility = 0.01; // 1% volatility for currencies
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    return Math.round(basePrice * randomFactor * 10000) / 10000; // 4 decimal places
  }

  private getBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'NIFTY': 24500,
      'BANKNIFTY': 52000,
      'FINNIFTY': 24000
    };
    return basePrices[symbol] || 24500;
  }

  private getCommodityBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'CRUDEOIL': 6250,
      'NATURALGAS': 235,
      'GOLD': 62500,
      'SILVER': 73000
    };
    return basePrices[symbol] || 6250;
  }

  private getCurrencyBasePrice(symbol: string): number {
    const basePrices: Record<string, number> = {
      'USDINR': 84.25,
      'EURINR': 91.50,
      'GBPINR': 106.75
    };
    return basePrices[symbol] || 84.25;
  }

  private getCommodityVolatility(symbol: string): number {
    const volatilities: Record<string, number> = {
      'CRUDEOIL': 0.03, // 3% volatility
      'NATURALGAS': 0.05, // 5% volatility
      'GOLD': 0.02, // 2% volatility
      'SILVER': 0.04 // 4% volatility
    };
    return volatilities[symbol] || 0.03;
  }

  private getCommodityStrikeInterval(symbol: string): number {
    const intervals: Record<string, number> = {
      'CRUDEOIL': 50,
      'NATURALGAS': 10,
      'GOLD': 100,
      'SILVER': 500
    };
    return intervals[symbol] || 50;
  }

  private generateOptionChain(symbol: string, currentPrice: number, strikeInterval: number): any[] {
    const optionChain = [];
    const maxStrikes = 11;
    const startStrike = Math.floor(currentPrice / strikeInterval) * strikeInterval - (Math.floor(maxStrikes / 2) * strikeInterval);

    for (let i = 0; i < maxStrikes; i++) {
      const strike = startStrike + (i * strikeInterval);
      if (strike > 0) {
        optionChain.push({
          strike: strike,
          callOI: Math.floor(Math.random() * 100000) + 10000,
          callOIChange: Math.floor(Math.random() * 20000) - 10000,
          callLTP: Math.max(0.05, Math.random() * Math.max(currentPrice - strike, 10)),
          callVolume: Math.floor(Math.random() * 50000),
          putOI: Math.floor(Math.random() * 100000) + 10000,
          putOIChange: Math.floor(Math.random() * 20000) - 10000,
          putLTP: Math.max(0.05, Math.random() * Math.max(strike - currentPrice, 10)),
          putVolume: Math.floor(Math.random() * 50000)
        });
      }
    }

    return optionChain;
  }

  private isMarketOpen(segmentName: string): boolean {
    const config = this.segmentConfigs.get(segmentName);
    if (!config) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    return currentTime >= config.marketHours.open && currentTime <= config.marketHours.close;
  }

  private getMarketStatus(config: SegmentConfiguration): 'OPEN' | 'CLOSED' | 'PRE_OPEN' | 'POST_CLOSE' {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);

    if (currentTime < config.marketHours.open) {
      return 'PRE_OPEN';
    } else if (currentTime >= config.marketHours.open && currentTime <= config.marketHours.close) {
      return 'OPEN';
    } else {
      return 'POST_CLOSE';
    }
  }

  // Public methods for external access
  getSegmentData(segmentName?: string): SegmentData | Map<string, SegmentData> {
    if (segmentName) {
      return this.segmentData.get(segmentName) || {} as SegmentData;
    }
    return this.segmentData;
  }

  getActiveSegments(): string[] {
    return Array.from(this.activeCollectors.keys());
  }

  getAllInstruments(): Record<string, string[]> {
    const allInstruments: Record<string, string[]> = {};
    for (const [segmentName, config] of this.segmentConfigs) {
      if (config.isActive) {
        allInstruments[segmentName] = config.instruments;
      }
    }
    return allInstruments;
  }

  getSegmentConfiguration(segmentName: string): SegmentConfiguration | undefined {
    return this.segmentConfigs.get(segmentName);
  }

  async updateSegmentConfiguration(segmentName: string, updates: Partial<SegmentConfiguration>): Promise<void> {
    const config = this.segmentConfigs.get(segmentName);
    if (config) {
      Object.assign(config, updates);
      console.log(`🔧 Updated configuration for ${segmentName} segment`);
      
      // Restart collection if interval changed
      if (updates.dataInterval && this.activeCollectors.has(segmentName)) {
        await this.stopSegmentCollection(segmentName);
        await this.startSegmentCollection(segmentName);
      }
    }
  }

  stop(): void {
    console.log('⏹️ Stopping Multi-Segment Data Manager...');
    for (const [segmentName] of this.activeCollectors) {
      this.stopSegmentCollection(segmentName);
    }
    this.isInitialized = false;
    console.log('✅ Multi-Segment Data Manager stopped');
  }
}

export const multiSegmentDataManager = new MultiSegmentDataManager();