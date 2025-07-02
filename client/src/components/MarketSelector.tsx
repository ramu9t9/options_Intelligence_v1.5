import React, { useState } from 'react';
import { TrendingUp, Clock, Database, Wifi, WifiOff, Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { MarketType, MARKET_INSTRUMENTS, MARKET_SESSIONS } from '../types/MarketTypes';
import { useMarketData } from '../context/MarketDataContext';

interface MarketSelectorProps {
  selectedMarket: string;
  onMarketChange: (market: string) => void;
}

export function MarketSelector({ selectedMarket, onMarketChange }: MarketSelectorProps) {
  const { dataMode, toggleDataMode, isMarketOpen, replayControls } = useMarketData();
  const [showDataModeToggle, setShowDataModeToggle] = useState(false);

  const getMarketsByType = (type: MarketType) => {
    return Object.values(MARKET_INSTRUMENTS).filter(instrument => instrument.type === type);
  };

  const getCurrentMarketSession = () => {
    const instrument = MARKET_INSTRUMENTS[selectedMarket];
    if (!instrument) return null;
    return MARKET_SESSIONS[instrument.type];
  };

  const isCurrentlyOpen = (instrument: any) => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-IN', { 
      hour12: false, 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const openTime = instrument.market_hours.open;
    const closeTime = instrument.market_hours.close;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  const currentSession = getCurrentMarketSession();
  const selectedInstrument = MARKET_INSTRUMENTS[selectedMarket];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Market Selection
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Choose your trading instrument
              </p>
            </div>
          </div>
          
          {/* Data Mode Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowDataModeToggle(!showDataModeToggle)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                dataMode === 'MOCK' 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              }`}
            >
              {dataMode === 'MOCK' ? <Database className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {dataMode === 'MOCK' ? 'Mock Data' : 'Live Data'}
              </span>
            </button>
            
            {showDataModeToggle && (
              <div className="absolute right-6 top-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50 min-w-80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data Source Configuration
                  </span>
                  <button
                    onClick={() => setShowDataModeToggle(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      toggleDataMode('MOCK');
                      setShowDataModeToggle(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-md text-sm transition-colors ${
                      dataMode === 'MOCK'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">Mock Data Mode</div>
                      <div className="text-xs opacity-75">Historical replay • Available 24/7</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      toggleDataMode('LIVE');
                      setShowDataModeToggle(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-md text-sm transition-colors ${
                      dataMode === 'LIVE'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Wifi className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">Live Data Mode</div>
                      <div className="text-xs opacity-75">Real-time market data • Market hours only</div>
                    </div>
                  </button>
                </div>

                {/* Mock Mode Replay Controls */}
                {dataMode === 'MOCK' && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Replay Controls
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={replayControls?.togglePlayPause}
                        className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {replayControls?.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span className="text-xs">{replayControls?.isPlaying ? 'Pause' : 'Play'}</span>
                      </button>
                      
                      <button
                        onClick={replayControls?.restart}
                        className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="text-xs">Restart</span>
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        <Zap className="w-3 h-3 text-gray-500" />
                        <select 
                          value={replayControls?.speed || 1}
                          onChange={(e) => replayControls?.setSpeed(Number(e.target.value))}
                          className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5"
                        >
                          <option value={0.5}>0.5x</option>
                          <option value={1}>1x</option>
                          <option value={2}>2x</option>
                          <option value={5}>5x</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Market Status */}
        {selectedInstrument && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
                isCurrentlyOpen(selectedInstrument)
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                <Clock className="w-3 h-3" />
                <span>
                  {isCurrentlyOpen(selectedInstrument) ? 'Market Open' : 'Market Closed'}
                </span>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedInstrument.market_hours.open} - {selectedInstrument.market_hours.close} IST
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                ₹{selectedInstrument.underlying_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selectedInstrument.name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Market Categories */}
      <div className="p-6">
        <div className="space-y-6">
          {/* Equity Markets */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Equity Indices (9:15 AM - 3:30 PM IST)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {getMarketsByType('EQUITY').map((instrument) => (
                <button
                  key={instrument.symbol}
                  onClick={() => onMarketChange(instrument.symbol)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedMarket === instrument.symbol
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{instrument.name}</div>
                      <div className="text-xs opacity-75">{instrument.symbol}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      isCurrentlyOpen(instrument) ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Commodity Markets */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              Commodity Futures (9:00 AM - 11:30 PM IST)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {getMarketsByType('COMMODITY').map((instrument) => (
                <button
                  key={instrument.symbol}
                  onClick={() => onMarketChange(instrument.symbol)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedMarket === instrument.symbol
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{instrument.name}</div>
                      <div className="text-xs opacity-75">{instrument.symbol}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      isCurrentlyOpen(instrument) ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Mode Status */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                dataMode === 'LIVE' ? 'bg-green-500' : 'bg-orange-500'
              }`}></div>
              <span className="text-gray-600 dark:text-gray-400">
                {dataMode === 'LIVE' ? 'Live market data' : 'Historical replay mode'}
              </span>
            </div>
            
            {dataMode === 'MOCK' && replayControls && (
              <div className="text-gray-500 dark:text-gray-400">
                Speed: {replayControls.speed}x • {replayControls.isPlaying ? 'Playing' : 'Paused'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}