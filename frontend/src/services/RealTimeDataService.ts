import { MarketDataProvider, OptionChainData, MarketTick } from './MarketDataProviders';
import { AngelOneProvider, NSEProvider, YahooFinanceProvider, MockProvider } from './MarketDataProviders';

export interface DataServiceConfig {
  primaryProvider: 'angel' | 'nse' | 'yahoo' | 'mock';
  fallbackProviders: ('angel' | 'nse' | 'yahoo' | 'mock')[];
  angelOne?: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
  };
  updateInterval: number; // milliseconds
  retryAttempts: number;
  enableFallback: boolean;
  mockMode?: boolean;
}

export interface RealTimeUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  optionChain?: OptionChainData[];
  timestamp: string;
  source: string;
}

export class RealTimeDataService {
  private static instance: RealTimeDataService;
  private providers: Map<string, MarketDataProvider> = new Map();
  private activeProvider: MarketDataProvider | null = null;
  private config: DataServiceConfig;
  private subscribers: ((update: RealTimeUpdate) => void)[] = [];
  private subscribedSymbols = new Set<string>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();
  private isRunning = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private lastPrices = new Map<string, number>();

  private constructor(config: DataServiceConfig) {
    this.config = config;
    this.initializeProviders();
  }

  static getInstance(config?: DataServiceConfig): RealTimeDataService {
    if (!RealTimeDataService.instance) {
      if (!config) {
        // Default configuration
        config = {
          primaryProvider: 'mock',
          fallbackProviders: ['nse', 'yahoo'],
          updateInterval: 5000,
          retryAttempts: 3,
          enableFallback: true,
          mockMode: true
        };
      }
      RealTimeDataService.instance = new RealTimeDataService(config);
    }
    return RealTimeDataService.instance;
  }

