import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Using basic HTML elements for switch and input functionality
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  DollarSign, 
  BarChart3, 
  Activity, 
  Clock,
  Target,
  Shield,
  AlertTriangle,
  Bell,
  Settings,
  RefreshCw,
  Eye,
  Play,
  Pause,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  ChevronRight,
  Filter,
  Calendar,
  Users,
  PieChart,
  LineChart,
  Volume2,
  Bookmark
} from 'lucide-react';
import clsx from 'clsx';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest?: number;
  high?: number;
  low?: number;
  optionChain: OptionChainData[];
  lastRefresh?: string;
}

interface OptionChainData {
  strike: number;
  callOI: number;
  callOIChange: number;
  callLTP: number;
  callChange: number;
  putOI: number;
  putOIChange: number;
  putLTP: number;
  putChange: number;
  callVolume: number;
  putVolume: number;
}

interface SegmentConfig {
  id: string;
  name: string;
  icon: string;
  emoji: string;
  marketHours: string;
  instruments: string[];
  color: string;
  description: string;
}

const SEGMENTS: SegmentConfig[] = [
  { 
    id: 'EQUITY', 
    name: 'Equity', 
    icon: '📈', 
    emoji: '📊',
    marketHours: '09:15 - 15:30', 
    instruments: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
    color: 'from-blue-500 to-cyan-500',
    description: 'Index options and equity derivatives'
  },
  { 
    id: 'COMMODITY', 
    name: 'Commodity', 
    icon: '🛢️', 
    emoji: '⚡',
    marketHours: '09:00 - 23:30', 
    instruments: ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER'],
    color: 'from-orange-500 to-red-500',
    description: 'Energy, metals and agricultural commodities'
  },
  { 
    id: 'CURRENCY', 
    name: 'Currency', 
    icon: '💱', 
    emoji: '💰',
    marketHours: '09:00 - 17:00', 
    instruments: ['USDINR', 'EURINR', 'GBPINR', 'JPYINR'],
    color: 'from-green-500 to-emerald-500',
    description: 'Major currency pairs and cross rates'
  }
];

const COMMODITY_SPECS = {
  CRUDEOIL: { 
    lotSize: 100, 
    margin: 45000, 
    expiry: '2025-01-17', 
    unit: '100 Barrels',
    tickSize: 0.01,
    multiplier: 100,
    exchange: 'MCX'
  },
  NATURALGAS: { 
    lotSize: 1250, 
    margin: 25000, 
    expiry: '2025-01-24', 
    unit: '1250 mmBtu',
    tickSize: 0.10,
    multiplier: 1250,
    exchange: 'MCX'
  },
  GOLD: { 
    lotSize: 1, 
    margin: 35000, 
    expiry: '2025-02-05', 
    unit: '1 Kg',
    tickSize: 0.50,
    multiplier: 1000,
    exchange: 'MCX'
  },
  SILVER: { 
    lotSize: 30, 
    margin: 55000, 
    expiry: '2025-02-05', 
    unit: '30 Kg',
    tickSize: 0.50,
    multiplier: 1000,
    exchange: 'MCX'
  }
};

