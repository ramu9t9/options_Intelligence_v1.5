import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  BarChart3,
  AlertTriangle,
  Eye,
  Zap,
  Download,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface MaxPainData {
  strike: number;
  totalOI: number;
  callOI: number;
  putOI: number;
  pain: number;
}

interface TopOIData {
  strike: number;
  type: 'CE' | 'PE';
  oi: number;
  oiChange: number;
  ltp: number;
  change: number;
}

interface IVData {
  strike: number;
  type: 'CE' | 'PE';
  iv: number;
  ivRank: number;
  ltp: number;
  delta: number;
}

export default function MarketReports() {
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [refreshing, setRefreshing] = useState(false);

  // Mock data
  const maxPainData: MaxPainData[] = [
    { strike: 24500, totalOI: 45600, callOI: 25000, putOI: 20600, pain: 2.1 },
    { strike: 24550, totalOI: 67800, callOI: 35000, putOI: 32800, pain: 1.8 },
    { strike: 24600, totalOI: 89200, callOI: 45000, putOI: 44200, pain: 1.2 },
    { strike: 24650, totalOI: 95400, callOI: 48000, putOI: 47400, pain: 0.8 },
    { strike: 24700, totalOI: 98600, callOI: 49500, putOI: 49100, pain: 0.5 }, // Max Pain
    { strike: 24750, totalOI: 87200, callOI: 44000, putOI: 43200, pain: 0.9 },
    { strike: 24800, totalOI: 72400, callOI: 38000, putOI: 34400, pain: 1.4 },
  ];

  const topOIData: TopOIData[] = [
    { strike: 24700, type: 'CE', oi: 49500, oiChange: 12500, ltp: 45.25, change: 2.15 },
    { strike: 24700, type: 'PE', oi: 49100, oiChange: 15200, ltp: 52.80, change: -1.85 },
    { strike: 24650, type: 'CE', oi: 48000, oiChange: 8900, ltp: 68.40, change: 4.20 },
    { strike: 24750, type: 'PE', oi: 43200, oiChange: 11800, ltp: 38.95, change: -2.40 },
    { strike: 24600, type: 'CE', oi: 45000, oiChange: 7600, ltp: 95.60, change: 6.80 },
  ];

  const topIVData: IVData[] = [
    { strike: 24500, type: 'CE', iv: 18.45, ivRank: 85, ltp: 145.20, delta: 0.72 },
    { strike: 24900, type: 'PE', iv: 17.82, ivRank: 82, ltp: 168.75, delta: -0.68 },
    { strike: 24400, type: 'CE', iv: 17.34, ivRank: 78, ltp: 185.40, delta: 0.78 },
    { strike: 25000, type: 'PE', iv: 16.95, ivRank: 76, ltp: 225.90, delta: -0.74 },
    { strike: 24300, type: 'CE', iv: 16.58, ivRank: 73, ltp: 245.60, delta: 0.82 },
  ];

  const pcRatioData = [
    { time: '09:15', ratio: 0.85, volume: 12500 },
    { time: '10:00', ratio: 0.92, volume: 15800 },
    { time: '11:00', ratio: 1.05, volume: 18600 },
    { time: '12:00', ratio: 1.12, volume: 16200 },
    { time: '13:00', ratio: 1.08, volume: 14900 },
    { time: '14:00', ratio: 0.98, volume: 17400 },
    { time: '15:00', ratio: 0.89, volume: 19800 },
    { time: '15:30', ratio: 0.93, volume: 22100 },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const maxPainStrike = maxPainData.find(item => item.pain === Math.min(...maxPainData.map(d => d.pain)))?.strike || 24700;
  const currentPCR = pcRatioData[pcRatioData.length - 1]?.ratio || 0.93;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Market Insights & Reports
              </h1>
              <p className="text-gray-300">
                Real-time analysis of option flow, IV trends, and market sentiment
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-purple-500/20 text-purple-300 px-3 py-1">
                {selectedSymbol}
              </Badge>
              <Button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/10 hover:bg-white/20 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Max Pain</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {maxPainStrike}
                  </p>
                </div>
                <Target className="w-8 h-8 text-yellow-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Current Strike</p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">PCR</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {currentPCR}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Put-Call Ratio</p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total OI</p>
                  <p className="text-2xl font-bold text-green-400">
                    4.2M
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Open Interest</p>
            </CardContent>
          </Card>

          <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">IV Rank</p>
                  <p className="text-2xl font-bold text-purple-400">
                    76%
                  </p>
                </div>
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Volatility Rank</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Different Reports */}
        <Tabs defaultValue="maxpain" className="space-y-6">
          <TabsList className="bg-black/20 backdrop-blur-sm border border-white/10">
            <TabsTrigger value="maxpain" className="text-white data-[state=active]:bg-white/20">
              Max Pain Analysis
            </TabsTrigger>
            <TabsTrigger value="oi" className="text-white data-[state=active]:bg-white/20">
              Open Interest
            </TabsTrigger>
            <TabsTrigger value="iv" className="text-white data-[state=active]:bg-white/20">
              IV Analysis
            </TabsTrigger>
            <TabsTrigger value="pcr" className="text-white data-[state=active]:bg-white/20">
              PCR Trends
            </TabsTrigger>
          </TabsList>

          {/* Max Pain Analysis */}
          <TabsContent value="maxpain" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-xl text-white/90 font-semibold border-l-4 border-purple-500 pl-2">
                    Max Pain Chart
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black/10 backdrop-blur-sm p-4 rounded-md border border-white/10">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={maxPainData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="strike" 
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
                        <Area 
                          type="monotone" 
                          dataKey="totalOI" 
                          stroke="#8b5cf6" 
                          fill="rgba(139, 92, 246, 0.3)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="text-xl text-white/90 font-semibold border-l-4 border-purple-500 pl-2">
                    Strike Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {maxPainData.slice(2, 5).map((item, index) => (
                      <div 
                        key={item.strike}
                        className={`bg-black/10 backdrop-blur-sm p-3 rounded-md border border-white/10 ${
                          item.strike === maxPainStrike ? 'border-yellow-500/50 bg-yellow-500/5' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{item.strike}</span>
                            {item.strike === maxPainStrike && (
                              <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">
                                Max Pain
                              </Badge>
                            )}
                          </div>
                          <span className="text-gray-300 text-sm">{item.totalOI.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>CE: {item.callOI.toLocaleString()}</span>
                          <span>PE: {item.putOI.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Open Interest Tab */}
          <TabsContent value="oi" className="space-y-6">
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white/90 font-semibold border-l-4 border-purple-500 pl-2">
                  Top OI Strikes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-white/80 font-medium py-2">Strike</th>
                        <th className="text-left text-white/80 font-medium py-2">Type</th>
                        <th className="text-right text-white/80 font-medium py-2">OI</th>
                        <th className="text-right text-white/80 font-medium py-2">OI Change</th>
                        <th className="text-right text-white/80 font-medium py-2">LTP</th>
                        <th className="text-right text-white/80 font-medium py-2">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topOIData.map((item, index) => (
                        <tr 
                          key={`${item.strike}-${item.type}`}
                          className={`border-b border-white/5 ${
                            index % 2 === 0 ? 'bg-white/5' : 'bg-black/10'
                          }`}
                        >
                          <td className="text-sm text-white/80 py-2">{item.strike}</td>
                          <td className="text-sm text-white/80 py-2">
                            <Badge className={`text-xs ${
                              item.type === 'CE' 
                                ? 'bg-green-500/20 text-green-300' 
                                : 'bg-red-500/20 text-red-300'
                            }`}>
                              {item.type}
                            </Badge>
                          </td>
                          <td className="text-sm text-white/80 py-2 text-right">
                            {item.oi.toLocaleString()}
                          </td>
                          <td className="text-sm py-2 text-right">
                            <span className={`${
                              item.oiChange > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {item.oiChange > 0 ? '+' : ''}{item.oiChange.toLocaleString()}
                            </span>
                          </td>
                          <td className="text-sm text-white/80 py-2 text-right">
                            ₹{item.ltp}
                          </td>
                          <td className="text-sm py-2 text-right">
                            <span className={`${
                              item.change > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {item.change > 0 ? '+' : ''}{item.change}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IV Analysis Tab */}
          <TabsContent value="iv" className="space-y-6">
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white/90 font-semibold border-l-4 border-purple-500 pl-2">
                  Top IV Ranks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-white/80 font-medium py-2">Strike</th>
                        <th className="text-left text-white/80 font-medium py-2">Type</th>
                        <th className="text-right text-white/80 font-medium py-2">IV</th>
                        <th className="text-right text-white/80 font-medium py-2">IV Rank</th>
                        <th className="text-right text-white/80 font-medium py-2">LTP</th>
                        <th className="text-right text-white/80 font-medium py-2">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topIVData.map((item, index) => (
                        <tr 
                          key={`${item.strike}-${item.type}`}
                          className={`border-b border-white/5 ${
                            index % 2 === 0 ? 'bg-white/5' : 'bg-black/10'
                          }`}
                        >
                          <td className="text-sm text-white/80 py-2">{item.strike}</td>
                          <td className="text-sm text-white/80 py-2">
                            <Badge className={`text-xs ${
                              item.type === 'CE' 
                                ? 'bg-green-500/20 text-green-300' 
                                : 'bg-red-500/20 text-red-300'
                            }`}>
                              {item.type}
                            </Badge>
                          </td>
                          <td className="text-sm text-white/80 py-2 text-right">
                            {item.iv}%
                          </td>
                          <td className="text-sm py-2 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <span className="text-white/80">{item.ivRank}%</span>
                              <div className="w-16 bg-gray-700 rounded-full h-1">
                                <div 
                                  className="bg-purple-500 h-1 rounded-full"
                                  style={{ width: `${item.ivRank}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="text-sm text-white/80 py-2 text-right">
                            ₹{item.ltp}
                          </td>
                          <td className="text-sm text-white/80 py-2 text-right">
                            {item.delta}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PCR Trends Tab */}
          <TabsContent value="pcr" className="space-y-6">
            <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white/90 font-semibold border-l-4 border-purple-500 pl-2">
                  Put-Call Ratio Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black/10 backdrop-blur-sm p-4 rounded-md border border-white/10">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={pcRatioData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="time" 
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
                        dataKey="ratio" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-green-400">0.89</div>
                    <div className="text-xs text-gray-400">Bullish Zone</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-yellow-400">1.0</div>
                    <div className="text-xs text-gray-400">Neutral</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-red-400">1.15</div>
                    <div className="text-xs text-gray-400">Bearish Zone</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export Actions */}
        <div className="mt-6 flex space-x-4">
          <Button className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2">
            <Download className="w-4 h-4 mr-2" />
            Export PDF Report
          </Button>
          <Button className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2">
            <Eye className="w-4 h-4 mr-2" />
            View Historical Data
          </Button>
          <Button className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium px-6 py-2">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Set Alerts
          </Button>
        </div>
      </div>
    </div>
  );
}