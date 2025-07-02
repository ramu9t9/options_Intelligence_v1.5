import { MarketDataProvider, OptionChainData } from './MarketDataProviders';
import { AngelOneProvider, NSEProvider, YahooFinanceProvider, MockProvider } from './MarketDataProviders';

export interface CentralizedDataConfig {
  adminAngelOne?: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
  };
  fallbackProviders: string[];
  updateInterval: number;
  maxConcurrentUsers: number;
  cacheTimeout: number;
}

export interface DataSubscription {
  userId: string;
  symbols: Set<string>;
  lastActivity: Date;
  subscription: 'FREE' | 'PRO' | 'VIP' | 'INSTITUTIONAL';
}

export interface MarketDataBroadcast {
  symbol: string;
  data: OptionChainData[];
  price: number;
  timestamp: string;
  source: string;
  subscriberCount: number;
}

export class CentralizedDataService {
  private static instance: CentralizedDataService;
  private primaryProvider: MarketDataProvider | null = null;
  private fallbackProviders: MarketDataProvider[] = [];
  private subscribers: Map<string, DataSubscription> = new Map();
  private dataCache: Map<string, { data: OptionChainData[]; timestamp: Date; price: number }> = new Map();
  private broadcastCallbacks: ((broadcast: MarketDataBroadcast) => void)[] = [];
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private config: CentralizedDataConfig;
  private isRunning = false;

  private constructor(config: CentralizedDataConfig) {
    this.config = config;
    this.initializeProviders();
  }

  static getInstance(config?: CentralizedDataConfig): CentralizedDataService {
    if (!CentralizedDataService.instance) {
      if (!config) {
        config = {
          fallbackProviders: [], // NO FALLBACK PROVIDERS - AUTHENTIC DATA ONLY
          updateInterval: 5000,
          maxConcurrentUsers: 10000,
          cacheTimeout: 30000 // 30 seconds
        };
      }
      CentralizedDataService.instance = new CentralizedDataService(config);
    }
    return CentralizedDataService.instance;
  }

