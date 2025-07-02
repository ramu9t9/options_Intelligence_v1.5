import React from 'react';
import { useMarketData } from '../context/MarketDataContext';
import { NavigationHeader } from '@/components/NavigationHeader';

export function SimpleDashboard() {
  const { prices, lastUpdate } = useMarketData();
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const handleNavigateToAdmin = () => {
    window.location.href = '/admin/brokers';
  };

  const handleCreateAlert = () => {
    alert('Alert creation feature will be available soon!');
  };

  const handleScanPatterns = () => {
    alert('Pattern scanning feature will be available soon!');
  };

  const handleViewOptionChain = () => {
    window.location.href = '/option-chain';
  };

  const handleAdvancedAnalysis = () => {
    window.location.href = '/pattern-analysis';
  };

  const handleMultiSegmentTrading = () => {
    window.location.href = '/multi-segment';
  };

  const handleCommodityAnalytics = () => {
    window.location.href = '/commodity-analytics';
  };

  const handleBrokerSetup = () => {
    window.location.href = '/broker-setup';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <NavigationHeader 
        title="Options Intelligence Platform" 
        subtitle="Live Market Analysis Dashboard"
      />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">NIFTY 50</h3>
            </div>
            <div className="text-2xl font-bold text-white">
              ₹{(prices.NIFTY || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-green-400">Live Market Data</p>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">BANK NIFTY</h3>
            </div>
            <div className="text-2xl font-bold text-white">
              ₹{(prices.BANKNIFTY || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-green-400">Live Market Data</p>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Active Alerts</h3>
            </div>
            <div className="text-2xl font-bold text-white">12</div>
            <p className="text-xs text-blue-400">3 triggered today</p>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">P&L Today</h3>
            </div>
            <div className="text-2xl font-bold text-white">₹15,750</div>
            <p className="text-xs text-green-400">+12.5% from yesterday</p>
          </div>
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Option Chain Preview */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <h3 className="text-white text-lg font-medium mb-4">NIFTY Option Chain</h3>
            <div className="space-y-4">
              <div className="text-sm text-gray-400 mb-4">Strike prices around current spot price</div>
              
              {/* Option Chain Table Header */}
              <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 font-medium border-b border-white/10 pb-2">
                <div>Call OI</div>
                <div>Call LTP</div>
                <div className="text-center">Strike</div>
                <div>Put LTP</div>
                <div>Put OI</div>
              </div>

              {/* Option Chain Data */}
              {[22100, 22150, 22200].map((strike) => (
                <div key={strike} className={`grid grid-cols-5 gap-2 text-sm py-2 border-b border-white/5 ${strike === 22150 ? 'bg-blue-500/10 border-blue-500/30 rounded' : ''}`}>
                  <div className="text-green-400">1,25,000</div>
                  <div className="text-white">85.50</div>
                  <div className="text-center text-white font-medium">{strike}</div>
                  <div className="text-white">42.25</div>
                  <div className="text-red-400">98,500</div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleViewOptionChain}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              View Full Option Chain
            </button>
          </div>

          {/* Pattern Analysis */}
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <h3 className="text-white text-lg font-medium mb-4">Pattern Analysis</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-green-400">Call Buildup Detected</div>
                  <div className="text-xs text-gray-400">NIFTY 22200 CE showing strong buying</div>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">HIGH</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-yellow-400">Gamma Squeeze Alert</div>
                  <div className="text-xs text-gray-400">High gamma concentration at 22150</div>
                </div>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs">MEDIUM</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-blue-400">Max Pain Level</div>
                  <div className="text-xs text-gray-400">Current max pain at 22100</div>
                </div>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs">INFO</span>
              </div>
            </div>

            <button 
              onClick={handleAdvancedAnalysis}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
            >
              Advanced Pattern Analysis
            </button>
          </div>
        </div>

        {/* Admin Link */}
        <div className="mt-8">
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
            <h3 className="text-white text-lg font-medium mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <button 
                onClick={handleBrokerSetup}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-4 rounded"
              >
                📊 Broker Setup
              </button>
              <button 
                onClick={handleMultiSegmentTrading}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-2 px-4 rounded"
              >
                🛢️ Multi-Segment Trading
              </button>
              <button 
                onClick={handleCommodityAnalytics}
                className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white py-2 px-4 rounded"
              >
                🥇 Commodity Analytics
              </button>
              <button 
                onClick={handleCreateAlert}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded"
              >
                Create Alert
              </button>
              <button 
                onClick={handleNavigateToAdmin}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2 px-4 rounded"
              >
                Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}