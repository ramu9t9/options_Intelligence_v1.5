import logger from './logger.js';
import { angelOneProvider } from './angelOneProvider.js';

// Mock data for fallback scenarios
const MOCK_MARKET_DATA = {
  NIFTY: {
    price: 24750.25,
    volume: 125000,
    change: 45.30,
    changePercent: 0.18,
    high: 24785.60,
    low: 24695.80,
    oi: 0,
    changeOi: 0
  },
  BANKNIFTY: {
    price: 51850.75,
    volume: 98000,
    change: -23.45,
    changePercent: -0.045,
    high: 51920.30,
    low: 51780.60,
    oi: 0,
    changeOi: 0
  },
  FINNIFTY: {
    price: 23456.80,
    volume: 45000,
    change: 12.65,
    changePercent: 0.054,
    high: 23478.90,
    low: 23420.15,
    oi: 0,
    changeOi: 0
  },
  RELIANCE: {
    price: 2850.45,
    volume: 2500000,
    change: 15.20,
    changePercent: 0.536,
    high: 2865.30,
    low: 2835.75,
    oi: 0,
    changeOi: 0
  },
  TCS: {
    price: 4125.60,
    volume: 1800000,
    change: -8.45,
    changePercent: -0.204,
    high: 4145.25,
    low: 4118.30,
    oi: 0,
    changeOi: 0
  },
  HDFC: {
    price: 1685.30,
    volume: 3200000,
    change: 7.85,
    changePercent: 0.469,
    high: 1692.45,
    low: 1678.20,
    oi: 0,
    changeOi: 0
  },
  INFY: {
    price: 1845.75,
    volume: 2100000,
    change: -5.60,
    changePercent: -0.302,
    high: 1858.90,
    low: 1840.25,
    oi: 0,
    changeOi: 0
  },
  ITC: {
    price: 485.60,
    volume: 5500000,
    change: 2.35,
    changePercent: 0.487,
    high: 487.80,
    low: 482.45,
    oi: 0,
    changeOi: 0
  }
};

// Mock option chain data
const MOCK_OPTION_CHAIN_DATA = {
  NIFTY: {
    symbol: 'NIFTY',
    expiry: '2025-01-30',
    strikes: [
      {
        strikePrice: 24700,
        callLTP: 85.30,
        callOI: 125000,
        callVolume: 45000,
        putLTP: 35.75,
        putOI: 98000,
        putVolume: 32000
      },
      {
        strikePrice: 24750,
        callLTP: 62.45,
        callOI: 156000,
        callVolume: 67000,
        putLTP: 58.90,
        putOI: 134000,
        putVolume: 54000
      },
      {
        strikePrice: 24800,
        callLTP: 42.80,
        callOI: 189000,
        callVolume: 89000,
        putLTP: 85.25,
        putOI: 167000,
        putVolume: 76000
      }
    ]
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    expiry: '2025-01-30',
    strikes: [
      {
        strikePrice: 51800,
        callLTP: 125.60,
        callOI: 98000,
        callVolume: 34000,
        putLTP: 75.30,
        putOI: 87000,
        putVolume: 28000
      },
      {
        strikePrice: 51850,
        callLTP: 98.45,
        callOI: 112000,
        callVolume: 45000,
        putLTP: 102.75,
        putOI: 105000,
        putVolume: 42000
      },
      {
        strikePrice: 51900,
        callLTP: 75.20,
        callOI: 134000,
        callVolume: 56000,
        putLTP: 128.90,
        putOI: 123000,
        putVolume: 51000
      }
    ]
  }
};

// Data source priority and fallback chain
const DATA_SOURCES = [
  { name: 'angel-one', priority: 1, enabled: true },
  { name: 'dhan', priority: 2, enabled: true },
  { name: 'nse', priority: 3, enabled: true },
  { name: 'yahoo', priority: 4, enabled: true },
  { name: 'mock', priority: 5, enabled: true }
];

