import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Activity, Users, DollarSign, BarChart3, Settings, Bell, Search } from 'lucide-react';
import { AdvancedOptionChain } from '../components/AdvancedOptionChain';
import { useMarketData } from '../context/MarketDataContext';

interface DashboardProps {
  userRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}

export function Dashboard({ userRole }: DashboardProps) {
  const { marketData, prices, signals, isConnected, subscriptions } = useMarketData();
  const [selectedInstrument, setSelectedInstrument] = useState('NIFTY');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const instruments = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'GOLD', 'SILVER', 'CRUDEOIL'];
  
  const filteredInstruments = instruments.filter(instrument =>
    instrument.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentPrice = prices[selectedInstrument] || 0;
  const instrumentSignals = signals.filter(signal => signal.underlying === selectedInstrument);
  const totalSignals = signals.length;
  
  const stats = {
    activeInstruments: instruments.length,
    totalSignals,
    bullishSignals: signals.filter(s => s.direction === 'BULLISH').length,
    bearishSignals: signals.filter(s => s.direction === 'BEARISH').length,
    averageConfidence: signals.length > 0 
      ? (signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length * 100).toFixed(1)
      : '0.0'
  };

  const getConnectionStatusColor = () => {
    if (isConnected) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSignalDirection = (direction: string) => {
    switch (direction) {
      case 'BULLISH':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'BEARISH':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Options Intelligence
              </h1>
              <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
                <div className="w-2 h-2 rounded-full bg-current"></div>
                <span className="text-sm font-medium">
                  {isConnected ? 'Live Data' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search instruments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <Bell className="w-5 h-5" />
              </button>
              
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Instruments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeInstruments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Signals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSignals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bullish Signals</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.bullishSignals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bearish Signals</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.bearishSignals}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Instrument Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Instruments</h3>
              </div>
              <div className="p-4 space-y-2">
                {filteredInstruments.map((instrument) => {
                  const price = prices[instrument] || 0;
                  const isSelected = selectedInstrument === instrument;
                  
                  return (
                    <button
                      key={instrument}
                      onClick={() => setSelectedInstrument(instrument)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{instrument}</span>
                        <span className="text-sm">{formatPrice(price)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Signals */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mt-6">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Signals</h3>
              </div>
              <div className="p-4 space-y-3">
                {instrumentSignals.slice(0, 5).map((signal, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center space-x-2">
                      {getSignalDirection(signal.direction)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {signal.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {(signal.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
                
                {instrumentSignals.length === 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                    No signals detected for {selectedInstrument}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'option-chain', label: 'Option Chain' },
                    { id: 'patterns', label: 'Pattern Analysis' },
                    { id: 'alerts', label: 'Alerts' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {selectedInstrument} Overview
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Current Price:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatPrice(currentPrice)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Active Signals:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {instrumentSignals.length}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Avg Confidence:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {instrumentSignals.length > 0
                                ? (instrumentSignals.reduce((sum, s) => sum + s.confidence, 0) / instrumentSignals.length * 100).toFixed(1) + '%'
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Market Sentiment
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Bullish:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${totalSignals > 0 ? (stats.bullishSignals / totalSignals) * 100 : 0}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {stats.bullishSignals}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Bearish:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-red-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${totalSignals > 0 ? (stats.bearishSignals / totalSignals) * 100 : 0}%` 
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {stats.bearishSignals}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'option-chain' && (
                  <AdvancedOptionChain 
                    underlying={selectedInstrument}
                    maxStrikes={20}
                  />
                )}

                {activeTab === 'patterns' && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Pattern Analysis for {selectedInstrument}
                    </h4>
                    {instrumentSignals.length > 0 ? (
                      <div className="grid gap-4">
                        {instrumentSignals.map((signal, index) => (
                          <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getSignalDirection(signal.direction)}
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {signal.type}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Confidence: {(signal.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {signal.description}
                            </p>
                            {signal.strike && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Strike: {signal.strike}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No patterns detected for {selectedInstrument} at this time.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'alerts' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Alert Management
                      </h4>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Create Alert
                      </button>
                    </div>
                    <div className="text-center py-8">
                      <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No alerts configured. Create your first alert to get notified of market opportunities.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}