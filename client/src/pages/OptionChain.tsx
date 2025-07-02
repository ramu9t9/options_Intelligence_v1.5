import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { OptionChainTable } from '@/components/OptionChainTable';
import { ExpiryDropdown } from '@/components/ExpiryDropdown';
import { OptionChainSkeleton } from '@/components/OptionChainSkeleton';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface OptionChainData {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  optionChain: Array<{
    strike: number;
    callOI: number;
    callOIChange: number;
    callLTP: number;
    callVolume: number;
    putOI: number;
    putOIChange: number;
    putLTP: number;
    putVolume: number;
  }>;
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export function OptionChain() {
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [strikeFilter, setStrikeFilter] = useState<'all' | 'atm' | 'atm-5'>('atm-5');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Available symbols and expiries (would come from API in real implementation)
  const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
  const expiries = ['01-JUL-2025', '08-JUL-2025', '15-JUL-2025', '22-JUL-2025', '29-JUL-2025'];

  // Set default expiry if none selected
  React.useEffect(() => {
    if (!selectedExpiry && expiries.length > 0) {
      setSelectedExpiry(expiries[0]);
    }
  }, [selectedExpiry, expiries]);

  // Fetch market data for the header
  const { data: marketData } = useQuery<MarketData[]>({
    queryKey: ['/api/market-data'],
    refetchInterval: 3000,
  });

  // Fetch option chain data
  const { data: optionChainData, isLoading, refetch } = useQuery<OptionChainData>({
    queryKey: ['/api/option-chain', selectedSymbol, selectedExpiry],
    enabled: !!selectedSymbol && !!selectedExpiry,
    refetchInterval: 5000,
  });

  // Generate mock option chain data for demonstration
  const mockOptionChain = useMemo(() => {
    if (!selectedSymbol) return [];
    
    const currentMarket = marketData?.find(m => m.symbol === selectedSymbol);
    const basePrice = currentMarket?.price || (selectedSymbol === 'NIFTY' ? 24700 : selectedSymbol === 'BANKNIFTY' ? 52800 : 23400);
    const atmStrike = Math.round(basePrice / 100) * 100;
    
    const strikes = [];
    for (let i = -10; i <= 10; i++) {
      const strike = atmStrike + (i * 100);
      strikes.push({
        strike,
        ceLtp: Math.max(0.05, Math.random() * 300 + (i <= 0 ? Math.abs(basePrice - strike) * 0.6 : 5)),
        ceOi: Math.floor(Math.random() * 500000) + 50000,
        ceDeltaOi: Math.floor((Math.random() - 0.5) * 100000),
        peLtp: Math.max(0.05, Math.random() * 300 + (i >= 0 ? Math.abs(strike - basePrice) * 0.6 : 5)),
        peOi: Math.floor(Math.random() * 500000) + 50000,
        peDeltaOi: Math.floor((Math.random() - 0.5) * 100000),
        ceVolume: Math.floor(Math.random() * 100000),
        peVolume: Math.floor(Math.random() * 100000),
      });
    }
    return strikes;
  }, [selectedSymbol, marketData]);

  // Filter strikes based on selected filter
  const filteredStrikes = useMemo(() => {
    if (!mockOptionChain.length) return [];
    
    const currentMarket = marketData?.find(m => m.symbol === selectedSymbol);
    const basePrice = currentMarket?.price || 24700;
    const atmStrike = Math.round(basePrice / 100) * 100;

    switch (strikeFilter) {
      case 'atm':
        return mockOptionChain.filter(strike => strike.strike === atmStrike);
      case 'atm-5':
        return mockOptionChain.filter(strike => 
          Math.abs(strike.strike - atmStrike) <= 500
        );
      case 'all':
      default:
        return mockOptionChain;
    }
  }, [mockOptionChain, strikeFilter, selectedSymbol, marketData]);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    refetch();
  };

  const currentMarket = marketData?.find(m => m.symbol === selectedSymbol);
  const atmStrike = currentMarket ? Math.round(currentMarket.price / 100) * 100 : undefined;

  const formatChange = (change: number, changePercent: number) => {
    const isPositive = change >= 0;
    const icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        {React.createElement(icon, { className: 'h-4 w-4' })}
        <span className="font-medium">
          {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Option Chain</h1>
            <p className="text-slate-300">
              Real-time option chain analysis with OI visualization
            </p>
          </div>

          {/* Symbol Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">Symbol:</span>
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol} data-testid="symbol-select">
              <SelectTrigger className="w-[120px] bg-black/20 border-white/10 text-white" data-testid="symbol-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10" data-testid="symbol-select-content">
                {symbols.map((symbol) => (
                  <SelectItem key={symbol} value={symbol} className="text-white hover:bg-white/10" data-testid={`symbol-option-${symbol}`}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Market Summary Card */}
        {currentMarket && (
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10 mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white">{currentMarket.symbol}</h2>
                    <Badge variant="default" className="bg-green-400/20 text-green-400 border-green-400/30">
                      Live
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-white">
                    ₹{currentMarket.price.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-2">
                  {formatChange(currentMarket.change, currentMarket.changePercent)}
                  <div className="text-sm text-slate-400">
                    Volume: {currentMarket.volume.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">
                    ATM Strike: {atmStrike}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Option Chain Table */}
        <Card className="bg-black/20 backdrop-blur-sm border border-white/10" data-testid="option-chain-card">
          <CardHeader className="pb-0">
            <CardTitle className="text-white" data-testid="option-chain-title">Option Chain Data</CardTitle>
          </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <ExpiryDropdown
            expiries={expiries}
            selectedExpiry={selectedExpiry}
            onExpiryChange={setSelectedExpiry}
            strikeFilter={strikeFilter}
            onStrikeFilterChange={setStrikeFilter}
            onRefresh={handleRefresh}
            lastUpdated={lastRefresh}
            loading={isLoading}
            data-testid="expiry-dropdown"
          />

          {/* Table Content */}
          <div className="p-4">
            {isLoading ? (
              <OptionChainSkeleton />
            ) : filteredStrikes.length > 0 ? (
              <OptionChainTable 
                data={filteredStrikes} 
                loading={isLoading}
                atmStrike={atmStrike}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Option Data Available</h3>
                <p>Select a symbol and expiry to view option chain data</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Call OI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {filteredStrikes.reduce((sum, strike) => sum + strike.ceOi, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Put OI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {filteredStrikes.reduce((sum, strike) => sum + strike.peOi, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">PCR (Put-Call Ratio)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {(() => {
                  const totalCallOI = filteredStrikes.reduce((sum, strike) => sum + strike.ceOi, 0);
                  const totalPutOI = filteredStrikes.reduce((sum, strike) => sum + strike.peOi, 0);
                  return totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : '0.00';
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}