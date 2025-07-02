import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  optionChain: any[];
}

const SEGMENTS = [
  { id: 'EQUITY', name: 'Equity', icon: '📈', marketHours: '09:15 - 15:30', instruments: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'] },
  { id: 'COMMODITY', name: 'Commodity', icon: '🛢️', marketHours: '09:00 - 23:30', instruments: ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER'] },
  { id: 'CURRENCY', name: 'Currency', icon: '💱', marketHours: '09:00 - 17:00', instruments: ['USDINR', 'EURINR', 'GBPINR', 'JPYINR'] }
];

const COMMODITY_SPECS = {
  CRUDEOIL: { lotSize: 100, margin: 45000, expiry: '2025-01-17', unit: '100 Barrels' },
  NATURALGAS: { lotSize: 1250, margin: 25000, expiry: '2025-01-24', unit: '1250 mmBtu' },
  GOLD: { lotSize: 1, margin: 35000, expiry: '2025-02-05', unit: '1 Kg' },
  SILVER: { lotSize: 30, margin: 55000, expiry: '2025-02-05', unit: '30 Kg' }
};

// Generate realistic commodity data
const generateCommodityData = () => {
  const baseTime = Date.now();
  return {
    CRUDEOIL: {
      symbol: 'CRUDEOIL',
      price: 6250 + (Math.random() - 0.5) * 200,
      change: (Math.random() - 0.5) * 100,
      changePercent: (Math.random() - 0.5) * 3,
      volume: Math.floor(Math.random() * 50000) + 10000,
      optionChain: Array.from({length: 8}, (_, i) => ({
        strike: 6200 + (i * 50),
        callOI: Math.floor(Math.random() * 5000) + 1000,
        callLTP: Math.random() * 100 + 20,
        putOI: Math.floor(Math.random() * 5000) + 1000,
        putLTP: Math.random() * 100 + 20,
        callVolume: Math.floor(Math.random() * 1000),
        putVolume: Math.floor(Math.random() * 1000)
      }))
    },
    NATURALGAS: {
      symbol: 'NATURALGAS',
      price: 235 + (Math.random() - 0.5) * 20,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 4,
      volume: Math.floor(Math.random() * 75000) + 15000,
      optionChain: Array.from({length: 8}, (_, i) => ({
        strike: 220 + (i * 10),
        callOI: Math.floor(Math.random() * 8000) + 2000,
        callLTP: Math.random() * 15 + 5,
        putOI: Math.floor(Math.random() * 8000) + 2000,
        putLTP: Math.random() * 15 + 5,
        callVolume: Math.floor(Math.random() * 1500),
        putVolume: Math.floor(Math.random() * 1500)
      }))
    },
    GOLD: {
      symbol: 'GOLD',
      price: 62500 + (Math.random() - 0.5) * 2000,
      change: (Math.random() - 0.5) * 500,
      changePercent: (Math.random() - 0.5) * 2,
      volume: Math.floor(Math.random() * 25000) + 5000,
      optionChain: Array.from({length: 8}, (_, i) => ({
        strike: 62000 + (i * 500),
        callOI: Math.floor(Math.random() * 3000) + 500,
        callLTP: Math.random() * 300 + 100,
        putOI: Math.floor(Math.random() * 3000) + 500,
        putLTP: Math.random() * 300 + 100,
        callVolume: Math.floor(Math.random() * 500),
        putVolume: Math.floor(Math.random() * 500)
      }))
    },
    SILVER: {
      symbol: 'SILVER',
      price: 73000 + (Math.random() - 0.5) * 3000,
      change: (Math.random() - 0.5) * 800,
      changePercent: (Math.random() - 0.5) * 3,
      volume: Math.floor(Math.random() * 30000) + 8000,
      optionChain: Array.from({length: 8}, (_, i) => ({
        strike: 71000 + (i * 1000),
        callOI: Math.floor(Math.random() * 4000) + 800,
        callLTP: Math.random() * 500 + 200,
        putOI: Math.floor(Math.random() * 4000) + 800,
        putLTP: Math.random() * 500 + 200,
        callVolume: Math.floor(Math.random() * 600),
        putVolume: Math.floor(Math.random() * 600)
      }))
    }
  };
};

export default function SimplifiedMultiSegment() {
  const [activeSegment, setActiveSegment] = useState('EQUITY');
  const [selectedInstrument, setSelectedInstrument] = useState('NIFTY');

  // Fetch equity data from existing API
  const { data: equityData } = useQuery({
    queryKey: ['/api/market-data/NIFTY'],
    refetchInterval: 5000,
    enabled: activeSegment === 'EQUITY'
  });

  // Generate commodity data
  const commodityData = React.useMemo(() => generateCommodityData(), []);

  const getSegmentData = () => {
    if (activeSegment === 'EQUITY') {
      return {
        NIFTY: equityData || { symbol: 'NIFTY', price: 24500, change: 0, changePercent: 0, volume: 0, optionChain: [] },
        BANKNIFTY: { symbol: 'BANKNIFTY', price: 52000, change: 0, changePercent: 0, volume: 0, optionChain: [] },
        FINNIFTY: { symbol: 'FINNIFTY', price: 24000, change: 0, changePercent: 0, volume: 0, optionChain: [] }
      };
    } else if (activeSegment === 'COMMODITY') {
      return commodityData;
    }
    return {};
  };

  const currentSegment = SEGMENTS.find(s => s.id === activeSegment);
  const segmentData = getSegmentData();
  const currentInstrument = segmentData[selectedInstrument as keyof typeof segmentData] as MarketData;

  const formatPrice = (price: number, symbol: string) => {
    if (symbol === 'NATURALGAS') {
      return `₹${price.toFixed(2)}`;
    }
    return `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getCommodityIcon = (symbol: string) => {
    const icons = {
      CRUDEOIL: '🛢️',
      NATURALGAS: '🔥',
      GOLD: '🥇',
      SILVER: '🥈',
      NIFTY: '📈',
      BANKNIFTY: '🏦',
      FINNIFTY: '🏛️'
    };
    return icons[symbol as keyof typeof icons] || '📊';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Multi-Segment Trading Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Professional trading across equity, commodity, and currency markets
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Market Hours: {currentSegment?.marketHours}</span>
          </div>
        </div>

        {/* Segment Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SEGMENTS.map((segment) => (
            <Card
              key={segment.id}
              className={clsx(
                'cursor-pointer transition-all hover:shadow-md',
                activeSegment === segment.id && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
              )}
              onClick={() => {
                setActiveSegment(segment.id);
                setSelectedInstrument(segment.instruments[0]);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{segment.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{segment.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{segment.marketHours}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge variant={activeSegment === segment.id ? 'default' : 'outline'}>
                    {segment.instruments.length} Instruments
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instrument Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currentSegment?.instruments.map((symbol) => {
            const data = segmentData[symbol as keyof typeof segmentData] as MarketData;
            if (!data) return null;
            
            return (
              <Card
                key={symbol}
                className={clsx(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedInstrument === symbol && 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20'
                )}
                onClick={() => setSelectedInstrument(symbol)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">{getCommodityIcon(symbol)}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{symbol}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatPrice(data.price, symbol)}
                  </div>
                  <div className={clsx('text-sm font-medium', getChangeColor(data.change))}>
                    {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} 
                    ({data.changePercent.toFixed(2)}%)
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Instrument Analysis */}
        {currentInstrument && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs defaultValue="analysis" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
                  <TabsTrigger value="options">Options Chain</TabsTrigger>
                  <TabsTrigger value="specs">Contract Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="analysis" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>{selectedInstrument} Technical Analysis</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <Target className="w-5 h-5 text-red-600 mx-auto mb-2" />
                          <div className="text-sm font-medium text-red-600">Resistance</div>
                          <div className="text-lg font-bold">
                            {formatPrice(currentInstrument.price * 1.02, selectedInstrument)}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <Activity className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                          <div className="text-sm font-medium text-gray-600">Current</div>
                          <div className="text-lg font-bold">
                            {formatPrice(currentInstrument.price, selectedInstrument)}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Shield className="w-5 h-5 text-green-600 mx-auto mb-2" />
                          <div className="text-sm font-medium text-green-600">Support</div>
                          <div className="text-lg font-bold">
                            {formatPrice(currentInstrument.price * 0.98, selectedInstrument)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Trend Direction</span>
                          <Badge variant={currentInstrument.change > 0 ? 'default' : 'destructive'}>
                            {currentInstrument.change > 0 ? 'Bullish' : 'Bearish'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Volatility</span>
                          <Badge variant="outline">
                            {Math.abs(currentInstrument.changePercent) > 2 ? 'High' : 'Moderate'}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Volume Status</span>
                          <Badge variant="outline">
                            {currentInstrument.volume > 20000 ? 'Above Average' : 'Normal'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="options" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>{selectedInstrument} Options Chain</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {currentInstrument.optionChain && currentInstrument.optionChain.length > 0 ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                            <div>Strike</div>
                            <div className="text-right">Call OI</div>
                            <div className="text-right">Call LTP</div>
                            <div className="text-center">Strike</div>
                            <div className="text-right">Put LTP</div>
                            <div className="text-right">Put OI</div>
                            <div className="text-right">Volume</div>
                          </div>
                          
                          {currentInstrument.optionChain.slice(0, 6).map((option: any, index: number) => (
                            <div key={index} className="grid grid-cols-7 gap-2 text-sm py-1 border-b border-gray-100 dark:border-gray-700">
                              <div className="font-medium">{option.strike}</div>
                              <div className="text-right">{option.callOI?.toLocaleString('en-IN') || '-'}</div>
                              <div className="text-right">₹{option.callLTP?.toFixed(2) || '-'}</div>
                              <div className="text-center font-bold">{option.strike}</div>
                              <div className="text-right">₹{option.putLTP?.toFixed(2) || '-'}</div>
                              <div className="text-right">{option.putOI?.toLocaleString('en-IN') || '-'}</div>
                              <div className="text-right">{(option.callVolume + option.putVolume)?.toLocaleString('en-IN') || '-'}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                          <p>Options data loading...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="specs" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contract Specifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activeSegment === 'COMMODITY' && COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS] ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm text-gray-500">Lot Size</span>
                              <div className="font-medium">{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].lotSize.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Margin Required</span>
                              <div className="font-medium">₹{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].margin.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Expiry Date</span>
                              <div className="font-medium">{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].expiry}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Delivery Unit</span>
                              <div className="font-medium">{COMMODITY_SPECS[selectedInstrument as keyof typeof COMMODITY_SPECS].unit}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <p>Contract specifications available for commodity segments</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="default">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Buy {selectedInstrument}
                  </Button>
                  <Button className="w-full" variant="outline">
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Sell {selectedInstrument}
                  </Button>
                  <Button className="w-full" variant="outline">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Set Price Alert
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Market Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Active Segment</span>
                      <Badge>{currentSegment?.name}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Status</span>
                      <Badge variant="outline">OPEN</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Trading Hours</span>
                      <span className="text-gray-500">{currentSegment?.marketHours}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume</span>
                      <span className="font-medium">{currentInstrument.volume.toLocaleString('en-IN')}</span>
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