  private async initializeProviders(): Promise<void> {
    console.log('🔧 Initializing centralized data providers...');

    // Initialize primary Angel One provider if admin credentials are available
    if (this.config.adminAngelOne) {
      try {
        this.primaryProvider = new AngelOneProvider(
          this.config.adminAngelOne.apiKey,
          this.config.adminAngelOne.clientId,
          this.config.adminAngelOne.clientSecret
        );
        console.log('✅ Primary Angel One provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize primary Angel One provider:', error);
      }
    }

    // Initialize fallback providers
    for (const providerName of this.config.fallbackProviders) {
      try {
        let provider: MarketDataProvider;
        
        switch (providerName) {
          case 'nse':
            provider = new NSEProvider();
            break;
          case 'yahoo':
            provider = new YahooFinanceProvider();
            break;
          case 'mock':
            provider = new MockProvider();
            break;
          default:
            continue;
        }

        this.fallbackProviders.push(provider);
        console.log(`✅ Fallback provider ${providerName} initialized`);
      } catch (error) {
        console.error(`❌ Failed to initialize fallback provider ${providerName}:`, error);
      }
    }

    console.log(`📊 Centralized data service initialized with ${this.fallbackProviders.length} fallback providers`);
  }

  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('⚠️ Centralized data service already running');
      return true;
    }

    console.log('🚀 Starting centralized data service...');

    // Try to connect to primary provider first
    if (this.primaryProvider) {
      try {
        const connected = await this.primaryProvider.connect();
        if (connected) {
          console.log('✅ Connected to primary Angel One provider');
          this.isRunning = true;
          await this.startDataCollection();
          return true;
        }
      } catch (error) {
        console.error('❌ Primary provider connection failed:', error);
      }
    }

    // Fallback to other providers
    for (const provider of this.fallbackProviders) {
      try {
        const connected = await provider.connect();
        if (connected) {
          this.primaryProvider = provider;
          console.log(`✅ Connected to fallback provider: ${provider.name}`);
          this.isRunning = true;
          await this.startDataCollection();
          return true;
        }
      } catch (error) {
        console.error(`❌ Fallback provider ${provider.name} connection failed:`, error);
      }
    }

    console.error('❌ Failed to connect to any data provider');
    return false;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping centralized data service...');

    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    // Disconnect from provider
    if (this.primaryProvider) {
      await this.primaryProvider.disconnect();
    }

    this.isRunning = false;
    console.log('🛑 Centralized data service stopped');
  }

  private async startDataCollection(): Promise<void> {
    if (!this.primaryProvider) return;

    // Get all unique symbols from subscribers
    const allSymbols = new Set<string>();
    for (const subscription of this.subscribers.values()) {
      for (const symbol of subscription.symbols) {
        allSymbols.add(symbol);
      }
    }

    // Start data collection for each symbol
    for (const symbol of allSymbols) {
      await this.subscribeToSymbol(symbol);
    }

    console.log(`📊 Started data collection for ${allSymbols.size} symbols`);
  }

  async addSubscriber(
    userId: string, 
    symbols: string[], 
    subscription: 'FREE' | 'PRO' | 'VIP' | 'INSTITUTIONAL'
  ): Promise<boolean> {
    try {
      // Check concurrent user limits
      if (this.subscribers.size >= this.config.maxConcurrentUsers) {
        console.warn(`⚠️ Maximum concurrent users (${this.config.maxConcurrentUsers}) reached`);
        return false;
      }

      // Apply subscription limits
      const allowedSymbols = this.applySubscriptionLimits(symbols, subscription);

      const dataSubscription: DataSubscription = {
        userId,
        symbols: new Set(allowedSymbols),
        lastActivity: new Date(),
        subscription
      };

      this.subscribers.set(userId, dataSubscription);

      // Subscribe to new symbols if needed
      for (const symbol of allowedSymbols) {
        if (!this.isSymbolBeingTracked(symbol)) {
          await this.subscribeToSymbol(symbol);
        }
      }

      console.log(`✅ Added subscriber ${userId} with ${allowedSymbols.length} symbols (${subscription})`);
      return true;
    } catch (error) {
      console.error(`❌ Error adding subscriber ${userId}:`, error);
      return false;
    }
  }

  async removeSubscriber(userId: string): Promise<void> {
    const subscription = this.subscribers.get(userId);
    if (!subscription) return;

    this.subscribers.delete(userId);

    // Check if any symbols are no longer needed
    for (const symbol of subscription.symbols) {
      if (!this.isSymbolBeingTracked(symbol)) {
        await this.unsubscribeFromSymbol(symbol);
      }
    }

    console.log(`✅ Removed subscriber ${userId}`);
  }

  private applySubscriptionLimits(symbols: string[], subscription: string): string[] {
    switch (subscription) {
      case 'FREE':
        return symbols.slice(0, 2); // Max 2 instruments
      case 'PRO':
        return symbols.slice(0, 10); // Max 10 instruments
      case 'VIP':
      case 'INSTITUTIONAL':
        return symbols; // Unlimited
      default:
        return symbols.slice(0, 2);
    }
  }

  private isSymbolBeingTracked(symbol: string): boolean {
    for (const subscription of this.subscribers.values()) {
      if (subscription.symbols.has(symbol)) {
        return true;
      }
    }
    return false;
  }

  private async subscribeToSymbol(symbol: string): Promise<void> {
    if (!this.primaryProvider || this.updateIntervals.has(symbol)) return;

    try {
      // Subscribe to real-time updates if supported
      await this.primaryProvider.subscribeToInstrument(symbol);

      // Set up polling interval
      const interval = setInterval(async () => {
        await this.fetchAndBroadcastData(symbol);
      }, this.config.updateInterval);

      this.updateIntervals.set(symbol, interval);

      // Initial fetch
      await this.fetchAndBroadcastData(symbol);

      console.log(`📊 Subscribed to symbol: ${symbol}`);
    } catch (error) {
      console.error(`❌ Error subscribing to symbol ${symbol}:`, error);
    }
  }

  private async unsubscribeFromSymbol(symbol: string): Promise<void> {
    if (!this.primaryProvider) return;

    try {
      await this.primaryProvider.unsubscribeFromInstrument(symbol);

      const interval = this.updateIntervals.get(symbol);
      if (interval) {
        clearInterval(interval);
        this.updateIntervals.delete(symbol);
      }

      // Remove from cache
      this.dataCache.delete(symbol);

      console.log(`📊 Unsubscribed from symbol: ${symbol}`);
    } catch (error) {
      console.error(`❌ Error unsubscribing from symbol ${symbol}:`, error);
    }
  }

  private async fetchAndBroadcastData(symbol: string): Promise<void> {
    if (!this.primaryProvider) return;

    try {
      // Check cache first
      const cached = this.dataCache.get(symbol);
      if (cached && Date.now() - cached.timestamp.getTime() < this.config.cacheTimeout) {
        // Use cached data but still broadcast to maintain real-time feel
        this.broadcastData(symbol, cached.data, cached.price, 'cache');
        return;
      }

      // Fetch fresh data
      const [optionChain, price] = await Promise.all([
        this.primaryProvider.getOptionChain(symbol),
        this.primaryProvider.getLTP(symbol)
      ]);

      // Update cache
      this.dataCache.set(symbol, {
        data: optionChain,
        timestamp: new Date(),
        price
      });

      // Broadcast to subscribers
      this.broadcastData(symbol, optionChain, price, this.primaryProvider.name);

    } catch (error) {
      console.error(`❌ Error fetching data for ${symbol}:`, error);
      
      // Try fallback providers
      await this.tryFallbackProviders(symbol);
    }
  }

  private async tryFallbackProviders(symbol: string): Promise<void> {
    for (const provider of this.fallbackProviders) {
      if (provider === this.primaryProvider) continue;

      try {
        if (!provider.isConnected) {
          await provider.connect();
        }

        const [optionChain, price] = await Promise.all([
          provider.getOptionChain(symbol),
          provider.getLTP(symbol)
        ]);

        // Update cache
        this.dataCache.set(symbol, {
          data: optionChain,
          timestamp: new Date(),
          price
        });

        // Broadcast with fallback indicator
        this.broadcastData(symbol, optionChain, price, `${provider.name} (fallback)`);
        
        console.log(`✅ Fallback data fetched for ${symbol} from ${provider.name}`);
        return;

      } catch (error) {
        console.error(`❌ Fallback provider ${provider.name} failed for ${symbol}:`, error);
      }
    }

    console.error(`❌ All providers failed for symbol ${symbol}`);
  }

  private broadcastData(symbol: string, data: OptionChainData[], price: number, source: string): void {
    // Count subscribers for this symbol
    let subscriberCount = 0;
    for (const subscription of this.subscribers.values()) {
      if (subscription.symbols.has(symbol)) {
        subscriberCount++;
      }
    }

    const broadcast: MarketDataBroadcast = {
      symbol,
      data,
      price,
      timestamp: new Date().toISOString(),
      source,
      subscriberCount
    };

    // Notify all broadcast callbacks
    this.broadcastCallbacks.forEach(callback => {
      try {
        callback(broadcast);
      } catch (error) {
        console.error('Error in broadcast callback:', error);
      }
    });
  }

  onDataBroadcast(callback: (broadcast: MarketDataBroadcast) => void): () => void {
    this.broadcastCallbacks.push(callback);
    return () => {
      this.broadcastCallbacks = this.broadcastCallbacks.filter(cb => cb !== callback);
    };
  }

  // Get cached data for immediate response
  getCachedData(symbol: string): { data: OptionChainData[]; price: number; timestamp: Date } | null {
    const cached = this.dataCache.get(symbol);
    return cached || null;
  }

  // Get service statistics
  getServiceStats(): {
    isRunning: boolean;
    activeProvider: string | null;
    subscriberCount: number;
    trackedSymbols: number;
    cacheSize: number;
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      activeProvider: this.primaryProvider?.name || null,
      subscriberCount: this.subscribers.size,
      trackedSymbols: this.updateIntervals.size,
      cacheSize: this.dataCache.size,
      uptime: this.isRunning ? Date.now() : 0
    };
  }

  // Update subscriber activity (for connection management)
  updateSubscriberActivity(userId: string): void {
    const subscription = this.subscribers.get(userId);
    if (subscription) {
      subscription.lastActivity = new Date();
    }
  }

  // Clean up inactive subscribers
  async cleanupInactiveSubscribers(timeoutMinutes: number = 30): Promise<void> {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const inactiveUsers: string[] = [];

    for (const [userId, subscription] of this.subscribers.entries()) {
      if (subscription.lastActivity < cutoffTime) {
        inactiveUsers.push(userId);
      }
    }

    for (const userId of inactiveUsers) {
      await this.removeSubscriber(userId);
      console.log(`🧹 Cleaned up inactive subscriber: ${userId}`);
    }

    if (inactiveUsers.length > 0) {
      console.log(`🧹 Cleaned up ${inactiveUsers.length} inactive subscribers`);
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<CentralizedDataConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Centralized data service configuration updated');
  }
}