// Generate realistic multi-segment data
const generateMarketData = (): Record<string, MarketData> => {
  const baseTime = Date.now();
  return {
    // Equity
    NIFTY: {
      symbol: 'NIFTY',
      price: 24500 + (Math.random() - 0.5) * 1000,
      change: (Math.random() - 0.5) * 200,
      changePercent: (Math.random() - 0.5) * 2,
      volume: Math.floor(Math.random() * 100000) + 50000,
      openInterest: Math.floor(Math.random() * 500000) + 100000,
      high: 24700,
      low: 24300,
      optionChain: Array.from({length: 12}, (_, i) => ({
        strike: 24400 + (i * 100),
        callOI: Math.floor(Math.random() * 10000) + 2000,
        callOIChange: Math.floor(Math.random() * 2000) - 1000,
        callLTP: Math.random() * 200 + 50,
        callChange: (Math.random() - 0.5) * 50,
        putOI: Math.floor(Math.random() * 10000) + 2000,
        putOIChange: Math.floor(Math.random() * 2000) - 1000,
        putLTP: Math.random() * 200 + 50,
        putChange: (Math.random() - 0.5) * 50,
        callVolume: Math.floor(Math.random() * 5000),
        putVolume: Math.floor(Math.random() * 5000)
      })),
      lastRefresh: new Date().toLocaleTimeString()
    },
    BANKNIFTY: {
      symbol: 'BANKNIFTY',
      price: 52000 + (Math.random() - 0.5) * 2000,
      change: (Math.random() - 0.5) * 500,
      changePercent: (Math.random() - 0.5) * 2,
      volume: Math.floor(Math.random() * 80000) + 40000,
      openInterest: Math.floor(Math.random() * 300000) + 80000,
      high: 52500,
      low: 51500,
      optionChain: Array.from({length: 12}, (_, i) => ({
        strike: 51500 + (i * 200),
        callOI: Math.floor(Math.random() * 8000) + 1500,
        callOIChange: Math.floor(Math.random() * 1500) - 750,
        callLTP: Math.random() * 300 + 100,
        callChange: (Math.random() - 0.5) * 75,
        putOI: Math.floor(Math.random() * 8000) + 1500,
        putOIChange: Math.floor(Math.random() * 1500) - 750,
        putLTP: Math.random() * 300 + 100,
        putChange: (Math.random() - 0.5) * 75,
        callVolume: Math.floor(Math.random() * 4000),
        putVolume: Math.floor(Math.random() * 4000)
      })),
      lastRefresh: new Date().toLocaleTimeString()
    },
    FINNIFTY: {
      symbol: 'FINNIFTY',
      price: 24000 + (Math.random() - 0.5) * 800,
      change: (Math.random() - 0.5) * 150,
      changePercent: (Math.random() - 0.5) * 1.5,
      volume: Math.floor(Math.random() * 60000) + 30000,
      openInterest: Math.floor(Math.random() * 200000) + 60000,
      high: 24200,
      low: 23800,
      optionChain: Array.from({length: 12}, (_, i) => ({
        strike: 23800 + (i * 100),
        callOI: Math.floor(Math.random() * 6000) + 1000,
        callOIChange: Math.floor(Math.random() * 1000) - 500,
        callLTP: Math.random() * 150 + 30,
        callChange: (Math.random() - 0.5) * 40,
        putOI: Math.floor(Math.random() * 6000) + 1000,
        putOIChange: Math.floor(Math.random() * 1000) - 500,
        putLTP: Math.random() * 150 + 30,
        putChange: (Math.random() - 0.5) * 40,
        callVolume: Math.floor(Math.random() * 3000),
        putVolume: Math.floor(Math.random() * 3000)
      })),
      lastRefresh: new Date().toLocaleTimeString()
    },
    // Commodities
    CRUDEOIL: {
      symbol: 'CRUDEOIL',
      price: 6250 + (Math.random() - 0.5) * 200,
      change: (Math.random() - 0.5) * 100,
      changePercent: (Math.random() - 0.5) * 3,
      volume: Math.floor(Math.random() * 50000) + 10000,
      openInterest: Math.floor(Math.random() * 100000) + 25000,
      high: 6350,
      low: 6150,
      optionChain: Array.from({length: 8}, (_, i) => ({
        strike: 6200 + (i * 50),
        callOI: Math.floor(Math.random() * 5000) + 1000,
        callOIChange: Math.floor(Math.random() * 1000) - 500,
        callLTP: Math.random() * 100 + 20,
        callChange: (Math.random() - 0.5) * 25,
        putOI: Math.floor(Math.random() * 5000) + 1000,
        putOIChange: Math.floor(Math.random() * 1000) - 500,
        putLTP: Math.random() * 100 + 20,
        putChange: (Math.random() - 0.5) * 25,
        callVolume: Math.floor(Math.random() * 1000),
        putVolume: Math.floor(Math.random() * 1000)
      })),
      lastRefresh: new Date().toLocaleTimeString()
    },
    NATURALGAS: {
      symbol: 'NATURALGAS',
      price: 235 + (Math.random() - 0.5) * 20,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 4,
      volume: Math.floor(Math.random() * 75000) + 15000,
      openInterest: Math.floor(Math.random() * 150000) + 40000,
      high: 245,
      low: 225,
      optionChain: Array.from({length: 8}, (_, i) => ({
        strike: 220 + (i * 10),
        callOI: Math.floor(Math.random() * 8000) + 2000,
        callOIChange: Math.floor(Math.random() * 1500) - 750,
        callLTP: Math.random() * 15 + 5,
        callChange: (Math.random() - 0.5) * 5,
        putOI: Math.floor(Math.random() * 8000) + 2000,
        putOIChange: Math.floor(Math.random() * 1500) - 750,
        putLTP: Math.random() * 15 + 5,
        putChange: (Math.random() - 0.5) * 5,
        callVolume: Math.floor(Math.random() * 1500),
        putVolume: Math.floor(Math.random() * 1500)
      })),
      lastRefresh: new Date().toLocaleTimeString()
    },
    GOLD: {
      symbol: 'GOLD',
      price: 62500 + (Math.random() - 0.5) * 2000,
      change: (Math.random() - 0.5) * 500,
      changePercent: (Math.random() - 0.5) * 2,
      volume: Math.floor(Math.random() * 25000) + 5000,
      openInterest: Math.floor(Math.random() * 50000) + 15000,
      high: 63000,
      low: 62000,
      optionChain: Array.from({length: 8}, (_, i) => ({
        strike: 62000 + (i * 500),
        callOI: Math.floor(Math.random() * 3000) + 500,
        callOIChange: Math.floor(Math.random() * 500) - 250,
        callLTP: Math.random() * 300 + 100,
        callChange: (Math.random() - 0.5) * 75,
        putOI: Math.floor(Math.random() * 3000) + 500,
        putOIChange: Math.floor(Math.random() * 500) - 250,
        putLTP: Math.random() * 300 + 100,
        putChange: (Math.random() - 0.5) * 75,
        callVolume: Math.floor(Math.random() * 500),
        putVolume: Math.floor(Math.random() * 500)
      })),
      lastRefresh: new Date().toLocaleTimeString()
    },
    SILVER: {
      symbol: 'SILVER',
      price: 73000 + (Math.random() - 0.5) * 3000,
      change: (Math.random() - 0.5) * 800,
      changePercent: (Math.random() - 0.5) * 3,
      volume: Math.floor(Math.random() * 30000) + 8000,
      openInterest: Math.floor(Math.random() * 60000) + 20000,
      high: 74000,
      low: 72000,
      optionChain: Array.from({length: 8}, (_, i) => ({
        strike: 71000 + (i * 1000),
        callOI: Math.floor(Math.random() * 4000) + 800,
        callOIChange: Math.floor(Math.random() * 800) - 400,
        callLTP: Math.random() * 500 + 200,
        callChange: (Math.random() - 0.5) * 125,
        putOI: Math.floor(Math.random() * 4000) + 800,
        putOIChange: Math.floor(Math.random() * 800) - 400,
        putLTP: Math.random() * 500 + 200,
        putChange: (Math.random() - 0.5) * 125,
        callVolume: Math.floor(Math.random() * 600),
        putVolume: Math.floor(Math.random() * 600)
      })),
      lastRefresh: new Date().toLocaleTimeString()
    },
    // Currencies
    USDINR: {
      symbol: 'USDINR',
      price: 84.50 + (Math.random() - 0.5) * 2,
      change: (Math.random() - 0.5) * 0.5,
      changePercent: (Math.random() - 0.5) * 1,
      volume: Math.floor(Math.random() * 20000) + 5000,
      openInterest: Math.floor(Math.random() * 40000) + 10000,
      optionChain: [],
      lastRefresh: new Date().toLocaleTimeString()
    },
    EURINR: {
      symbol: 'EURINR',
      price: 88.50 + (Math.random() - 0.5) * 3,
      change: (Math.random() - 0.5) * 0.8,
      changePercent: (Math.random() - 0.5) * 1.5,
      volume: Math.floor(Math.random() * 15000) + 3000,
      openInterest: Math.floor(Math.random() * 30000) + 8000,
      optionChain: [],
      lastRefresh: new Date().toLocaleTimeString()
    },
    GBPINR: {
      symbol: 'GBPINR',
      price: 106.50 + (Math.random() - 0.5) * 4,
      change: (Math.random() - 0.5) * 1.2,
      changePercent: (Math.random() - 0.5) * 2,
      volume: Math.floor(Math.random() * 12000) + 2500,
      openInterest: Math.floor(Math.random() * 25000) + 6000,
      optionChain: [],
      lastRefresh: new Date().toLocaleTimeString()
    },
    JPYINR: {
      symbol: 'JPYINR',
      price: 0.565 + (Math.random() - 0.5) * 0.05,
      change: (Math.random() - 0.5) * 0.02,
      changePercent: (Math.random() - 0.5) * 2,
      volume: Math.floor(Math.random() * 8000) + 1500,
      openInterest: Math.floor(Math.random() * 15000) + 4000,
      optionChain: [],
      lastRefresh: new Date().toLocaleTimeString()
    }
  };
};

