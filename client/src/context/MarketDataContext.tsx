import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MARKET_INSTRUMENTS } from '../types/MarketTypes';

export interface OptionData {
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
}

export interface Signal {
  id: string;
  timestamp: string;
  underlying: string;
  strike: number;
  type: 'CALL_LONG_BUILDUP' | 'PUT_LONG_BUILDUP' | 'CALL_SHORT_COVER' | 'PUT_SHORT_COVER';
  direction: 'BULLISH' | 'BEARISH';
  description: string;
}

export interface ReplayControls {
  isPlaying: boolean;
  speed: number;
  togglePlayPause: () => void;
  restart: () => void;
  setSpeed: (speed: number) => void;
}

interface MarketDataContextType {
  marketData: Record<string, OptionData[]>;
  signals: Signal[];
  prices: Record<string, number>;
  isConnected: boolean;
  lastUpdate: string | null;
  isDatabaseConnected: boolean;
  dataMode: 'MOCK' | 'LIVE';
  toggleDataMode: (mode?: 'MOCK' | 'LIVE') => void;
  isMarketOpen: (symbol: string) => boolean;
  replayControls: ReplayControls;
  // Legacy support for existing components
  niftyData: OptionData[];
  bankNiftyData: OptionData[];
  finniftyData: OptionData[];
  // Header component expects these specific properties
  niftyPrice: number;
  bankNiftyPrice: number;
}

const MarketDataContext = createContext<MarketDataContextType | undefined>(undefined);

