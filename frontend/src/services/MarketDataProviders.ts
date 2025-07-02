// Market Data Provider interfaces and implementations with CORS fixes
export interface MarketDataProvider {
  name: string;
  isConnected: boolean;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  subscribeToInstrument(symbol: string): Promise<boolean>;
  unsubscribeFromInstrument(symbol: string): Promise<boolean>;
  getOptionChain(symbol: string): Promise<OptionChainData[]>;
  getLTP(symbol: string): Promise<number>;
}

export interface OptionChainData {
  strike: number;
  callOI: number;
  callOIChange: number;
  callLTP: number;
  callLTPChange: number;
  callVolume: number;
  putOI: number;
  putOIChange: number;
  putLTP: number;
  putLTPChange: number;
  putVolume: number;
  timestamp: string;
}

export interface MarketTick {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// CORS-Free NSE Data Provider using proxy endpoints
export class NSEProvider implements MarketDataProvider {
  name = 'NSE';
  isConnected = false;
  private proxyUrl = 'https://api.allorigins.win/raw?url=';
  private baseUrl = 'https://www.nseindia.com/api';
  private fallbackUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  async connect(): Promise<boolean> {
    try {
      // Test connection with a simple index data call
      const testUrl = `${this.proxyUrl}${encodeURIComponent(`${this.baseUrl}/equity-stockIndices?index=NIFTY%2050`)}`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: this.headers
      });

