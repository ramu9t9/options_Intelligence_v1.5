import { useState, useEffect, useCallback } from 'react';
import { RealTimeDataService, RealTimeUpdate, DataServiceConfig } from '../services/RealTimeDataService';
import { useMarketData } from '../context/MarketDataContext';

interface UseRealTimeDataOptions {
  autoStart?: boolean;
  config?: Partial<DataServiceConfig>;
}

export function useRealTimeData(options: UseRealTimeDataOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<RealTimeUpdate | null>(null);
  const [subscribedSymbols, setSubscribedSymbols] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Get data mode from context
  const { dataMode } = useMarketData();

  // Default configuration with mock-only settings
  const defaultConfig: DataServiceConfig = {
    primaryProvider: 'mock',
    fallbackProviders: [],
    updateInterval: 5000,
    retryAttempts: 3,
    enableFallback: false,
    mockMode: true,
    ...options.config
  };

  const [service, setService] = useState<RealTimeDataService | null>(null);

  useEffect(() => {
    initializeService();
  }, [dataMode]); // Reinitialize when data mode changes

  // Update service configuration when config changes
  useEffect(() => {
    if (service && options.config) {
      service.updateConfig(options.config);
    }
  }, [service, options.config]);

  const initializeService = useCallback(async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    setError(null);

    try {
      console.log('🔧 Initializing RealTimeDataService...');
      
      const dataService = RealTimeDataService.getInstance(defaultConfig);
      setService(dataService);

      // Subscribe to updates
      const unsubscribe = dataService.subscribe((update: RealTimeUpdate) => {
        setLastUpdate(update);
        setError(null);
      });

      // Auto-start if requested
      if (options.autoStart !== false) {
        const started = await dataService.start();
        if (!started) {
          setError('Failed to start any data provider');
        }
      }

      // Update status periodically
      const statusInterval = setInterval(updateStatus, 2000);

      // Cleanup function
      return () => {
        unsubscribe();
        clearInterval(statusInterval);
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize data service';
      setError(errorMessage);
      console.error('❌ Failed to initialize RealTimeDataService:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [dataMode, isInitializing]);

  const updateStatus = useCallback(() => {
    if (service) {
      const status = service.getStatus();
      setIsConnected(status.connectionStatus);
      setActiveProvider(status.activeProvider);
      setSubscribedSymbols(status.subscribedSymbols);
    }
  }, [service]);

  const startService = useCallback(async () => {
    if (!service) {
      setError('Service not initialized');
      return false;
    }

    try {
      setError(null);
      console.log('🚀 Starting real-time data service...');
      
      const success = await service.start();
      if (!success) {
        setError('Failed to start data service - all providers unavailable');
      } else {
        console.log('✅ Real-time data service started successfully');
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error starting service';
      setError(errorMessage);
      console.error('❌ Error starting data service:', err);
      return false;
    }
  }, [service]);

  const stopService = useCallback(async () => {
    if (!service) return;

    try {
      await service.stop();
      setIsConnected(false);
      setActiveProvider(null);
      setError(null);
      console.log('🛑 Real-time data service stopped');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop service';
      setError(errorMessage);
      console.error('❌ Error stopping service:', err);
    }
  }, [service]);

  const subscribeToSymbol = useCallback(async (symbol: string) => {
    if (!service) {
      setError('Service not initialized');
      return false;
    }

    try {
      const success = await service.subscribeToSymbol(symbol);
      if (success) {
        updateStatus();
        console.log(`✅ Subscribed to ${symbol}`);
      } else {
        setError(`Failed to subscribe to ${symbol}`);
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to subscribe to ${symbol}`;
      setError(errorMessage);
      return false;
    }
  }, [service, updateStatus]);

  const unsubscribeFromSymbol = useCallback(async (symbol: string) => {
    if (!service) return false;

    try {
      const success = await service.unsubscribeFromSymbol(symbol);
      if (success) {
        updateStatus();
        console.log(`✅ Unsubscribed from ${symbol}`);
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to unsubscribe from ${symbol}`;
      setError(errorMessage);
      return false;
    }
  }, [service, updateStatus]);

  const switchProvider = useCallback(async (providerName: 'angel' | 'nse' | 'yahoo' | 'mock') => {
    if (!service) {
      setError('Service not initialized');
      return false;
    }

    try {
      setError(null);
      console.log(`🔄 Switching to ${providerName} provider...`);
      
      const success = await service.switchProvider(providerName);
      if (!success) {
        setError(`Failed to switch to ${providerName} provider`);
      } else {
        console.log(`✅ Successfully switched to ${providerName}`);
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to switch provider`;
      setError(errorMessage);
      return false;
    }
  }, [service]);

  const getOptionChain = useCallback(async (symbol: string) => {
    if (!service) {
      setError('Service not initialized');
      return [];
    }

    try {
      return await service.getOptionChain(symbol);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to get option chain for ${symbol}`;
      setError(errorMessage);
      return [];
    }
  }, [service]);

  const getLTP = useCallback(async (symbol: string) => {
    if (!service) {
      setError('Service not initialized');
      return 0;
    }

    try {
      return await service.getLTP(symbol);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to get LTP for ${symbol}`;
      setError(errorMessage);
      return 0;
    }
  }, [service]);

  const retryConnection = useCallback(async () => {
    setError(null);
    if (service) {
      await service.stop();
    }
    await initializeService();
  }, [service, initializeService]);

  return {
    // Status
    isConnected,
    activeProvider,
    subscribedSymbols,
    error,
    lastUpdate,
    isInitializing,

    // Actions
    startService,
    stopService,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    switchProvider,
    retryConnection,

    // Data fetching
    getOptionChain,
    getLTP,

    // Service instance (for advanced usage)
    service
  };
}