export default function ModernMultiSegment() {
  const [activeSegment, setActiveSegment] = useState('EQUITY');
  const [selectedInstrument, setSelectedInstrument] = useState('NIFTY');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [alertPrice, setAlertPrice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [marketData, setMarketData] = useState(() => generateMarketData());
  const [watchlist, setWatchlist] = useState<string[]>(['NIFTY', 'CRUDEOIL', 'USDINR']);

  // Fetch real equity data
  const { data: equityData } = useQuery({
    queryKey: ['/api/market-data/NIFTY'],
    refetchInterval: isLiveMode ? 3000 : false,
    enabled: activeSegment === 'EQUITY' && selectedInstrument === 'NIFTY'
  });

  const { data: bankNiftyData } = useQuery({
    queryKey: ['/api/market-data/BANKNIFTY'],
    refetchInterval: isLiveMode ? 3000 : false,
    enabled: activeSegment === 'EQUITY' && selectedInstrument === 'BANKNIFTY'
  });

  const { data: finNiftyData } = useQuery({
    queryKey: ['/api/market-data/FINNIFTY'],
    refetchInterval: isLiveMode ? 3000 : false,
    enabled: activeSegment === 'EQUITY' && selectedInstrument === 'FINNIFTY'
  });

  // Update market data with real data when available
  useEffect(() => {
    if (equityData) {
      setMarketData(prev => ({
        ...prev,
        NIFTY: { ...prev.NIFTY, ...equityData, lastRefresh: new Date().toLocaleTimeString() }
      }));
    }
    if (bankNiftyData) {
      setMarketData(prev => ({
        ...prev,
        BANKNIFTY: { ...prev.BANKNIFTY, ...bankNiftyData, lastRefresh: new Date().toLocaleTimeString() }
      }));
    }
    if (finNiftyData) {
      setMarketData(prev => ({
        ...prev,
        FINNIFTY: { ...prev.FINNIFTY, ...finNiftyData, lastRefresh: new Date().toLocaleTimeString() }
      }));
    }
  }, [equityData, bankNiftyData, finNiftyData]);

  // Simulate live updates for non-equity segments
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      setMarketData(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(symbol => {
          if (symbol !== 'NIFTY' && symbol !== 'BANKNIFTY' && symbol !== 'FINNIFTY') {
            const data = updated[symbol];
            const priceChange = (Math.random() - 0.5) * (data.price * 0.01);
            updated[symbol] = {
              ...data,
              price: Math.max(0, data.price + priceChange),
              change: data.change + priceChange,
              changePercent: ((data.change + priceChange) / (data.price - data.change)) * 100,
              lastRefresh: new Date().toLocaleTimeString()
            };
          }
        });
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isLiveMode]);

  const currentSegment = SEGMENTS.find(s => s.id === activeSegment);
  const currentInstrument = marketData[selectedInstrument];

  const formatPrice = (price: number, symbol: string): string => {
    if (symbol === 'NATURALGAS' || symbol.includes('INR')) {
      return `₹${price.toFixed(2)}`;
    }
    if (symbol === 'JPYINR') {
      return `₹${price.toFixed(4)}`;
    }
    return `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const handleSegmentChange = (segmentId: string) => {
    setActiveSegment(segmentId);
    const segment = SEGMENTS.find(s => s.id === segmentId);
    if (segment) {
      setSelectedInstrument(segment.instruments[0]);
    }
  };

  const handleCreateAlert = () => {
    if (!alertPrice || !currentInstrument) return;
    
    const price = parseFloat(alertPrice);
    if (isNaN(price)) return;

    // In a real app, this would call an API
    alert(`Alert created for ${selectedInstrument} at ₹${price}`);
    setAlertPrice('');
  };

  const handleWatchlistToggle = (symbol: string) => {
    setWatchlist(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const getATMStrike = (currentPrice: number): number => {
    if (currentPrice < 1000) {
      return Math.round(currentPrice / 10) * 10;
    } else if (currentPrice < 10000) {
      return Math.round(currentPrice / 50) * 50;
    } else {
      return Math.round(currentPrice / 100) * 100;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Modern Header */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Multi-Segment Trading Hub</h1>
                <p className="text-gray-300 text-sm">Real-time market analysis across all segments</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">LIVE</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-300 text-sm">Live Mode</span>
              <button
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isLiveMode ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isLiveMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <Button variant="outline" size="sm" className="text-gray-300 border-gray-600 hover:bg-white/10">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Segment Selection - Modern Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SEGMENTS.map((segment) => (
            <Card
              key={segment.id}
              className={clsx(
                'cursor-pointer transition-all duration-300 border-0 overflow-hidden group hover:scale-105',
                activeSegment === segment.id
                  ? `bg-gradient-to-r ${segment.color} shadow-2xl`
                  : 'bg-white/10 backdrop-blur-sm hover:bg-white/15'
              )}
              onClick={() => handleSegmentChange(segment.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={clsx(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                      activeSegment === segment.id ? 'bg-white/20' : 'bg-white/10'
                    )}>
                      {segment.emoji}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{segment.name}</h3>
                      <p className="text-xs text-white/70">{segment.description}</p>
                    </div>
                  </div>
                  <ChevronRight className={clsx(
                    'w-5 h-5 transition-transform',
                    activeSegment === segment.id ? 'text-white rotate-90' : 'text-white/50'
                  )} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Market Hours</span>
                    <span className="text-white font-medium">{segment.marketHours}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Instruments</span>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {segment.instruments.length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instrument Selection - Enhanced Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currentSegment?.instruments.map((symbol) => {
            const data = marketData[symbol];
            if (!data) return null;
            
            return (
              <Card
                key={symbol}
                className={clsx(
                  'cursor-pointer transition-all duration-300 border-0 group hover:scale-105',
                  selectedInstrument === symbol
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-2xl'
                    : 'bg-white/10 backdrop-blur-sm hover:bg-white/15'
                )}
                onClick={() => setSelectedInstrument(symbol)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{currentSegment.icon}</span>
                      <div>
                        <span className="font-bold text-white text-sm">{symbol}</span>
                        <div className="flex items-center space-x-1 mt-1">
                          <Eye className="w-3 h-3 text-white/60" />
                          <span className="text-xs text-white/60">{data.volume?.toLocaleString() || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWatchlistToggle(symbol);
                      }}
                    >
                      <Bookmark className={clsx(
                        'w-4 h-4',
                        watchlist.includes(symbol) ? 'text-yellow-400 fill-current' : 'text-white/60'
                      )} />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-white">
                      {formatPrice(data.price, symbol)}
                    </div>
                    <div className={clsx('text-sm font-medium flex items-center space-x-1', getChangeColor(data.change))}>
                      {getChangeIcon(data.change)}
                      <span>
                        {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} 
                        ({data.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                    {data.lastRefresh && (
                      <div className="text-xs text-white/50">
                        Updated: {data.lastRefresh}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Analysis Dashboard */}
        {currentInstrument && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">Overview</TabsTrigger>
                  <TabsTrigger value="options" className="data-[state=active]:bg-white/20">Options Chain</TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-white/20">Analytics</TabsTrigger>
                  <TabsTrigger value="specs" className="data-[state=active]:bg-white/20">Contract</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-white/10 backdrop-blur-sm border-0">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Target className="w-5 h-5" />
                          <span>Price Action</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <div className="text-sm font-medium text-red-400">Resistance</div>
                            <div className="text-lg font-bold text-white">
                              {formatPrice(currentInstrument.price * 1.02, selectedInstrument)}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                            <div className="text-sm font-medium text-green-400">Support</div>
                            <div className="text-lg font-bold text-white">
                              {formatPrice(currentInstrument.price * 0.98, selectedInstrument)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Day Range</span>
                            <span className="text-white font-medium">
                              {formatPrice(currentInstrument.low || currentInstrument.price * 0.99, selectedInstrument)} - 
                              {formatPrice(currentInstrument.high || currentInstrument.price * 1.01, selectedInstrument)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Volume</span>
                            <span className="text-white font-medium">{currentInstrument.volume.toLocaleString()}</span>
                          </div>
                          {currentInstrument.openInterest && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">Open Interest</span>
                              <span className="text-white font-medium">{currentInstrument.openInterest.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-sm border-0">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Activity className="w-5 h-5" />
                          <span>Market Sentiment</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Trend</span>
                            <Badge variant={currentInstrument.change > 0 ? 'default' : 'destructive'}>
                              {currentInstrument.change > 0 ? 'Bullish' : 'Bearish'}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Volatility</span>
                            <Badge variant="outline" className="text-white border-white/30">
                              {Math.abs(currentInstrument.changePercent) > 2 ? 'High' : 'Moderate'}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Volume Status</span>
                            <Badge variant="outline" className="text-white border-white/30">
                              {currentInstrument.volume > 20000 ? 'Above Average' : 'Normal'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-sm border-0">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Zap className="w-5 h-5" />
                          <span>Quick Stats</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">ATM Strike</span>
                            <span className="text-white font-medium">
                              {getATMStrike(currentInstrument.price)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">PCR</span>
                            <span className="text-white font-medium">
                              {(0.8 + Math.random() * 0.4).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Max Pain</span>
                            <span className="text-white font-medium">
                              {Math.round(currentInstrument.price / 100) * 100}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="options" className="mt-6">
                  <Card className="bg-white/10 backdrop-blur-sm border-0">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>{selectedInstrument} Options Chain</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentInstrument.optionChain && currentInstrument.optionChain.length > 0 ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-9 gap-2 text-xs font-semibold text-gray-300 mb-4 p-2 bg-white/5 rounded">
                            <div className="text-center">Call OI</div>
                            <div className="text-center">Call LTP</div>
                            <div className="text-center">Call Δ</div>
                            <div className="text-center font-bold">Strike</div>
                            <div className="text-center">Put Δ</div>
                            <div className="text-center">Put LTP</div>
                            <div className="text-center">Put OI</div>
                            <div className="text-center">Volume</div>
                            <div className="text-center">PCR</div>
                          </div>
                          
                          {currentInstrument.optionChain.slice(0, 8).map((option: OptionChainData, index: number) => {
                            const isATM = Math.abs(option.strike - currentInstrument.price) < 100;
                            return (
                              <div key={index} className={clsx(
                                'grid grid-cols-9 gap-2 text-sm py-2 px-2 rounded transition-colors',
                                isATM ? 'bg-yellow-500/20 border border-yellow-500/30' : 'hover:bg-white/5'
                              )}>
                                <div className="text-center text-blue-400">{option.callOI?.toLocaleString() || '-'}</div>
                                <div className="text-center font-medium">₹{option.callLTP?.toFixed(2) || '-'}</div>
                                <div className={clsx('text-center text-xs', getChangeColor(option.callChange))}>
                                  {option.callChange >= 0 ? '+' : ''}{option.callChange?.toFixed(1) || '-'}
                                </div>
                                <div className={clsx('text-center font-bold', isATM ? 'text-yellow-400' : 'text-white')}>
                                  {option.strike}
                                </div>
                                <div className={clsx('text-center text-xs', getChangeColor(option.putChange))}>
                                  {option.putChange >= 0 ? '+' : ''}{option.putChange?.toFixed(1) || '-'}
                                </div>
                                <div className="text-center font-medium">₹{option.putLTP?.toFixed(2) || '-'}</div>
                                <div className="text-center text-red-400">{option.putOI?.toLocaleString() || '-'}</div>
                                <div className="text-center text-gray-400">{(option.callVolume + option.putVolume)?.toLocaleString() || '-'}</div>
                                <div className="text-center text-xs">
                                  {option.putOI && option.callOI ? (option.putOI / option.callOI).toFixed(2) : '-'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                          <p>Options data not available for this instrument</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white/10 backdrop-blur-sm border-0">
                      <CardHeader>
                        <CardTitle className="text-white">Technical Indicators</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">RSI (14)</span>
                            <span className="text-white font-medium">{(30 + Math.random() * 40).toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">MACD</span>
                            <span className={clsx('font-medium', Math.random() > 0.5 ? 'text-green-400' : 'text-red-400')}>
                              {Math.random() > 0.5 ? 'Bullish' : 'Bearish'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Bollinger %B</span>
                            <span className="text-white font-medium">{(Math.random()).toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-sm border-0">
                      <CardHeader>
                        <CardTitle className="text-white">Option Greeks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Delta</span>
                            <span className="text-white font-medium">{(Math.random() * 0.8).toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Gamma</span>
                            <span className="text-white font-medium">{(Math.random() * 0.01).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Theta</span>
                            <span className="text-red-400 font-medium">-{(Math.random() * 5).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white/70">Vega</span>
                            <span className="text-white font-medium">{(Math.random() * 20).toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="specs" className="mt-6">
                  <Card className="bg-white/10 backdrop-blur-sm border-0">
                    <CardHeader>
                      <CardTitle className="text-white">Contract Specifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activeSegment === 'COMMODITY' && COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS] ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">Exchange</span>
                              <span className="text-white font-medium">{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].exchange}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">Lot Size</span>
                              <span className="text-white font-medium">{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].lotSize.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">Tick Size</span>
                              <span className="text-white font-medium">₹{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].tickSize}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">Multiplier</span>
                              <span className="text-white font-medium">{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].multiplier}</span>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">Margin Required</span>
                              <span className="text-white font-medium">₹{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].margin.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">Expiry Date</span>
                              <span className="text-white font-medium">{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].expiry}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/70">Delivery Unit</span>
                              <span className="text-white font-medium">{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].unit}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <p>Contract specifications available for commodity instruments</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Quick Trading Actions */}
              <Card className="bg-white/10 backdrop-blur-sm border-0">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Buy {selectedInstrument}
                  </Button>
                  <Button className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700">
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Sell {selectedInstrument}
                  </Button>
                  <div className="space-y-2">
                    <span className="text-white text-sm">Price Alert</span>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Enter price"
                        value={alertPrice}
                        onChange={(e) => setAlertPrice(e.target.value)}
                        className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/50 px-3 py-2 rounded text-sm"
                      />
                      <Button size="sm" onClick={handleCreateAlert} className="bg-blue-600 hover:bg-blue-700">
                        <Bell className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Watchlist */}
              <Card className="bg-white/10 backdrop-blur-sm border-0">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>Watchlist</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {watchlist.map(symbol => {
                      const data = marketData[symbol];
                      if (!data) return null;
                      return (
                        <div key={symbol} className="flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors">
                          <div>
                            <div className="text-white text-sm font-medium">{symbol}</div>
                            <div className="text-xs text-white/60">{formatPrice(data.price, symbol)}</div>
                          </div>
                          <div className={clsx('text-xs font-medium', getChangeColor(data.change))}>
                            {data.change >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Market Summary */}
              <Card className="bg-white/10 backdrop-blur-sm border-0">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Market Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Active Segment</span>
                      <Badge className={`bg-gradient-to-r ${currentSegment?.color}`}>
                        {currentSegment?.name}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Market Status</span>
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        OPEN
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Trading Hours</span>
                      <span className="text-white/90 text-xs">{currentSegment?.marketHours}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Last Update</span>
                      <span className="text-white/90 text-xs">{currentInstrument.lastRefresh || 'Live'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}