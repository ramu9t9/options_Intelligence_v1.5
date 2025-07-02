import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

interface DashboardStats {
  totalPnL: number;
  todaysGain: number;
  activePositions: number;
  successRate: number;
}

export function Dashboard() {
  const { data: marketData, isLoading: marketLoading } = useQuery<MarketData[]>({
    queryKey: ['/api/market-data'],
    refetchInterval: 3000,
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    retry: false,
  });

  const dashboardStats = stats || {
    totalPnL: 45320.50,
    todaysGain: 2456.78,
    activePositions: 12,
    successRate: 68.5
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatChange = (change: number, changePercent: number) => {
    const isPositive = change >= 0;
    const icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        {React.createElement(icon, { className: 'h-4 w-4' })}
        <span className="font-medium">
          {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900" data-testid="dashboard">
      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8" data-testid="dashboard-header">
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-slate-300">
            Welcome to your Options Intelligence Platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8" data-testid="dashboard-stats">
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10" data-testid="total-pnl-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total P&L</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="total-pnl-value">{formatCurrency(dashboardStats.totalPnL)}</div>
              <p className="text-xs text-slate-400">
                +12.5% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10" data-testid="todays-gain-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Today's Gain</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400" data-testid="todays-gain-value">{formatCurrency(dashboardStats.todaysGain)}</div>
              <p className="text-xs text-slate-400">
                +5.4% today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10" data-testid="active-positions-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Active Positions</CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="active-positions-value">{dashboardStats.activePositions}</div>
              <p className="text-xs text-slate-400">
                3 new this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10" data-testid="success-rate-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Success Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="success-rate-value">{dashboardStats.successRate}%</div>
              <Progress value={dashboardStats.successRate} className="mt-2" data-testid="success-rate-progress" />
            </CardContent>
          </Card>
      </div>

        {/* Market Data */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="market-data-section">
          <Card className="lg:col-span-2 bg-black/20 backdrop-blur-sm border border-white/10" data-testid="live-market-data-card">
            <CardHeader>
              <CardTitle className="text-white">Live Market Data</CardTitle>
              <CardDescription className="text-slate-300">
                Real-time market indices and key metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {marketLoading ? (
                <div className="space-y-4" data-testid="market-data-loading">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 w-16 bg-white/10 animate-pulse rounded" />
                      <div className="h-4 w-24 bg-white/10 animate-pulse rounded" />
                      <div className="h-4 w-20 bg-white/10 animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : marketData && marketData.length > 0 ? (
                <div className="space-y-4" data-testid="market-data-list">
                  {marketData.map((market) => (
                    <div key={market.symbol} className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5" data-testid={`market-item-${market.symbol}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white" data-testid={`market-symbol-${market.symbol}`}>{market.symbol}</h3>
                          <Badge variant="outline" className="border-green-400/30 text-green-400" data-testid={`market-status-${market.symbol}`}>Live</Badge>
                        </div>
                        <p className="text-2xl font-bold text-white" data-testid={`market-price-${market.symbol}`}>{formatCurrency(market.price)}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <div data-testid={`market-change-${market.symbol}`}>{formatChange(market.change, market.changePercent)}</div>
                        <p className="text-sm text-slate-400" data-testid={`market-volume-${market.symbol}`}>
                          Vol: {market.volume.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400" data-testid="market-data-empty">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Connecting to market data...</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10" data-testid="quick-actions-card">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-slate-300">
                Frequently used trading tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full p-3 text-left border border-white/10 rounded-lg hover:bg-white/5 transition-colors" data-testid="option-chain-action">
                <div className="font-medium text-white">Option Chain</div>
                <div className="text-sm text-slate-400">View live option data</div>
              </button>
              <button className="w-full p-3 text-left border border-white/10 rounded-lg hover:bg-white/5 transition-colors" data-testid="pattern-analysis-action">
                <div className="font-medium text-white">Pattern Analysis</div>
                <div className="text-sm text-slate-400">Detect market patterns</div>
              </button>
              <button className="w-full p-3 text-left border border-white/10 rounded-lg hover:bg-white/5 transition-colors" data-testid="strategy-builder-action">
                <div className="font-medium text-white">Strategy Builder</div>
                <div className="text-sm text-slate-400">Create trading strategies</div>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-slate-300">
              Your latest trading activities and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { type: 'trade', message: 'Executed BANKNIFTY 52000 PE at ₹245.50', time: '2 minutes ago', status: 'success' },
                { type: 'alert', message: 'NIFTY Call buildup detected at 24700 strike', time: '5 minutes ago', status: 'info' },
                { type: 'trade', message: 'Closed NIFTY 24500 CE position with 12% profit', time: '15 minutes ago', status: 'success' },
                { type: 'alert', message: 'High OI concentration in FINNIFTY 23500 strikes', time: '22 minutes ago', status: 'warning' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 border border-white/10 rounded-lg bg-white/5">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.status === 'success' ? 'bg-green-400' : 
                    activity.status === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium text-white">{activity.message}</p>
                    <p className="text-sm text-slate-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}