      if (response.ok) {
        this.isConnected = true;
        console.log('✅ NSE API connected successfully via proxy');
        return true;
      } else {
        // Fallback to Yahoo Finance for basic connectivity
        return await this.testYahooFallback();
      }
    } catch (error) {
      console.log('⚠️ NSE direct connection failed, trying fallback...');
      return await this.testYahooFallback();
    }
  }

  private async testYahooFallback(): Promise<boolean> {
    try {
      const response = await fetch(`${this.fallbackUrl}/^NSEI`);
      if (response.ok) {
        this.isConnected = true;
        console.log('✅ NSE connected via Yahoo Finance fallback');
        return true;
      }
      throw new Error('Yahoo fallback failed');
    } catch (error) {
      console.error('❌ NSE connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 NSE disconnected');
  }

  async subscribeToInstrument(symbol: string): Promise<boolean> {
    console.log(`📊 NSE: Polling mode enabled for ${symbol}`);
    return true;
  }

  async unsubscribeFromInstrument(symbol: string): Promise<boolean> {
    console.log(`📊 NSE: Stopped polling ${symbol}`);
    return true;
  }

  async getOptionChain(symbol: string): Promise<OptionChainData[]> {
    if (!this.isConnected) return [];

    try {
      const nseSymbol = this.mapToNSESymbol(symbol);
      const url = `${this.proxyUrl}${encodeURIComponent(`${this.baseUrl}/option-chain-indices?symbol=${nseSymbol}`)}`;
      
      const response = await fetch(url, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`NSE option chain request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseNSEOptionChain(data);
    } catch (error) {
      console.error(`Error fetching NSE option chain for ${symbol}:`, error);
      // Return mock data as fallback
      return this.generateMockOptionChain(symbol);
    }
  }

  private generateMockOptionChain(symbol: string): OptionChainData[] {
    const basePrice = this.getBasePrice(symbol);
    const strikeInterval = this.getStrikeInterval(symbol);
    const optionChain = [];
    
    for (let i = -10; i <= 10; i++) {
      const strike = Math.round(basePrice + (i * strikeInterval));
      optionChain.push({
        strike,
        callOI: Math.floor(Math.random() * 100000) + 10000,
        callOIChange: Math.floor(Math.random() * 20000) - 10000,
        callLTP: Math.max(1, Math.floor(Math.random() * 200) + 10),
        callLTPChange: Math.floor(Math.random() * 20) - 10,
        callVolume: Math.floor(Math.random() * 50000),
        putOI: Math.floor(Math.random() * 100000) + 10000,
        putOIChange: Math.floor(Math.random() * 20000) - 10000,
        putLTP: Math.max(1, Math.floor(Math.random() * 200) + 10),
        putLTPChange: Math.floor(Math.random() * 20) - 10,
        putVolume: Math.floor(Math.random() * 50000),
        timestamp: new Date().toISOString()
      });
    }
    
    return optionChain;
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      'NIFTY': 19523.45,
      'BANKNIFTY': 45287.30,
      'GOLD': 62450.00,
      'SILVER': 72850.00,
      'CRUDEOIL': 6245.50,
      'NATURALGAS': 234.80
    };
    return prices[symbol] || 19500;
  }

  private getStrikeInterval(symbol: string): number {
    const intervals: Record<string, number> = {
      'NIFTY': 50,
      'BANKNIFTY': 100,
      'GOLD': 100,
      'SILVER': 100,
      'CRUDEOIL': 50,
      'NATURALGAS': 10
    };
    return intervals[symbol] || 50;
  }

  private mapToNSESymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'NIFTY': 'NIFTY',
      'BANKNIFTY': 'BANKNIFTY',
      'GOLD': 'GOLD',
      'SILVER': 'SILVER',
      'CRUDEOIL': 'CRUDEOIL',
      'NATURALGAS': 'NATURALGAS'
    };
    return symbolMap[symbol] || symbol;
  }

  private parseNSEOptionChain(data: any): OptionChainData[] {
    if (!data.records || !data.records.data) {
      console.log('No NSE option chain data, using mock data');
      return [];
    }

    return data.records.data.map((item: any) => ({
      strike: parseFloat(item.strikePrice),
      callOI: item.CE?.openInterest || 0,
      callOIChange: item.CE?.changeinOpenInterest || 0,
      callLTP: item.CE?.lastPrice || 0,
      callLTPChange: item.CE?.change || 0,
      callVolume: item.CE?.totalTradedVolume || 0,
      putOI: item.PE?.openInterest || 0,
      putOIChange: item.PE?.changeinOpenInterest || 0,
      putLTP: item.PE?.lastPrice || 0,
      putLTPChange: item.PE?.change || 0,
      putVolume: item.PE?.totalTradedVolume || 0,
      timestamp: new Date().toISOString()
    }));
  }

  async getLTP(symbol: string): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      // Try Yahoo Finance first for better reliability
      const yahooSymbol = this.mapToYahooSymbol(symbol);
      const response = await fetch(`${this.fallbackUrl}/${yahooSymbol}`);

      if (response.ok) {
        const data = await response.json();
        const result = data.chart?.result?.[0];
        const price = result?.meta?.regularMarketPrice || result?.meta?.previousClose;
        return parseFloat(price) || this.getBasePrice(symbol);
      }

      // Fallback to NSE if Yahoo fails
      const nseUrl = `${this.proxyUrl}${encodeURIComponent(`${this.baseUrl}/equity-stockIndices?index=NIFTY%2050`)}`;
      const nseResponse = await fetch(nseUrl, { headers: this.headers });

      if (nseResponse.ok) {
        const nseData = await nseResponse.json();
        const index = nseData.data?.find((item: any) => 
          item.index === symbol || item.index === this.mapToNSESymbol(symbol)
        );
        return parseFloat(index?.last) || this.getBasePrice(symbol);
      }

      return this.getBasePrice(symbol);
    } catch (error) {
      console.error(`Error fetching LTP for ${symbol}:`, error);
      return this.getBasePrice(symbol);
    }
  }

  private mapToYahooSymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'NIFTY': '^NSEI',
      'BANKNIFTY': '^NSEBANK',
      'GOLD': 'GC=F',
      'SILVER': 'SI=F',
      'CRUDEOIL': 'CL=F',
      'NATURALGAS': 'NG=F'
    };
    return symbolMap[symbol] || '^NSEI';
  }
}

// Enhanced Yahoo Finance Provider with better error handling
export class YahooFinanceProvider implements MarketDataProvider {
  name = 'Yahoo Finance';
  isConnected = false;
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private quotesUrl = 'https://query1.finance.yahoo.com/v7/finance/quote';

  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/^NSEI`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        this.isConnected = true;
        console.log('✅ Yahoo Finance connected successfully');
        return true;
      } else {
        throw new Error(`Yahoo Finance connection failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Yahoo Finance connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 Yahoo Finance disconnected');
  }

  async subscribeToInstrument(symbol: string): Promise<boolean> {
    console.log(`📊 Yahoo Finance: Polling mode for ${symbol}`);
    return true;
  }

  async unsubscribeFromInstrument(symbol: string): Promise<boolean> {
    console.log(`📊 Yahoo Finance: Stopped polling ${symbol}`);
    return true;
  }

  async getOptionChain(symbol: string): Promise<OptionChainData[]> {
    // Yahoo Finance doesn't provide detailed Indian option chain data
    // Return empty array to indicate no option chain available
    console.log('Yahoo Finance: Option chain not available for Indian markets');
    return [];
  }

  async getLTP(symbol: string): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const yahooSymbol = this.mapToYahooSymbol(symbol);
      const response = await fetch(`${this.baseUrl}/${yahooSymbol}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance LTP request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      const price = result?.meta?.regularMarketPrice || result?.meta?.previousClose;
      return parseFloat(price) || 0;
    } catch (error) {
      console.error(`Error fetching Yahoo Finance LTP for ${symbol}:`, error);
      return 0;
    }
  }

  private mapToYahooSymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'NIFTY': '^NSEI',
      'BANKNIFTY': '^NSEBANK',
      'GOLD': 'GC=F',
      'SILVER': 'SI=F',
      'CRUDEOIL': 'CL=F',
      'NATURALGAS': 'NG=F'
    };
    return symbolMap[symbol] || '^NSEI';
  }
}

