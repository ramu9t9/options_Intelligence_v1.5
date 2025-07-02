import React from 'react';
import { TrendingUp, Coins, Clock, AlertCircle } from 'lucide-react';
import { MarketType, MARKET_INSTRUMENTS } from '../types/MarketTypes';
import { useMarketData } from '../context/MarketDataContext';
import { MarketStatus } from './MarketStatus';

interface InstrumentSelectorProps {
  marketType: MarketType;
  selectedInstruments: string[];
  onInstrumentToggle: (symbol: string) => void;
  multiSelect?: boolean;
}

export function InstrumentSelector({ 
  marketType, 
  selectedInstruments, 
  onInstrumentToggle,
  multiSelect = false 
}: InstrumentSelectorProps) {
  const { isMarketOpen, prices, dataMode } = useMarketData();

  const getInstrumentsByType = (type: MarketType) => {
    return Object.values(MARKET_INSTRUMENTS).filter(instrument => instrument.type === type);
  };

  const instruments = getInstrumentsByType(marketType);
  const primaryInstrument = selectedInstruments.length > 0 ? MARKET_INSTRUMENTS[selectedInstruments[0]] : null;

  const handleInstrumentClick = (symbol: string) => {
    if (multiSelect) {
      onInstrumentToggle(symbol);
    } else {
      // Single select - clear others and select this one
      onInstrumentToggle(symbol);
    }
  };

  const getMarketTypeColor = (type: MarketType) => {
    switch (type) {
      case 'EQUITY':
        return 'blue';
      case 'COMMODITY':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const color = getMarketTypeColor(marketType);

  // Check if market is currently open based on IST time
  const checkMarketOpen = (instrument: any) => {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    const [openHour, openMinute] = instrument.market_hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = instrument.market_hours.close.split(':').map(Number);
    
    const openTimeMinutes = openHour * 60 + openMinute;
    const closeTimeMinutes = closeHour * 60 + closeMinute;
    
    return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {marketType === 'EQUITY' ? (
              <TrendingUp className={`w-5 h-5 text-${color}-500`} />
            ) : (
              <Coins className={`w-5 h-5 text-${color}-500`} />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {marketType === 'EQUITY' ? 'Equity Instruments' : 'Commodity Instruments'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {multiSelect ? 'Select multiple instruments for comparison' : 'Choose an instrument for analysis'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Market Status Badge */}
            <MarketStatus 
              marketType={marketType} 
              dataMode={dataMode}
              instrumentName={primaryInstrument?.name}
            />
            
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedInstruments.length} Selected
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {instruments.length} Available
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Status Banner - Enhanced with dynamic status */}
      {primaryInstrument && (
        <div className={`mx-6 mt-4 p-4 rounded-lg border ${
          dataMode === 'MOCK' 
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            : checkMarketOpen(primaryInstrument)
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {dataMode === 'MOCK' ? (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              ) : (
                <Clock className={`w-5 h-5 ${
                  checkMarketOpen(primaryInstrument) ? 'text-green-600' : 'text-red-600'
                }`} />
              )}
              <div>
                <div className={`font-medium ${
                  dataMode === 'MOCK' 
                    ? 'text-orange-800 dark:text-orange-200'
                    : checkMarketOpen(primaryInstrument)
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {dataMode === 'MOCK' 
                    ? 'Historical Data Mode Active'
                    : checkMarketOpen(primaryInstrument)
                    ? `${primaryInstrument.name} Market is Open`
                    : `${primaryInstrument.name} Market is Closed`
                  }
                </div>
                <div className={`text-sm ${
                  dataMode === 'MOCK' 
                    ? 'text-orange-600 dark:text-orange-300'
                    : checkMarketOpen(primaryInstrument)
                    ? 'text-green-600 dark:text-green-300'
                    : 'text-red-600 dark:text-red-300'
                }`}>
                  {dataMode === 'MOCK' 
                    ? 'Using mock data for testing and analysis'
                    : `Trading hours: ${primaryInstrument.market_hours.open} - ${primaryInstrument.market_hours.close} IST`
                  }
                </div>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              dataMode === 'MOCK' 
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                : checkMarketOpen(primaryInstrument)
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {dataMode === 'MOCK' ? 'MOCK' : checkMarketOpen(primaryInstrument) ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {instruments.map((instrument) => {
            const isSelected = selectedInstruments.includes(instrument.symbol);
            const isOpen = checkMarketOpen(instrument);
            const currentPrice = prices[instrument.symbol] || 0; // NO FALLBACK TO SIMULATION PRICES
            
            return (
              <button
                key={instrument.symbol}
                onClick={() => handleInstrumentClick(instrument.symbol)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                  isSelected
                    ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className={`font-semibold ${
                        isSelected 
                          ? `text-${color}-700 dark:text-${color}-300`
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {instrument.name}
                      </h4>
                      <div className={`w-2 h-2 rounded-full ${
                        dataMode === 'MOCK' ? 'bg-orange-500' : isOpen ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                    
                    <p className={`text-sm mt-1 ${
                      isSelected 
                        ? `text-${color}-600 dark:text-${color}-400`
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {instrument.symbol}
                    </p>
                    
                    <div className="mt-2">
                      <div className={`text-lg font-bold ${
                        isSelected 
                          ? `text-${color}-700 dark:text-${color}-300`
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      
                      <div className={`flex items-center space-x-1 text-xs ${
                        isSelected 
                          ? `text-${color}-500 dark:text-${color}-400`
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>
                          {instrument.market_hours.open} - {instrument.market_hours.close}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className={`w-6 h-6 rounded-full bg-${color}-500 flex items-center justify-center`}>
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selection Summary */}
        {selectedInstruments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Selected for analysis:
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedInstruments.map((symbol) => {
                  const instrument = MARKET_INSTRUMENTS[symbol];
                  return (
                    <span
                      key={symbol}
                      className={`px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300`}
                    >
                      {instrument?.name || symbol}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}