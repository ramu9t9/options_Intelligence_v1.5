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
  BarChart3, 
  Activity, 
  DollarSign,
  Clock,
  AlertTriangle,
  Target,
  Shield
} from 'lucide-react';
import clsx from 'clsx';

interface CommodityData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  optionChain: any[];
  lastRefresh: string;
}

interface ContractSpecification {
  lotSize: number;
  tickSize: number;
  marginRequired: number;
  expiryDate: string;
  deliveryUnit: string;
}

const commoditySpecs: Record<string, ContractSpecification> = {
  CRUDEOIL: {
    lotSize: 100,
    tickSize: 0.01,
    marginRequired: 45000,
    expiryDate: '2025-01-17',
    deliveryUnit: '100 Barrels'
  },
  NATURALGAS: {
    lotSize: 1250,
    tickSize: 0.01,
    marginRequired: 25000,
    expiryDate: '2025-01-24',
    deliveryUnit: '1250 mmBtu'
  },
  GOLD: {
    lotSize: 1,
    tickSize: 1,
    marginRequired: 35000,
    expiryDate: '2025-02-05',
    deliveryUnit: '1 Kg'
  },
  SILVER: {
    lotSize: 30,
    tickSize: 1,
    marginRequired: 55000,
    expiryDate: '2025-02-05',
    deliveryUnit: '30 Kg'
  }
};

export default function CommodityAnalytics() {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('CRUDEOIL');

  const { data: commodityData, isLoading } = useQuery({
    queryKey: ['/api/segments/COMMODITY/data'],
    refetchInterval: 5000,
  });

  const commodities = commodityData?.instruments || {};
  const selectedData = commodities[selectedCommodity] as CommodityData;
  const contractSpec = commoditySpecs[selectedCommodity];

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

  const calculateProfitLoss = (entryPrice: number, currentPrice: number, quantity: number) => {
    const pnl = (currentPrice - entryPrice) * quantity;
    return {
      value: pnl,
      percentage: ((currentPrice - entryPrice) / entryPrice) * 100
    };
  };

  const getCommodityIcon = (symbol: string) => {
    switch (symbol) {
      case 'CRUDEOIL': return '🛢️';
      case 'NATURALGAS': return '🔥';
      case 'GOLD': return '🥇';
      case 'SILVER': return '🥈';
      default: return '📊';
    }
  };

  const renderTechnicalAnalysis = () => {
    if (!selectedData) return null;

    const currentPrice = selectedData.price;
    const change = selectedData.change;
    
    // Mock technical levels based on current price
    const resistance = currentPrice + (Math.abs(change) * 2);
    const support = currentPrice - (Math.abs(change) * 2);
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">Resistance</span>
              </div>
              <div className="text-lg font-bold text-red-400">
                {formatPrice(resistance, selectedCommodity)}
              </div>
              <div className="text-xs text-slate-400">
                +{((resistance - currentPrice) / currentPrice * 100).toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">Current</span>
              </div>
              <div className="text-lg font-bold text-white">
                {formatPrice(currentPrice, selectedCommodity)}
              </div>
              <div className={clsx('text-xs', getChangeColor(change))}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)} ({selectedData.changePercent.toFixed(2)}%)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-slate-300">Support</span>
              </div>
              <div className="text-lg font-bold text-green-400">
                {formatPrice(support, selectedCommodity)}
              </div>
              <div className="text-xs text-slate-400">
                {((support - currentPrice) / currentPrice * 100).toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">Price Action Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Trend Direction</span>
              <Badge variant={change > 0 ? 'default' : 'destructive'}>
                {change > 0 ? 'Bullish' : 'Bearish'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Volatility</span>
              <Badge variant="outline">
                {Math.abs(selectedData.changePercent) > 2 ? 'High' : 'Moderate'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Volume Status</span>
              <Badge variant="outline">
                {selectedData.volume > 5000 ? 'Above Average' : 'Below Average'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContractDetails = () => {
    if (!contractSpec || !selectedData) return null;

    const notionalValue = selectedData.price * contractSpec.lotSize;
    const leverageRatio = notionalValue / contractSpec.marginRequired;

    return (
      <div className="space-y-4">
        <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">Contract Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Lot Size</span>
                <div className="font-medium">{contractSpec.lotSize.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Tick Size</span>
                <div className="font-medium">₹{contractSpec.tickSize}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Margin Required</span>
                <div className="font-medium">₹{contractSpec.marginRequired.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Delivery Unit</span>
                <div className="font-medium">{contractSpec.deliveryUnit}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-sm">Position Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Notional Value</span>
                <div className="font-medium">₹{notionalValue.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Leverage</span>
                <div className="font-medium">{leverageRatio.toFixed(1)}x</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Expiry Date</span>
                <div className="font-medium">{contractSpec.expiryDate}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Days to Expiry</span>
                <div className="font-medium">
                  {Math.ceil((new Date(contractSpec.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading commodity data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Commodity Analytics
            </h1>
            <p className="text-slate-300 mt-1">
              Advanced commodity trading analysis and insights
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-300">
            <Clock className="w-4 h-4" />
            <span>Market Hours: 09:00 - 23:30 IST</span>
          </div>
        </div>

        {/* Commodity Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(commodities).map(([symbol, data]) => {
            const commodity = data as CommodityData;
            const isSelected = selectedCommodity === symbol;
            
            return (
              <Card
                key={symbol}
                className={clsx(
                  'cursor-pointer transition-all hover:shadow-md bg-black/20 backdrop-blur-sm border border-white/10',
                  isSelected && 'ring-2 ring-blue-500 bg-blue-900/20'
                )}
                onClick={() => setSelectedCommodity(symbol)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">{getCommodityIcon(symbol)}</span>
                    <span className="font-semibold text-white">
                      {symbol}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {formatPrice(commodity.price, symbol)}
                  </div>
                  <div className={clsx('text-sm font-medium', getChangeColor(commodity.change))}>
                    {commodity.change >= 0 ? '+' : ''}{commodity.change.toFixed(2)} 
                    ({commodity.changePercent.toFixed(2)}%)
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Selected Commodity Analysis */}
        {selectedData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs defaultValue="technical" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 backdrop-blur-sm">
                  <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
                  <TabsTrigger value="options">Options Chain</TabsTrigger>
                  <TabsTrigger value="alerts">Price Alerts</TabsTrigger>
                </TabsList>
                
                <TabsContent value="technical" className="mt-4">
                  {renderTechnicalAnalysis()}
                </TabsContent>
                
                <TabsContent value="options" className="mt-4">
                  <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>{selectedCommodity} Options Chain</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedData.optionChain && selectedData.optionChain.length > 0 ? (
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
                          
                          {selectedData.optionChain.slice(0, 8).map((option: any, index: number) => (
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
                          <p>Options data not available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="alerts" className="mt-4">
                  <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Price Alerts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <DollarSign className="w-8 h-8 mx-auto mb-2" />
                        <p>Price alerts feature coming soon</p>
                        <p className="text-sm mt-1">Set custom alerts for commodity price movements</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              {renderContractDetails()}
              
              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="default">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Buy {selectedCommodity}
                  </Button>
                  <Button className="w-full" variant="outline">
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Sell {selectedCommodity}
                  </Button>
                  <Button className="w-full" variant="outline">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Set Price Alert
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}