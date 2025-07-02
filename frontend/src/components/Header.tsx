import React from 'react';
import { TrendingUp, Moon, Sun, Database, Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useMarketData } from '../context/MarketDataContext';
import { AlertCenter } from './AlertCenter';
import { DataProviderSettings } from './DataProviderSettings';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { niftyPrice, bankNiftyPrice, lastUpdate, isDatabaseConnected } = useMarketData();

  const handleSetupClick = () => {
    window.location.hash = 'setup';
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Options Intelligence
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Real-time Market Data & Analysis
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Database Status Indicator */}
            <div className="flex items-center space-x-2">
              <Database className={`w-4 h-4 ${
                isDatabaseConnected 
                  ? 'text-green-500' 
                  : 'text-blue-400'
              }`} />
              <span className={`text-xs font-medium ${
                isDatabaseConnected
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-blue-500 dark:text-blue-400'
              }`}>
                {isDatabaseConnected ? 'MySQL Connected' : 'SQLite Active'}
              </span>
            </div>

            {/* Live Prices */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">NIFTY 50</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  ₹{niftyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">BANK NIFTY</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  ₹{bankNiftyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Setup Button */}
            <button
              onClick={handleSetupClick}
              className="p-2 rounded-lg bg-blue-100 dark:bg-blue-700 hover:bg-blue-200 dark:hover:bg-blue-600 transition-colors"
              aria-label="Provider Setup"
              title="Setup Data Providers"
            >
              <SettingsIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </button>

            {/* Data Provider Settings */}
            <DataProviderSettings />

            {/* Alert Center */}
            <AlertCenter />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-500" />
              )}
            </button>
          </div>
        </div>

        {lastUpdate && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        )}
      </div>
    </header>
  );
}