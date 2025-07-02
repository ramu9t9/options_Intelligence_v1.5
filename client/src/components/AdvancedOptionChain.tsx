import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Eye, EyeOff } from 'lucide-react';
import { useMarketData } from '../context/MarketDataContext';

interface OptionChainProps {
  underlying: string;
  showOnlyATM?: boolean;
  maxStrikes?: number;
}

interface OptionRow {
  strike: number;
  call: {
    oi: number;
    oiChange: number;
    ltp: number;
    ltpChange: number;
    volume: number;
    iv?: number;
  };
  put: {
    oi: number;
    oiChange: number;
    ltp: number;
    ltpChange: number;
    volume: number;
    iv?: number;
  };
  isATM: boolean;
  totalOI: number;
  pcr: number;
}

export function AdvancedOptionChain({ underlying, showOnlyATM = false, maxStrikes = 20 }: OptionChainProps) {
  const { marketData, prices, signals } = useMarketData();
  const [sortBy, setSortBy] = useState<'strike' | 'callOI' | 'putOI' | 'totalOI'>('strike');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [minOI, setMinOI] = useState(0);
  const [showSignals, setShowSignals] = useState(true);

  const currentPrice = prices[underlying] || 0;
  const optionData = marketData[underlying] || [];

  // Transform data into option chain format
  const optionChain = useMemo(() => {
    const strikeMap = new Map<number, OptionRow>();

    optionData.forEach(option => {
      const strike = option.strike;
      const isATM = Math.abs(strike - currentPrice) === 
        Math.min(...optionData.map(opt => Math.abs(opt.strike - currentPrice)));

      if (!strikeMap.has(strike)) {
        strikeMap.set(strike, {
          strike,
          call: { oi: 0, oiChange: 0, ltp: 0, ltpChange: 0, volume: 0 },
          put: { oi: 0, oiChange: 0, ltp: 0, ltpChange: 0, volume: 0 },
          isATM,
          totalOI: 0,
          pcr: 0
        });
      }

      const row = strikeMap.get(strike)!;
      
      // Assign call/put data based on option type or position
      if (option.callOI > 0) {
        row.call = {
          oi: option.callOI,
          oiChange: option.callOIChange,
          ltp: option.callLTP,
          ltpChange: option.callLTPChange,
          volume: option.callVolume
        };
      }
      
      if (option.putOI > 0) {
        row.put = {
          oi: option.putOI,
          oiChange: option.putOIChange,
          ltp: option.putLTP,
          ltpChange: option.putLTPChange,
          volume: option.putVolume
        };
      }

      row.totalOI = row.call.oi + row.put.oi;
      row.pcr = row.call.oi > 0 ? row.put.oi / row.call.oi : 0;
    });

    let chains = Array.from(strikeMap.values());

    // Apply filters
    if (showOnlyATM) {
      const atmStrike = chains.find(c => c.isATM)?.strike || currentPrice;
      chains = chains.filter(c => Math.abs(c.strike - atmStrike) / atmStrike <= 0.1);
    }

    if (minOI > 0) {
      chains = chains.filter(c => c.totalOI >= minOI);
    }

    // Sort data
    chains.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case 'callOI':
          aVal = a.call.oi;
          bVal = b.call.oi;
          break;
        case 'putOI':
          aVal = a.put.oi;
          bVal = b.put.oi;
          break;
        case 'totalOI':
          aVal = a.totalOI;
          bVal = b.totalOI;
          break;
        default:
          aVal = a.strike;
          bVal = b.strike;
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return chains.slice(0, maxStrikes);
  }, [optionData, currentPrice, sortBy, sortOrder, showOnlyATM, minOI, maxStrikes]);

  // Get signals for this underlying
  const relevantSignals = signals.filter(signal => 
    signal.underlying === underlying && showSignals
  );

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSignalForStrike = (strike: number) => {
    return relevantSignals.find(signal => signal.strike === strike);
  };

  const formatNumber = (num: number, decimals = 0) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(decimals);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getOIIntensity = (oi: number, maxOI: number) => {
    const intensity = maxOI > 0 ? (oi / maxOI) * 100 : 0;
    if (intensity > 80) return 'bg-red-100 dark:bg-red-900/20';
    if (intensity > 60) return 'bg-orange-100 dark:bg-orange-900/20';
    if (intensity > 40) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (intensity > 20) return 'bg-blue-100 dark:bg-blue-900/20';
    return '';
  };

  const maxCallOI = Math.max(...optionChain.map(row => row.call.oi));
  const maxPutOI = Math.max(...optionChain.map(row => row.put.oi));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {underlying} Option Chain
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Spot: ₹{currentPrice.toFixed(2)} | Strikes: {optionChain.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSignals(!showSignals)}
              className={`px-3 py-1 rounded text-sm ${
                showSignals 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {showSignals ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Filters
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Min OI:</span>
                <input
                  type="number"
                  value={minOI}
                  onChange={(e) => setMinOI(Number(e.target.value))}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  placeholder="0"
                />
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showOnlyATM}
                  onChange={(e) => setShowFilters(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">ATM Only</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Option Chain Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {/* Call Side Headers */}
              <th 
                onClick={() => handleSort('callOI')}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Call OI {sortBy === 'callOI' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                OI Chg
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                LTP
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Chg%
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Vol
              </th>
              
              {/* Strike */}
              <th 
                onClick={() => handleSort('strike')}
                className="px-4 py-2 text-center text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 bg-blue-50 dark:bg-blue-900/20"
              >
                Strike {sortBy === 'strike' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              
              {/* Put Side Headers */}
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Vol
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Chg%
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                LTP
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                OI Chg
              </th>
              <th 
                onClick={() => handleSort('putOI')}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Put OI {sortBy === 'putOI' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {optionChain.map((row, index) => {
              const signal = getSignalForStrike(row.strike);
              const isATMRow = row.isATM;
              
              return (
                <tr 
                  key={row.strike}
                  className={`
                    ${isATMRow ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'}
                    ${signal ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
                    hover:bg-gray-50 dark:hover:bg-gray-700
                  `}
                >
                  {/* Call Side */}
                  <td className={`px-3 py-2 text-sm font-medium ${getOIIntensity(row.call.oi, maxCallOI)}`}>
                    {formatNumber(row.call.oi)}
                  </td>
                  <td className={`px-3 py-2 text-sm ${getChangeColor(row.call.oiChange)}`}>
                    {row.call.oiChange > 0 ? '+' : ''}{formatNumber(row.call.oiChange)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                    ₹{row.call.ltp.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 text-sm ${getChangeColor(row.call.ltpChange)}`}>
                    {row.call.ltpChange > 0 ? '+' : ''}{row.call.ltpChange.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {formatNumber(row.call.volume)}
                  </td>
                  
                  {/* Strike Price */}
                  <td className={`px-4 py-2 text-center font-semibold ${
                    isATMRow 
                      ? 'text-blue-900 dark:text-blue-100 bg-blue-100 dark:bg-blue-900/30' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    <div className="flex items-center justify-center space-x-1">
                      <span>{row.strike}</span>
                      {signal && (
                        <div className="flex items-center space-x-1">
                          {signal.direction === 'BULLISH' ? (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          ) : signal.direction === 'BEARISH' ? (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-yellow-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Put Side */}
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {formatNumber(row.put.volume)}
                  </td>
                  <td className={`px-3 py-2 text-sm ${getChangeColor(row.put.ltpChange)}`}>
                    {row.put.ltpChange > 0 ? '+' : ''}{row.put.ltpChange.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                    ₹{row.put.ltp.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 text-sm ${getChangeColor(row.put.oiChange)}`}>
                    {row.put.oiChange > 0 ? '+' : ''}{formatNumber(row.put.oiChange)}
                  </td>
                  <td className={`px-3 py-2 text-sm font-medium ${getOIIntensity(row.put.oi, maxPutOI)}`}>
                    {formatNumber(row.put.oi)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Call OI:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatNumber(optionChain.reduce((sum, row) => sum + row.call.oi, 0))}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Put OI:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatNumber(optionChain.reduce((sum, row) => sum + row.put.oi, 0))}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">PCR:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {(optionChain.reduce((sum, row) => sum + row.put.oi, 0) / 
                optionChain.reduce((sum, row) => sum + row.call.oi, 0)).toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Active Signals:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {relevantSignals.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}