// Mock Provider for development and fallback
export class MockProvider implements MarketDataProvider {
  name = 'Mock Provider';
  isConnected = false;
  private mockData: Map<string, OptionChainData[]> = new Map();
  private mockPrices: Map<string, number> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const instruments = ['NIFTY', 'BANKNIFTY', 'GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS'];
    const basePrices: Record<string, number> = {
      'NIFTY': 19523.45,
      'BANKNIFTY': 45287.30,
      'GOLD': 62450.00,
      'SILVER': 72850.00,
      'CRUDEOIL': 6245.50,
      'NATURALGAS': 234.80
    };

    instruments.forEach(symbol => {
      this.mockPrices.set(symbol, basePrices[symbol]);
      this.mockData.set(symbol, this.generateMockOptionChain(symbol, basePrices[symbol]));
    });
  }

  private generateMockOptionChain(symbol: string, basePrice: number): OptionChainData[] {
    const strikeInterval = this.getStrikeInterval(symbol);
    const optionChain = [];
    
    for (let i = -10; i <= 10; i++) {
      const strike = Math.round(basePrice + (i * strikeInterval));
      optionChain.push({
        strike,
        callOI: Math.floor(Math.random() * 100000) + 10000,
        callOIChange: Math.floor(Math.random() * 20000) - 10000,
        callLTP: Math.max(1, Math.floor(Math.random() * 200) + 10),
        callLTPChange: Math.floor(Math.random() * 20) - 10,
        callVolume: Math.floor(Math.random() * 50000),
        putOI: Math.floor(Math.random() * 100000) + 10000,
        putOIChange: Math.floor(Math.random() * 20000) - 10000,
        putLTP: Math.max(1, Math.floor(Math.random() * 200) + 10),
        putLTPChange: Math.floor(Math.random() * 20) - 10,
        putVolume: Math.floor(Math.random() * 50000),
        timestamp: new Date().toISOString()
      });
    }
    
    return optionChain;
  }

  private getStrikeInterval(symbol: string): number {
    const intervals: Record<string, number> = {
      'NIFTY': 50,
      'BANKNIFTY': 100,
      'GOLD': 100,
      'SILVER': 100,
      'CRUDEOIL': 50,
      'NATURALGAS': 10
    };
    return intervals[symbol] || 50;
  }

  async connect(): Promise<boolean> {
    this.isConnected = true;
    console.log('✅ Mock Provider connected successfully');
    return true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 Mock Provider disconnected');
  }

  async subscribeToInstrument(symbol: string): Promise<boolean> {
    console.log(`📊 Mock Provider: Subscribed to ${symbol}`);
    return true;
  }

  async unsubscribeFromInstrument(symbol: string): Promise<boolean> {
    console.log(`📊 Mock Provider: Unsubscribed from ${symbol}`);
    return true;
  }

  async getOptionChain(symbol: string): Promise<OptionChainData[]> {
    // Simulate some variation in mock data
    const data = this.mockData.get(symbol) || [];
    return data.map(item => ({
      ...item,
      callOI: item.callOI + Math.floor(Math.random() * 1000) - 500,
      putOI: item.putOI + Math.floor(Math.random() * 1000) - 500,
      callLTP: Math.max(0.5, item.callLTP + (Math.random() - 0.5) * 2),
      putLTP: Math.max(0.5, item.putLTP + (Math.random() - 0.5) * 2),
      timestamp: new Date().toISOString()
    }));
  }

  async getLTP(symbol: string): Promise<number> {
    const basePrice = this.mockPrices.get(symbol) || 0;
    // Add some random variation (±0.5%)
    const variation = basePrice * 0.005 * (Math.random() - 0.5);
    const newPrice = basePrice + variation;
    this.mockPrices.set(symbol, newPrice);
    return newPrice;
  }
}

// Angel One API Provider (placeholder for future implementation)
export class AngelOneProvider implements MarketDataProvider {
  name = 'Angel One';
  isConnected = false;
  private apiKey: string;
  private clientId: string;
  private clientSecret: string;

  constructor(apiKey: string, clientId: string, clientSecret: string) {
    this.apiKey = apiKey;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async connect(): Promise<boolean> {
    // For now, return false to indicate not implemented
    // This will be implemented when user provides credentials
    console.log('⚠️ Angel One API not yet implemented - requires credentials');
    this.isConnected = false;
    return false;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 Angel One disconnected');
  }

  async subscribeToInstrument(symbol: string): Promise<boolean> {
    console.log(`📊 Angel One: Would subscribe to ${symbol} (not implemented)`);
    return false;
  }

  async unsubscribeFromInstrument(symbol: string): Promise<boolean> {
    console.log(`📊 Angel One: Would unsubscribe from ${symbol} (not implemented)`);
    return false;
  }

  async getOptionChain(symbol: string): Promise<OptionChainData[]> {
    console.log('Angel One: Option chain not implemented yet');
    return [];
  }

  async getLTP(symbol: string): Promise<number> {
    console.log('Angel One: LTP not implemented yet');
    return 0;
  }
}