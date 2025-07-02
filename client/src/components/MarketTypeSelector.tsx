import React from 'react';
import { TrendingUp, Coins, Clock, Database, Wifi, Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { MarketType, MARKET_INSTRUMENTS } from '../types/MarketTypes';
import { useMarketData } from '../context/MarketDataContext';

interface MarketTypeSelectorProps {
  selectedMarketType: MarketType;
  onMarketTypeChange: (type: MarketType) => void;
}

export function MarketTypeSelector({ selectedMarketType, onMarketTypeChange }: MarketTypeSelectorProps) {
  const { dataMode, toggleDataMode, replayControls } = useMarketData();

  const getMarketTypeIcon = (type: MarketType) => {
    switch (type) {
      case 'EQUITY':
        return <TrendingUp className="w-5 h-5" />;
      case 'COMMODITY':
        return <Coins className="w-5 h-5" />;
      default:
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getMarketTypeInfo = (type: MarketType) => {
    switch (type) {
      case 'EQUITY':
        return {
          name: 'Equity Indices',
          description: 'Nifty, Bank Nifty & Index Options',
          hours: '09:15 AM - 03:30 PM IST',
          color: 'blue'
        };
      case 'COMMODITY':
        return {
          name: 'Commodity Futures',
          description: 'Gold, Silver, Crude Oil & Natural Gas',
          hours: '09:00 AM - 11:30 PM IST',
          color: 'yellow'
        };
      default:
        return {
          name: 'Unknown',
          description: '',
          hours: '',
          color: 'gray'
        };
    }
  };

  const marketTypes: MarketType[] = ['EQUITY', 'COMMODITY'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Market Type Selection
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Choose your market category for analysis
            </p>
          </div>

          {/* Data Mode Controls */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              dataMode === 'MOCK' 
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}>
              {dataMode === 'MOCK' ? <Database className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {dataMode === 'MOCK' ? 'Mock Data' : 'Live Data'}
              </span>
            </div>

            <button
              onClick={() => toggleDataMode()}
              className="px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Switch to {dataMode === 'MOCK' ? 'Live' : 'Mock'}
            </button>
          </div>
        </div>

        {/* Mock Mode Replay Controls */}
        {dataMode === 'MOCK' && replayControls && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Historical Replay Controls
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={replayControls.togglePlayPause}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-700 transition-colors"
                >
                  {replayControls.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span className="text-xs">{replayControls.isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                
                <button
                  onClick={replayControls.restart}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="text-xs">Restart</span>
                </button>
                
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-gray-500" />
                  <select 
                    value={replayControls.speed}
                    onChange={(e) => replayControls.setSpeed(Number(e.target.value))}
                    className="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Market Type Tabs */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {marketTypes.map((type) => {
            const info = getMarketTypeInfo(type);
            const isSelected = selectedMarketType === type;
            
            return (
              <button
                key={type}
                onClick={() => onMarketTypeChange(type)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? `border-${info.color}-500 bg-${info.color}-50 dark:bg-${info.color}-900/20`
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected 
                      ? `bg-${info.color}-100 dark:bg-${info.color}-800 text-${info.color}-600 dark:text-${info.color}-300`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {getMarketTypeIcon(type)}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      isSelected 
                        ? `text-${info.color}-700 dark:text-${info.color}-300`
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {info.name}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      isSelected 
                        ? `text-${info.color}-600 dark:text-${info.color}-400`
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {info.description}
                    </p>
                    <div className={`flex items-center space-x-1 mt-2 text-xs ${
                      isSelected 
                        ? `text-${info.color}-500 dark:text-${info.color}-400`
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{info.hours}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}