export const MarketDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [marketData, setMarketData] = useState<Record<string, OptionData[]>>({});
  const [signals, setSignals] = useState<Signal[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false);
  const [dataMode, setDataMode] = useState<'MOCK' | 'LIVE'>('LIVE');
  const [replayState, setReplayState] = useState({
    isPlaying: true,
    speed: 1,
    currentTime: 0
  });

  useEffect(() => {
    // Check database status
    checkDatabaseStatus();
    
    console.log('Setting up intelligent API polling with rate limiting...');
    
    let pollInterval: NodeJS.Timeout;
    let retryTimeout: NodeJS.Timeout;
    let currentInterval = 15000; // Start with 15 seconds (conservative)
    let rateLimitBackoff = false;
    
    const fetchLiveData = async () => {
      // Don't fetch if we're in rate limit backoff
      if (rateLimitBackoff) {
        console.log('⏳ Skipping fetch - rate limit backoff active');
        return;
      }
      
      try {
        const responses = await Promise.all([
          fetch('/api/market-data/NIFTY'),
          fetch('/api/market-data/BANKNIFTY'),
          fetch('/api/market-data/FINNIFTY')
        ]);
        
        // Check for rate limiting
        const hasRateLimit = responses.some(r => r.status === 429);
        
        if (hasRateLimit) {
          console.log('⚠️ Rate limit detected - activating backoff strategy');
          rateLimitBackoff = true;
          
          // Get retry-after header (default 15 seconds)
          const retryAfter = responses.find(r => r.status === 429)?.headers.get('Retry-After');
          const backoffTime = retryAfter ? parseInt(retryAfter) * 1000 : 15000;
          
          // Clear current interval and wait
          clearInterval(pollInterval);
          
          retryTimeout = setTimeout(() => {
            rateLimitBackoff = false;
            currentInterval = Math.max(currentInterval * 1.5, 30000); // Increase to 30s minimum
            console.log(`🔄 Resuming polling with increased interval: ${currentInterval / 1000}s`);
            startPolling();
          }, backoffTime);
          
          setIsConnected(false);
          return;
        }
        
        // Process successful responses
        const data = await Promise.all(responses.map(r => r.json()));
        
        const updatedPrices: Record<string, number> = {};
        const updatedMarketData: Record<string, OptionData[]> = {};
        
        data.forEach((instrumentData: any) => {
          if (instrumentData.symbol && instrumentData.price) {
            updatedPrices[instrumentData.symbol] = instrumentData.price;
            
            // Transform option chain data for frontend
            if (instrumentData.optionChain && Array.isArray(instrumentData.optionChain) && instrumentData.optionChain.length > 0) {
              const transformedChain = instrumentData.optionChain.map((option: any) => ({
                strike: option.strike,
                callOI: option.callOI || 0,
                callOIChange: option.callOIChange || 0,
                callLTP: option.callLTP || 0,
                callLTPChange: 0,
                callVolume: option.callVolume || 0,
                putOI: option.putOI || 0,
                putOIChange: option.putOIChange || 0,
                putLTP: option.putLTP || 0,
                putLTPChange: 0,
                putVolume: option.putVolume || 0
              }));
              updatedMarketData[instrumentData.symbol] = transformedChain;
            }
          }
        });
        
        setPrices(updatedPrices);
        setMarketData(updatedMarketData);
        setLastUpdate(new Date().toISOString());
        setIsConnected(true);
        
        // Gradually reduce interval on success (but keep minimum 15s)
        if (currentInterval > 15000) {
          currentInterval = Math.max(currentInterval * 0.9, 15000);
        }
        
      } catch (error) {
        console.error('Failed to fetch live data:', error);
        setIsConnected(false);
      }
    };
    
    const startPolling = () => {
      fetchLiveData(); // Initial fetch
      pollInterval = setInterval(fetchLiveData, currentInterval);
    };
    
    startPolling();
    
    // Cleanup polling on unmount
    return () => {
      clearInterval(pollInterval);
      clearTimeout(retryTimeout);
    };
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch('/api/database/status');
      const data = await response.json();
      
      // Check if we're using MySQL (production) or SQLite (development)
      setIsDatabaseConnected(data.database || false);
      
      console.log('🗄️ Database status:', data.database ? 'MySQL Connected' : 'SQLite Active');
    } catch (error) {
      console.log('🗄️ Database check failed, using SQLite fallback');
      setIsDatabaseConnected(false);
    }
  };

  const initializeMarketData = () => {
    // Initialize data for all instruments
    const initialData: Record<string, OptionData[]> = {};
    const initialPrices: Record<string, number> = {};
    
    Object.values(MARKET_INSTRUMENTS).forEach(instrument => {
      initialData[instrument.symbol] = generateMockOptionChain(instrument.symbol);
      initialPrices[instrument.symbol] = instrument.underlying_price;
    });
    
    setMarketData(initialData);
    setPrices(initialPrices);
  };

  // SIMULATION DATA DISABLED - AUTHENTIC DATA ONLY
  const generateMockOptionChain = (symbol: string): OptionData[] => {
    console.log('❌ Mock option chain generation DISABLED - No simulation data allowed');
    return []; // Return empty array - no simulation data
  };

  const toggleDataMode = (mode?: 'MOCK' | 'LIVE') => {
    const newMode = mode || (dataMode === 'MOCK' ? 'LIVE' : 'MOCK');
    setDataMode(newMode);
    console.log(`📊 Data mode switched to: ${newMode}`);
    
    if (newMode === 'MOCK') {
      initializeMarketData();
    }
  };

  const isMarketOpen = (symbol: string): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Market hours: 9:15 AM to 3:30 PM IST
    const marketOpen = 9 * 60 + 15; // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    
    return currentTime >= marketOpen && currentTime <= marketClose;
  };

  const replayControls: ReplayControls = {
    isPlaying: replayState.isPlaying,
    speed: replayState.speed,
    togglePlayPause: () => {
      setReplayState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    },
    restart: () => {
      setReplayState(prev => ({ ...prev, currentTime: 0, isPlaying: true }));
    },
    setSpeed: (speed: number) => {
      setReplayState(prev => ({ ...prev, speed }));
    }
  };

  const contextValue: MarketDataContextType = {
    marketData,
    signals,
    prices,
    isConnected,
    lastUpdate,
    isDatabaseConnected,
    dataMode,
    toggleDataMode,
    isMarketOpen,
    replayControls,
    // Legacy support
    niftyData: marketData.NIFTY || [],
    bankNiftyData: marketData.BANKNIFTY || [],
    finniftyData: marketData.FINNIFTY || [],
    // Header component expects these specific properties
    niftyPrice: prices.NIFTY || 0,
    bankNiftyPrice: prices.BANKNIFTY || 0
  };

  return (
    <MarketDataContext.Provider value={contextValue}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData() {
  const context = useContext(MarketDataContext);
  if (context === undefined) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
}