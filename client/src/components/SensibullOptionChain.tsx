import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { sensibullDataService } from '../services/SensibullDataService';

interface OptionStrike {
  strike: number;
  callOI: number;
  putOI: number;
  callLTP: number;
  putLTP: number;
  callVolume: number;
  putVolume: number;
}

interface OptionChainData {
  symbol: string;
  underlyingPrice: number;
  strikes: OptionStrike[];
  timestamp: Date;
}

interface SensibullOptionChainProps {
  symbol: string;
  className?: string;
}

export const SensibullOptionChain: React.FC<SensibullOptionChainProps> = ({ 
  symbol, 
  className = '' 
}) => {
  const [optionChain, setOptionChain] = useState<OptionChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchOptionChain = useCallback(async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📊 Fetching live option chain for ${symbol}`);
      const result = await sensibullDataService.getLiveOptionChain(symbol);
      
      setOptionChain(result.data);
      setDataSource(result.meta.source);
      setLastUpdated(new Date(result.meta.fetchedAt));
      
    } catch (err: any) {
      console.error('❌ Error fetching option chain:', err);
      setError(err.message || 'Failed to fetch option chain data');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // Initial load
  useEffect(() => {
    fetchOptionChain();
  }, [fetchOptionChain]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchOptionChain();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOptionChain]);

  const getOIChangeColor = (oi: number) => {
    if (oi > 50000) return 'bg-red-100 text-red-800';
    if (oi > 25000) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatNumber = (num: number) => {
    if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getMaxPainStrike = () => {
    if (!optionChain?.strikes) return null;
    
    const maxPain = optionChain.strikes.reduce((prev, current) => {
      const prevTotal = prev.callOI + prev.putOI;
      const currentTotal = current.callOI + current.putOI;
      return currentTotal > prevTotal ? current : prev;
    });
    
    return maxPain.strike;
  };

  const getPCR = () => {
    if (!optionChain?.strikes) return 0;
    
    const totalCallOI = optionChain.strikes.reduce((sum, strike) => sum + strike.callOI, 0);
    const totalPutOI = optionChain.strikes.reduce((sum, strike) => sum + strike.putOI, 0);
    
    return totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : '0.00';
  };

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-2">❌ Error loading option chain</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <Button onClick={fetchOptionChain} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              {symbol} Option Chain
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              {optionChain && (
                <>
                  <span>Underlying: ₹{optionChain.underlyingPrice.toFixed(2)}</span>
                  <span>PCR: {getPCR()}</span>
                  <span>Max Pain: {getMaxPainStrike()}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource && (
              <Badge variant="outline" className="text-xs">
                {dataSource.toUpperCase()}
              </Badge>
            )}
            <Button 
              onClick={fetchOptionChain} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              <Activity className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {lastUpdated && (
          <div className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        {loading && !optionChain ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading option chain...</span>
          </div>
        ) : optionChain ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CALL OI</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CALL LTP</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">STRIKE</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PUT LTP</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PUT OI</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {optionChain.strikes
                  .sort((a, b) => a.strike - b.strike)
                  .map((strike, index) => {
                    const isATM = Math.abs(strike.strike - optionChain.underlyingPrice) < 50;
                    const isITMCall = strike.strike < optionChain.underlyingPrice;
                    const isITMPut = strike.strike > optionChain.underlyingPrice;
                    
                    return (
                      <tr 
                        key={index} 
                        className={`hover:bg-gray-50 ${
                          isATM ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center">
                            <Badge 
                              variant="outline" 
                              className={`text-xs mr-2 ${getOIChangeColor(strike.callOI)}`}
                            >
                              {formatNumber(strike.callOI)}
                            </Badge>
                            {strike.callVolume > 0 && (
                              <span className="text-xs text-gray-500">
                                Vol: {formatNumber(strike.callVolume)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-3 py-2 font-medium ${
                          isITMCall ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          ₹{strike.callLTP.toFixed(2)}
                          {isITMCall && <TrendingUp className="w-3 h-3 inline ml-1" />}
                        </td>
                        <td className={`px-3 py-2 text-center font-bold ${
                          isATM ? 'text-blue-600 text-lg' : 'text-gray-900'
                        }`}>
                          {strike.strike}
                          {isATM && <span className="text-xs ml-1 text-blue-500">ATM</span>}
                        </td>
                        <td className={`px-3 py-2 font-medium text-right ${
                          isITMPut ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          ₹{strike.putLTP.toFixed(2)}
                          {isITMPut && <TrendingDown className="w-3 h-3 inline ml-1" />}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end">
                            <Badge 
                              variant="outline" 
                              className={`text-xs mr-2 ${getOIChangeColor(strike.putOI)}`}
                            >
                              {formatNumber(strike.putOI)}
                            </Badge>
                            {strike.putVolume > 0 && (
                              <span className="text-xs text-gray-500">
                                Vol: {formatNumber(strike.putVolume)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No option chain data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SensibullOptionChain;