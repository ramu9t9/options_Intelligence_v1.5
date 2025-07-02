import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useMarketData } from '../context/MarketDataContext';

export function ConnectionStatus() {
  const { isConnected } = useMarketData();

  // Only show connection status, not market status (moved to InstrumentSelector)
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center space-x-2">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                WebSocket Connected
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                Connecting to Data Feed...
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}