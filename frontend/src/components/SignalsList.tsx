import React from 'react';
import { TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { useMarketData } from '../context/MarketDataContext';
import { formatDistanceToNow } from 'date-fns';

interface SignalsListProps {
  selectedInstruments: string[];
}

export function SignalsList({ selectedInstruments }: SignalsListProps) {
  const { signals } = useMarketData();

  // Filter signals for selected instruments
  const filteredSignals = signals.filter(signal => 
    selectedInstruments.length === 0 || selectedInstruments.includes(signal.underlying)
  );

  const getSignalIcon = (direction: string) => {
    return direction === 'BULLISH' 
      ? <TrendingUp className="w-5 h-5 text-green-500" />
      : <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  const getSignalColor = (direction: string) => {
    return direction === 'BULLISH'
      ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20'
      : 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
  };

  const getSignalTextColor = (direction: string) => {
    return direction === 'BULLISH'
      ? 'text-green-700 dark:text-green-300'
      : 'text-red-700 dark:text-red-300';
  };

  const formatSignalType = (type: string) => {
    switch (type) {
      case 'CALL_LONG_BUILDUP':
        return 'Call Long Buildup';
      case 'PUT_LONG_BUILDUP':
        return 'Put Long Buildup';
      case 'CALL_SHORT_COVER':
        return 'Call Short Covering';
      case 'PUT_SHORT_COVER':
        return 'Put Short Covering';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-500" />
          Live Signals
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {selectedInstruments.length > 0 
            ? `Signals for ${selectedInstruments.join(', ')}`
            : 'Real-time pattern detection alerts'
          }
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {selectedInstruments.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No instruments selected</p>
            <p className="text-xs mt-1">Choose instruments to view their signals</p>
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No signals detected yet</p>
            <p className="text-xs mt-1">Monitoring market for patterns...</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {filteredSignals.map((signal) => (
              <div
                key={signal.id}
                className={`border-l-4 p-4 rounded-r-lg ${getSignalColor(signal.direction)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSignalIcon(signal.direction)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {signal.underlying}
                        </span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {signal.strike}
                        </span>
                      </div>
                      <p className={`text-sm font-medium ${getSignalTextColor(signal.direction)}`}>
                        {formatSignalType(signal.type)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {signal.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {formatDistanceToNow(new Date(signal.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    signal.direction === 'BULLISH'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {signal.direction}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}