  private initializeProviders(): void {
    console.log('🔧 Initializing market data providers...');

    // Clear existing providers to ensure clean re-initialization
    this.providers.clear();

    // Always initialize Mock Provider
    const mockProvider = new MockProvider();
    this.providers.set('mock', mockProvider);

    // Initialize NSE provider
    const nseProvider = new NSEProvider();
    this.providers.set('nse', nseProvider);

    // Initialize Yahoo Finance provider
    const yahooProvider = new YahooFinanceProvider();
    this.providers.set('yahoo', yahooProvider);

    // Initialize Angel One if credentials are properly provided
    if (this.config.angelOne && 
        this.config.angelOne.apiKey && 
        this.config.angelOne.clientId && 
        this.config.angelOne.clientSecret) {
      try {
        const angelProvider = new AngelOneProvider(
          this.config.angelOne.apiKey,
          this.config.angelOne.clientId,
          this.config.angelOne.clientSecret
        );
        this.providers.set('angel', angelProvider);
        console.log('✅ Angel One provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Angel One provider:', error);
      }
    } else {
      // Explicitly remove angel provider if credentials are not valid
      this.providers.delete('angel');
      console.log('⚠️ Angel One provider not initialized - missing or invalid credentials');
    }

    console.log(`📊 Initialized ${this.providers.size} data providers`);
  }

  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('⚠️ Real-time data service already running');
      return true;
    }

    console.log('🚀 Starting real-time data service...');
    this.connectionAttempts = 0;

    // Try to connect to providers in order of preference
    const providerOrder = [this.config.primaryProvider, ...this.config.fallbackProviders];
    
    for (const providerName of providerOrder) {
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.log('⚠️ Max connection attempts reached, falling back to mock provider');
        break;
      }

      const provider = this.providers.get(providerName);
      if (!provider) {
        console.log(`⚠️ Provider ${providerName} not available`);
        continue;
      }

      console.log(`🔄 Attempting to connect to ${provider.name}...`);
      this.connectionAttempts++;

      try {
        const connected = await this.connectWithTimeout(provider, 10000); // 10 second timeout
        if (connected) {
          this.activeProvider = provider;
          console.log(`✅ Connected to ${provider.name}`);
          break;
        } else {
          console.log(`❌ Failed to connect to ${provider.name}`);
        }
      } catch (error) {
        console.log(`❌ Error connecting to ${provider.name}:`, error);
      }
    }

    // If no provider connected, use mock as final fallback
    if (!this.activeProvider) {
      console.log('🎭 No external providers available, using mock provider');
      const mockProvider = this.providers.get('mock');
      if (mockProvider && await mockProvider.connect()) {
        this.activeProvider = mockProvider;
      } else {
        console.error('❌ Failed to start any data provider');
        return false;
      }
    }

    this.isRunning = true;
    this.setupEventListeners();
    
    // Subscribe to previously requested symbols
    for (const symbol of this.subscribedSymbols) {
      await this.subscribeToSymbol(symbol);
    }

    console.log(`🚀 Real-time data service started with ${this.activeProvider.name}`);
    return true;
  }

  private async connectWithTimeout(provider: MarketDataProvider, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, timeout);

      provider.connect().then((result) => {
        clearTimeout(timer);
        resolve(result);
      }).catch(() => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping real-time data service...');

    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    // Disconnect from active provider
    if (this.activeProvider) {
      await this.activeProvider.disconnect();
      this.activeProvider = null;
    }

    this.isRunning = false;
    console.log('🛑 Real-time data service stopped');
  }

  private setupEventListeners(): void {
    // Listen for market ticks from WebSocket providers
    window.addEventListener('marketTick', (event: any) => {
      const tick: MarketTick = event.detail;
      this.handleMarketTick(tick);
    });
  }

  private handleMarketTick(tick: MarketTick): void {
    const previousPrice = this.lastPrices.get(tick.symbol) || tick.ltp;
    const change = tick.ltp - previousPrice;
    const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

    this.lastPrices.set(tick.symbol, tick.ltp);

    const update: RealTimeUpdate = {
      symbol: tick.symbol,
      price: tick.ltp,
      change,
      changePercent,
      volume: tick.volume,
      timestamp: tick.timestamp,
      source: this.activeProvider?.name || 'Unknown'
    };

    this.notifySubscribers(update);
  }

  subscribe(callback: (update: RealTimeUpdate) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(update: RealTimeUpdate): void {
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  async subscribeToSymbol(symbol: string): Promise<boolean> {
    this.subscribedSymbols.add(symbol);

    if (!this.activeProvider || !this.isRunning) {
      console.log(`📊 Queued subscription for ${symbol}`);
      return true;
    }

    try {
      // Subscribe to real-time updates if provider supports it
      await this.activeProvider.subscribeToInstrument(symbol);

      // Set up polling for all providers (as backup or primary method)
      this.setupPolling(symbol);

      console.log(`📊 Subscribed to ${symbol} via ${this.activeProvider.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to subscribe to ${symbol}:`, error);
      return false;
    }
  }

  async unsubscribeFromSymbol(symbol: string): Promise<boolean> {
    this.subscribedSymbols.delete(symbol);

    if (!this.activeProvider) return true;

    try {
      await this.activeProvider.unsubscribeFromInstrument(symbol);
      
      // Clear polling interval
      const interval = this.updateIntervals.get(symbol);
      if (interval) {
        clearInterval(interval);
        this.updateIntervals.delete(symbol);
      }

      console.log(`📊 Unsubscribed from ${symbol}`);
      return true;
    } catch (error) {
      console.error(`Failed to unsubscribe from ${symbol}:`, error);
      return false;
    }
  }

  private setupPolling(symbol: string): void {
    // Clear existing interval
    const existingInterval = this.updateIntervals.get(symbol);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new polling interval
    const interval = setInterval(async () => {
      await this.pollSymbolData(symbol);
    }, this.config.updateInterval);

    this.updateIntervals.set(symbol, interval);

    // Initial poll
    this.pollSymbolData(symbol);
  }

  private async pollSymbolData(symbol: string): Promise<void> {
    if (!this.activeProvider) return;

    try {
      const [price, optionChain] = await Promise.all([
        this.activeProvider.getLTP(symbol),
        this.activeProvider.getOptionChain(symbol)
      ]);

      const previousPrice = this.lastPrices.get(symbol) || price;
      const change = price - previousPrice;
      const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;

      this.lastPrices.set(symbol, price);

      const update: RealTimeUpdate = {
        symbol,
        price,
        change,
        changePercent,
        volume: 0, // Not available from polling
        optionChain: optionChain.length > 0 ? optionChain : undefined,
        timestamp: new Date().toISOString(),
        source: this.activeProvider.name
      };

      this.notifySubscribers(update);
    } catch (error) {
      console.error(`Error polling data for ${symbol}:`, error);
      
      // Try to reconnect if polling fails repeatedly
      if (this.activeProvider && !this.activeProvider.isConnected) {
        console.log('🔄 Attempting to reconnect...');
        await this.attemptReconnection();
      }
    }
  }

  private async attemptReconnection(): Promise<void> {
    if (!this.activeProvider) return;

    try {
      const reconnected = await this.activeProvider.connect();
      if (reconnected) {
        console.log(`✅ Reconnected to ${this.activeProvider.name}`);
      } else {
        console.log('❌ Reconnection failed, trying fallback providers...');
        await this.switchToFallbackProvider();
      }
    } catch (error) {
      console.error('Reconnection error:', error);
      await this.switchToFallbackProvider();
    }
  }

  private async switchToFallbackProvider(): Promise<void> {
    const fallbackProviders = this.config.fallbackProviders.filter(name => 
      name !== this.activeProvider?.name.toLowerCase().replace(' ', '')
    );

    for (const providerName of fallbackProviders) {
      const provider = this.providers.get(providerName);
      if (provider && await provider.connect()) {
        this.activeProvider = provider;
        console.log(`✅ Switched to fallback provider: ${provider.name}`);
        
        // Re-subscribe to all symbols
        for (const symbol of this.subscribedSymbols) {
          await this.subscribeToSymbol(symbol);
        }
        return;
      }
    }

    // Final fallback to mock provider
    const mockProvider = this.providers.get('mock');
    if (mockProvider && await mockProvider.connect()) {
      this.activeProvider = mockProvider;
      console.log('🎭 Switched to mock provider as final fallback');
    }
  }

  async getOptionChain(symbol: string): Promise<OptionChainData[]> {
    if (!this.activeProvider) return [];

    try {
      return await this.activeProvider.getOptionChain(symbol);
    } catch (error) {
      console.error(`Error fetching option chain for ${symbol}:`, error);
      return [];
    }
  }

  async getLTP(symbol: string): Promise<number> {
    if (!this.activeProvider) return 0;

    try {
      return await this.activeProvider.getLTP(symbol);
    } catch (error) {
      console.error(`Error fetching LTP for ${symbol}:`, error);
      return 0;
    }
  }

  getStatus(): {
    isRunning: boolean;
    activeProvider: string | null;
    subscribedSymbols: string[];
    connectionStatus: boolean;
  } {
    return {
      isRunning: this.isRunning,
      activeProvider: this.activeProvider?.name || null,
      subscribedSymbols: Array.from(this.subscribedSymbols),
      connectionStatus: this.activeProvider?.isConnected || false
    };
  }

  async switchProvider(providerName: 'angel' | 'nse' | 'yahoo' | 'mock'): Promise<boolean> {
    const newProvider = this.providers.get(providerName);
    if (!newProvider) {
      console.error(`Provider ${providerName} not available`);
      return false;
    }

    try {
      // Disconnect current provider
      if (this.activeProvider) {
        await this.activeProvider.disconnect();
      }

      // Connect to new provider
      if (await newProvider.connect()) {
        this.activeProvider = newProvider;
        
        // Re-subscribe to all symbols
        for (const symbol of this.subscribedSymbols) {
          await this.subscribeToSymbol(symbol);
        }

        console.log(`✅ Switched to provider: ${newProvider.name}`);
        return true;
      } else {
        throw new Error(`Failed to connect to ${providerName}`);
      }
    } catch (error) {
      console.error(`Error switching to provider ${providerName}:`, error);
      
      // Try to restore previous provider or fallback to mock
      if (!this.activeProvider || !this.activeProvider.isConnected) {
        await this.switchToFallbackProvider();
      }
      
      return false;
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<DataServiceConfig>): void {
    const oldAngelConfig = this.config.angelOne;
    const newAngelConfig = newConfig.angelOne;
    
    this.config = { ...this.config, ...newConfig };
    
    // Check if Angel One credentials have changed
    const angelCredentialsChanged = 
      (!oldAngelConfig && newAngelConfig) || // Added credentials
      (oldAngelConfig && !newAngelConfig) || // Removed credentials
      (oldAngelConfig && newAngelConfig && (
        oldAngelConfig.apiKey !== newAngelConfig.apiKey ||
        oldAngelConfig.clientId !== newAngelConfig.clientId ||
        oldAngelConfig.clientSecret !== newAngelConfig.clientSecret
      )); // Changed credentials

    // Re-initialize providers if Angel One credentials changed
    if (angelCredentialsChanged) {
      console.log('🔧 Angel One credentials changed, re-initializing providers...');
      this.initializeProviders();
    }
    
    console.log('🔧 Configuration updated:', this.config);
  }

  // Get current configuration
  getConfig(): DataServiceConfig {
    return { ...this.config };
  }
}