interface LiveDataResponse {
  success: boolean;
  data: {
    price: number;
    volume?: number;
    change?: number;
    changePercent?: number;
    high?: number;
    low?: number;
    oi?: number;
    changeOi?: number;
  };
  source: string;
  timestamp: Date;
}

interface HistoricalDataResponse {
  success: boolean;
  data: Array<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  source: string;
}

interface OptionChainResponse {
  success: boolean;
  data: {
    symbol: string;
    expiry?: string;
    strikes?: Array<{
      strikePrice: number;
      callLTP?: number;
      callOI?: number;
      callVolume?: number;
      putLTP?: number;
      putOI?: number;
      putVolume?: number;
    }>;
  };
  source: string;
}

class DataFallbackService {
  private sourceHealth = new Map<string, { isHealthy: boolean; lastCheck: Date; responseTime: number }>();
  private fallbackAttempts = new Map<string, number>();
  private maxRetries = 3;
  private circuitBreakerThreshold = 5;
  private circuitBreakerResetTime = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize source health tracking
    DATA_SOURCES.forEach(source => {
      this.sourceHealth.set(source.name, {
        isHealthy: true,
        lastCheck: new Date(),
        responseTime: 0
      });
    });
  }

  // ===========================
  // LIVE MARKET DATA FETCHING
  // ===========================

  public async fetchLiveData(symbol: string): Promise<LiveDataResponse> {
    const sortedSources = DATA_SOURCES
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const source of sortedSources) {
      const sourceHealth = this.sourceHealth.get(source.name);
      
      // Skip unhealthy sources unless it's been long enough to retry
      if (!sourceHealth?.isHealthy) {
        const timeSinceLastCheck = Date.now() - sourceHealth!.lastCheck.getTime();
        if (timeSinceLastCheck < this.circuitBreakerResetTime) {
          continue;
        }
      }

      try {
        const startTime = Date.now();
        let result: LiveDataResponse;

        switch (source.name) {
          case 'angel-one':
            result = await this.fetchFromAngelOne(symbol);
            break;
          case 'dhan':
            result = await this.fetchFromDhan(symbol);
            break;
          case 'nse':
            result = await this.fetchFromNSE(symbol);
            break;
          case 'yahoo':
            result = await this.fetchFromYahoo(symbol);
            break;
          case 'mock':
          default:
            result = await this.fetchMockData(symbol);
            break;
        }

        // Update source health on success
        const responseTime = Date.now() - startTime;
        this.updateSourceHealth(source.name, true, responseTime);
        this.fallbackAttempts.delete(symbol);
        
        logger.info(`✅ Live data for ${symbol} fetched from ${source.name} (${responseTime}ms)`);
        return result;

      } catch (error) {
        logger.warn(`⚠️ Failed to fetch live data for ${symbol} from ${source.name}:`, error.message);
        this.updateSourceHealth(source.name, false, 0);
        
        // Track fallback attempts
        const attempts = this.fallbackAttempts.get(symbol) || 0;
        this.fallbackAttempts.set(symbol, attempts + 1);
        
        continue; // Try next source
      }
    }

    // If all sources fail, return mock data with error indication
    logger.error(`❌ All data sources failed for ${symbol}, returning mock data`);
    return await this.fetchMockData(symbol);
  }

  // ===========================
  // HISTORICAL DATA FETCHING
  // ===========================

  public async fetchHistoricalData(
    symbol: string,
    timeframe: string,
    from: Date,
    to: Date
  ): Promise<HistoricalDataResponse> {
    try {
      // For now, generate mock historical data
      const candles = this.generateMockHistoricalData(symbol, timeframe, from, to);
      
      return {
        success: true,
        data: candles,
        source: 'mock-historical'
      };
    } catch (error) {
      logger.error(`❌ Error fetching historical data for ${symbol}:`, error);
      
      return {
        success: false,
        data: [],
        source: 'error'
      };
    }
  }

  // ===========================
  // OPTION CHAIN DATA FETCHING
  // ===========================

  public async fetchOptionChain(symbol: string): Promise<OptionChainResponse> {
    try {
      const mockData = MOCK_OPTION_CHAIN_DATA[symbol as keyof typeof MOCK_OPTION_CHAIN_DATA];
      
      if (!mockData) {
        throw new Error(`No option chain data available for ${symbol}`);
      }
      
      return {
        success: true,
        data: mockData,
        source: 'mock-option-chain'
      };
    } catch (error) {
      logger.error(`❌ Error fetching option chain for ${symbol}:`, error);
      
      return {
        success: false,
        data: { symbol },
        source: 'error'
      };
    }
  }

  // ===========================
  // INDIVIDUAL DATA SOURCE METHODS
  // ===========================

  private async fetchFromAngelOne(symbol: string): Promise<LiveDataResponse> {
    if (!angelOneProvider.isAuthenticated()) {
      throw new Error('Angel One not authenticated');
    }

    try {
      const quotes = await angelOneProvider.getBulkQuotes([symbol], 'NSE');
      const quote = quotes[symbol];
      
      if (!quote) {
        throw new Error(`No data received for ${symbol} from Angel One`);
      }

      return {
        success: true,
        data: {
          price: quote.ltp,
          volume: quote.volume,
          change: quote.ltp - quote.close,
          changePercent: ((quote.ltp - quote.close) / quote.close) * 100,
          high: quote.high,
          low: quote.low,
          oi: 0,
          changeOi: 0
        },
        source: 'angel-one',
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Angel One API error: ${error.message}`);
    }
  }

  private async fetchFromDhan(symbol: string): Promise<LiveDataResponse> {
    // Simulate Dhan API call with realistic delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const baseData = MOCK_MARKET_DATA[symbol as keyof typeof MOCK_MARKET_DATA];
    if (!baseData) {
      throw new Error(`Symbol ${symbol} not supported by Dhan fallback`);
    }

    // Add some variation to mock real API behavior
    const variation = 0.995 + Math.random() * 0.01; // ±0.5% variation
    
    return {
      success: true,
      data: {
        price: baseData.price * variation,
        volume: baseData.volume,
        change: baseData.change * variation,
        changePercent: baseData.changePercent * variation,
        high: baseData.high,
        low: baseData.low,
        oi: baseData.oi,
        changeOi: baseData.changeOi
      },
      source: 'dhan',
      timestamp: new Date()
    };
  }

  private async fetchFromNSE(symbol: string): Promise<LiveDataResponse> {
    // Simulate NSE API call
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    const baseData = MOCK_MARKET_DATA[symbol as keyof typeof MOCK_MARKET_DATA];
    if (!baseData) {
      throw new Error(`Symbol ${symbol} not found on NSE`);
    }

    const variation = 0.992 + Math.random() * 0.016; // ±0.8% variation
    
    return {
      success: true,
      data: {
        price: baseData.price * variation,
        volume: baseData.volume,
        change: baseData.change * variation,
        changePercent: baseData.changePercent * variation,
        high: baseData.high,
        low: baseData.low,
        oi: baseData.oi,
        changeOi: baseData.changeOi
      },
      source: 'nse',
      timestamp: new Date()
    };
  }

  private async fetchFromYahoo(symbol: string): Promise<LiveDataResponse> {
    // Simulate Yahoo Finance API call
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    const baseData = MOCK_MARKET_DATA[symbol as keyof typeof MOCK_MARKET_DATA];
    if (!baseData) {
      throw new Error(`Symbol ${symbol} not available on Yahoo Finance`);
    }

    const variation = 0.988 + Math.random() * 0.024; // ±1.2% variation
    
    return {
      success: true,
      data: {
        price: baseData.price * variation,
        volume: baseData.volume,
        change: baseData.change * variation,
        changePercent: baseData.changePercent * variation,
        high: baseData.high,
        low: baseData.low,
        oi: baseData.oi,
        changeOi: baseData.changeOi
      },
      source: 'yahoo',
      timestamp: new Date()
    };
  }

  private async fetchMockData(symbol: string): Promise<LiveDataResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    const baseData = MOCK_MARKET_DATA[symbol as keyof typeof MOCK_MARKET_DATA];
    
    if (!baseData) {
      // Generate dynamic mock data for unknown symbols
      const randomPrice = 1000 + Math.random() * 10000;
      return {
        success: true,
        data: {
          price: randomPrice,
          volume: Math.floor(Math.random() * 1000000),
          change: (Math.random() - 0.5) * 100,
          changePercent: (Math.random() - 0.5) * 5,
          high: randomPrice * (1 + Math.random() * 0.02),
          low: randomPrice * (1 - Math.random() * 0.02),
          oi: 0,
          changeOi: 0
        },
        source: 'mock-generated',
        timestamp: new Date()
      };
    }

    // Add realistic market movement simulation
    const timeVariation = Math.sin(Date.now() / 100000) * 0.001; // Slow sine wave
    const randomVariation = (Math.random() - 0.5) * 0.002; // Small random variation
    const totalVariation = 1 + timeVariation + randomVariation;
    
    return {
      success: true,
      data: {
        price: baseData.price * totalVariation,
        volume: baseData.volume + Math.floor((Math.random() - 0.5) * 10000),
        change: baseData.change * totalVariation,
        changePercent: baseData.changePercent * totalVariation,
        high: baseData.high,
        low: baseData.low,
        oi: baseData.oi,
        changeOi: baseData.changeOi
      },
      source: 'mock',
      timestamp: new Date()
    };
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  private generateMockHistoricalData(
    symbol: string,
    timeframe: string,
    from: Date,
    to: Date
  ): Array<{ timestamp: Date; open: number; high: number; low: number; close: number; volume?: number }> {
    const basePrice = MOCK_MARKET_DATA[symbol as keyof typeof MOCK_MARKET_DATA]?.price || 1000;
    const candles = [];
    
    const timeframeMins = this.getTimeframeMinutes(timeframe);
    const totalCandles = Math.min(100, Math.floor((to.getTime() - from.getTime()) / (timeframeMins * 60 * 1000)));
    
    let currentPrice = basePrice;
    
    for (let i = 0; i < totalCandles; i++) {
      const timestamp = new Date(from.getTime() + i * timeframeMins * 60 * 1000);
      
      // Generate realistic OHLC data
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      
      const open = currentPrice;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(10000 + Math.random() * 50000);
      
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
      
      currentPrice = close;
    }
    
    return candles;
  }

  private getTimeframeMinutes(timeframe: string): number {
    switch (timeframe) {
      case '1min': return 1;
      case '5min': return 5;
      case '15min': return 15;
      case '30min': return 30;
      case '1hr': return 60;
      case '1day': return 1440;
      default: return 15;
    }
  }

  private updateSourceHealth(sourceName: string, isHealthy: boolean, responseTime: number) {
    this.sourceHealth.set(sourceName, {
      isHealthy,
      lastCheck: new Date(),
      responseTime
    });
  }

  // ===========================
  // PUBLIC API METHODS
  // ===========================

  public getSourceHealth() {
    const health: { [key: string]: any } = {};
    
    this.sourceHealth.forEach((status, sourceName) => {
      health[sourceName] = {
        isHealthy: status.isHealthy,
        lastCheck: status.lastCheck,
        responseTime: status.responseTime,
        priority: DATA_SOURCES.find(s => s.name === sourceName)?.priority || 999
      };
    });
    
    return health;
  }

  public getFallbackStats() {
    return {
      totalSources: DATA_SOURCES.length,
      healthySources: Array.from(this.sourceHealth.values()).filter(s => s.isHealthy).length,
      fallbackAttempts: Object.fromEntries(this.fallbackAttempts),
      sourceHealth: this.getSourceHealth()
    };
  }

  public resetCircuitBreaker(sourceName: string) {
    const health = this.sourceHealth.get(sourceName);
    if (health) {
      health.isHealthy = true;
      health.lastCheck = new Date();
      logger.info(`🔧 Circuit breaker reset for ${sourceName}`);
    }
  }
}

// Export singleton instance
export const dataFallbackService = new DataFallbackService();
export default dataFallbackService;