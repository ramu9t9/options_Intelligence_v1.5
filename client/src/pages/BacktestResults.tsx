import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  DollarSign,
  BarChart3,
  Activity,
  ArrowUp,
  ArrowDown,
  Filter
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface BacktestResult {
  id: string;
  strategyName: string;
  symbol: string;
  period: string;
  totalTrades: number;
  winRate: number;
  totalROI: number;
  maxDrawdown: number;
  sharpeRatio: number;
  averageReturn: number;
  profitFactor: number;
  roiData: { date: string; roi: number; trades: number }[];
  monthlyStats: { month: string; trades: number; winRate: number; roi: number }[];
}

export default function BacktestResults() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');
  
  // Mock backtest data
  const backtestResults: BacktestResult[] = [
    {
      id: '1',
      strategyName: 'Iron Condor Weekly',
      symbol: 'NIFTY',
      period: '6 Months',
      totalTrades: 24,
      winRate: 75,
      totalROI: 18.5,
      maxDrawdown: -4.2,
      sharpeRatio: 1.8,
      averageReturn: 2.1,
      profitFactor: 2.4,
      roiData: [
        { date: 'Jul', roi: 0, trades: 0 },
        { date: 'Aug', roi: 3.2, trades: 4 },
        { date: 'Sep', roi: 7.8, trades: 8 },
        { date: 'Oct', roi: 12.1, trades: 12 },
        { date: 'Nov', roi: 15.9, trades: 16 },
        { date: 'Dec', roi: 18.5, trades: 20 },
        { date: 'Jan', roi: 18.5, trades: 24 }
      ],
      monthlyStats: [
        { month: 'Aug', trades: 4, winRate: 75, roi: 3.2 },
        { month: 'Sep', trades: 4, winRate: 100, roi: 4.6 },
        { month: 'Oct', trades: 4, winRate: 50, roi: 4.3 },
        { month: 'Nov', trades: 4, winRate: 75, roi: 3.8 },
        { month: 'Dec', trades: 4, winRate: 75, roi: 2.6 },
        { month: 'Jan', trades: 4, winRate: 100, roi: 0 }
      ]
    }
  ];

  const currentResult = backtestResults[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Backtest Results
          </h1>
          <p className="text-gray-300">
            Analyze historical performance of your trading strategies
          </p>
        </div>

        {/* Strategy Selector */}
        <div className="mb-6">
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Filter className="w-5 h-5 text-gray-300" />
                <span className="text-white font-medium">Strategy:</span>
                <Badge className="bg-purple-500/20 text-purple-300 px-3 py-1">
                  {currentResult.strategyName}
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300 px-3 py-1">
                  {currentResult.symbol}
                </Badge>
                <Badge className="bg-gray-500/20 text-gray-300 px-3 py-1">
                  {currentResult.period}
                </Badge>
              </div>
              <Button className="bg-white/10 hover:bg-white/20 text-white">
                <Calendar className="w-4 h-4 mr-2" />
                Change Period
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total ROI */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total ROI</p>
                  <p className="text-2xl font-bold text-green-400">
                    +{currentResult.totalROI}%
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Over {currentResult.period}
              </div>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Win Rate</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {currentResult.winRate}%
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${currentResult.winRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Trades */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Trades</p>
                  <p className="text-2xl font-bold text-white">
                    {currentResult.totalTrades}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                ~{Math.round(currentResult.totalTrades / 6)} trades/month
              </div>
            </CardContent>
          </Card>

          {/* Sharpe Ratio */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Sharpe Ratio</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {currentResult.sharpeRatio}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Activity className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Risk-adjusted return
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ROI Over Time Chart */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                ROI Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/10 backdrop-blur-sm p-4 rounded-md border border-white/10">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={currentResult.roiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.6)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.6)"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="roi" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Performance */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                Monthly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/10 backdrop-blur-sm p-4 rounded-md border border-white/10">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={currentResult.monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="month" 
                      stroke="rgba(255,255,255,0.6)"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.6)"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="roi" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Metrics */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Average Return</span>
                <span className="text-green-400 font-medium">+{currentResult.averageReturn}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Max Drawdown</span>
                <span className="text-red-400 font-medium">{currentResult.maxDrawdown}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Profit Factor</span>
                <span className="text-blue-400 font-medium">{currentResult.profitFactor}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Best Month</span>
                <span className="text-green-400 font-medium">+4.6%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Worst Month</span>
                <span className="text-red-400 font-medium">0%</span>
              </div>
            </CardContent>
          </Card>

          {/* Risk Analysis */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Volatility</span>
                  <span className="text-white">Low</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full w-[30%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">Risk Score</span>
                  <span className="text-white">4/10</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full w-[40%]" />
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-gray-400">
                  Strategy shows consistent performance with controlled downside risk. 
                  Suitable for conservative traders.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trade Distribution */}
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Trade Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-gray-300 text-sm">Winning Trades</span>
                </div>
                <span className="text-white font-medium">18</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-gray-300 text-sm">Losing Trades</span>
                </div>
                <span className="text-white font-medium">6</span>
              </div>
              <div className="pt-2 border-t border-white/10">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-green-400 font-medium">₹45,600</div>
                    <div className="text-gray-400">Avg Win</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-medium">₹18,200</div>
                    <div className="text-gray-400">Avg Loss</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-4">
          <Button className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2">
            <DollarSign className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2">
            <Activity className="w-4 h-4 mr-2" />
            Run New Backtest
          </Button>
          <Button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium px-6 py-2">
            <Target className="w-4 h-4 mr-2" />
            Deploy Strategy
          </Button>
        </div>
      </div>
    </div>
  );
}