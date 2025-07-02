import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useMarketData } from '../context/MarketDataContext';
import { MARKET_INSTRUMENTS } from '../types/MarketTypes';
import clsx from 'clsx';

interface OptionChainProps {
  underlying: string;
}

export function OptionChain({ underlying }: OptionChainProps) {
  const { marketData, prices } = useMarketData();
  const [sortBy, setSortBy] = useState<'strike' | 'callOI' | 'putOI'>('strike');
  
  const data = marketData[underlying] || [];
  const currentPrice = prices[underlying] || 0;
  const selectedInstrument = MARKET_INSTRUMENTS[underlying];

  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'strike') return a.strike - b.strike;
    if (sortBy === 'callOI') return b.callOI - a.callOI;
    if (sortBy === 'putOI') return b.putOI - a.putOI;
    return 0;
  });

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  const isATM = (strike: number) => {
    const threshold = getATMThreshold(underlying);
    return Math.abs(strike - currentPrice) < threshold;
  };

  const getATMThreshold = (symbol: string): number => {
    switch (symbol) {
      case 'NIFTY':
        return 50;
      case 'BANKNIFTY':
        return 100;
      case 'GOLD':
      case 'SILVER':
        return 100;
      case 'CRUDEOIL':
      case 'NATURALGAS':
        return 50;
      default:
        return 50;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <div className="text-lg font-medium mb-2">No option data available</div>
          <div className="text-sm">
            {selectedInstrument ? 
              `Loading ${selectedInstrument.name} option chain...` : 
              'Please select a valid instrument'
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => setSortBy('strike')}
          className={clsx(
            'px-3 py-1 rounded-md text-sm font-medium transition-colors',
            sortBy === 'strike'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
        >
          Sort by Strike
        </button>
        <button
          onClick={() => setSortBy('callOI')}
          className={clsx(
            'px-3 py-1 rounded-md text-sm font-medium transition-colors',
            sortBy === 'callOI'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
        >
          Sort by Call OI
        </button>
        <button
          onClick={() => setSortBy('putOI')}
          className={clsx(
            'px-3 py-1 rounded-md text-sm font-medium transition-colors',
            sortBy === 'putOI'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
        >
          Sort by Put OI
        </button>
      </div>

      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th colSpan={4} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">
              CALLS
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              STRIKE
            </th>
            <th colSpan={4} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">
              PUTS
            </th>
          </tr>
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">OI</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chg</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">LTP</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r dark:border-gray-600">Vol</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider font-bold">Price</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l dark:border-gray-600">Vol</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">LTP</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chg</th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">OI</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedData.map((row, index) => {
            const atmRow = isATM(row.strike);
            return (
              <tr
                key={row.strike}
                className={clsx(
                  'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                  atmRow && 'bg-yellow-50 dark:bg-yellow-900/20 font-semibold'
                )}
              >
                {/* Call Options */}
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatNumber(row.callOI)}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center space-x-1">
                    {getChangeIcon(row.callOIChange)}
                    <span className={getChangeColor(row.callOIChange)}>
                      {formatNumber(Math.abs(row.callOIChange))}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      ₹{row.callLTP.toFixed(2)}
                    </span>
                    <span className={`text-xs ${getChangeColor(row.callLTPChange)}`}>
                      {row.callLTPChange > 0 ? '+' : ''}{row.callLTPChange.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r dark:border-gray-600">
                  {formatNumber(row.callVolume)}
                </td>

                {/* Strike Price */}
                <td className={clsx(
                  "px-6 py-4 whitespace-nowrap text-sm font-bold text-center",
                  atmRow 
                    ? "text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30" 
                    : "text-gray-900 dark:text-gray-100"
                )}>
                  {row.strike}
                  {atmRow && <div className="text-xs text-yellow-600 dark:text-yellow-400">ATM</div>}
                </td>

                {/* Put Options */}
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-l dark:border-gray-600">
                  {formatNumber(row.putVolume)}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      ₹{row.putLTP.toFixed(2)}
                    </span>
                    <span className={`text-xs ${getChangeColor(row.putLTPChange)}`}>
                      {row.putLTPChange > 0 ? '+' : ''}{row.putLTPChange.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center space-x-1">
                    {getChangeIcon(row.putOIChange)}
                    <span className={getChangeColor(row.putOIChange)}>
                      {formatNumber(Math.abs(row.putOIChange))}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatNumber(row.putOI)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}