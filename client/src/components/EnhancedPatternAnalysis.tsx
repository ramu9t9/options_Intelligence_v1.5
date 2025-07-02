import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Zap,
  Activity,
  Target,
  Settings
} from 'lucide-react';

interface PatternSignal {
  id: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  pattern: string;
  confidence: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'STRONG';
  timeframe: string;
  description: string;
  signals: string[];
}

interface LiveSignal {
  id: string;
  symbol: string;
  type: 'Call Long Buildup' | 'Put Unwinding' | 'Gamma Squeeze' | 'Unusual Activity';
  status: 'BULLISH' | 'BEARISH';
  confidence: number;
  timeAgo: string;
}

export default function EnhancedPatternAnalysis() {
  const [activeTab, setActiveTab] = useState('patterns');
  const [selectedTimeframe, setSelectedTimeframe] = useState('All Timeframes');
  const [selectedDeviation, setSelectedDeviation] = useState('All Deviations');

  const patternSignals: PatternSignal[] = [
    {
      id: '1',
      type: 'BULLISH',
      pattern: 'Gamma Squeeze',
      confidence: 92,
      severity: 'STRONG',
      timeframe: '15M',
      description: 'High gamma concentration near 19723. Potential for rapid bullish movement. Total gamma OI: 98K. Confidence: 92%',
      signals: ['High gamma concentration', 'Rapid bullish movement potential', 'Total gamma OI: 98K']
    },
    {
      id: '2',
      type: 'BEARISH',
      pattern: 'Unusual Activity',
      confidence: 78,
      severity: 'MODERATE',
      timeframe: '5M',
      description: 'Unusual PUT buildup at 19723. Volume 3.6x average 10M. IV increasing rapidly. Confidence: 78%',
      signals: ['PUT buildup detected', 'Volume 3.6x average', 'IV increasing rapidly']
    },
    {
      id: '3',
      type: 'BEARISH',
      pattern: 'Unusual Activity',
      confidence: 85,
      severity: 'MODERATE',
      timeframe: '1M',
      description: 'Significant selling pressure detected at key resistance levels with high volume confirmation.',
      signals: ['Selling pressure at resistance', 'High volume confirmation', 'Key level breach']
    }
  ];

  const liveSignals: LiveSignal[] = [
    {
      id: '1',
      symbol: 'NIFTY',
      type: 'Call Long Buildup',
      status: 'BULLISH',
      confidence: 89,
      timeAgo: '2 minutes ago'
    },
    {
      id: '2',
      symbol: 'BANKNIFTY',
      type: 'Put Unwinding',
      status: 'BULLISH',
      confidence: 76,
      timeAgo: '5 minutes ago'
    },
    {
      id: '3',
      symbol: 'FINNIFTY',
      type: 'Gamma Squeeze',
      status: 'BULLISH',
      confidence: 92,
      timeAgo: '1 minute ago'
    }
  ];

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'BULLISH':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'BEARISH':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Target className="h-4 w-4 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'STRONG':
        return 'bg-green-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MODERATE':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPatternColor = (type: string) => {
    switch (type) {
      case 'BULLISH':
        return 'border-l-green-500 bg-green-500/5';
      case 'BEARISH':
        return 'border-l-red-500 bg-red-500/5';
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Market Trends Chart Placeholder */}
      <Card className="card-modern">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Market Trends
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="btn-modern">
                Open Interest
              </Button>
              <Button variant="outline" size="sm" className="btn-modern">
                Price Movement
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-slate-800/30 rounded-lg flex items-center justify-center border border-slate-700/50">
            <div className="text-center">
              <Activity className="h-8 w-8 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Nifty 50 Open Interest Trend</p>
              <p className="text-xs text-slate-500 mt-1">Chart visualization will appear here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Pattern Analysis */}
      <Card className="card-modern">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <CardTitle>Enhanced Pattern Analysis</CardTitle>
              <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                <Settings className="h-3 w-3 mr-1" />
                Advanced
              </Badge>
            </div>
            <div className="text-sm text-slate-400">
              2 patterns
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <select 
              className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white"
              value={selectedDeviation}
              onChange={(e) => setSelectedDeviation(e.target.value)}
            >
              <option>All Deviations</option>
              <option>High Deviation</option>
              <option>Moderate Deviation</option>
            </select>
            <select 
              className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white"
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
            >
              <option>All Timeframes</option>
              <option>1M</option>
              <option>5M</option>
              <option>15M</option>
              <option>1H</option>
            </select>
          </div>

          <div className="space-y-4">
            {patternSignals.map((signal) => (
              <div
                key={signal.id}
                className={`p-4 rounded-lg border-l-4 glass-effect ${getPatternColor(signal.type)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getPatternIcon(signal.type)}
                      <span className="font-semibold text-white">{signal.symbol || 'NIFTY'}</span>
                      <Badge variant="outline" className="text-xs bg-slate-800">
                        {signal.timeframe}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          signal.type === 'BULLISH' ? 'text-green-400 border-green-500/20' :
                          signal.type === 'BEARISH' ? 'text-red-400 border-red-500/20' :
                          'text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {signal.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-slate-800">
                        {signal.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(signal.severity)}`}></div>
                    <span className="text-sm font-medium text-white">{signal.confidence}%</span>
                  </div>
                </div>
                
                <h4 className="font-semibold text-white mb-2">{signal.pattern}</h4>
                <p className="text-sm text-slate-300 mb-3">{signal.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {signal.signals.map((sig, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="text-xs bg-slate-800/50 text-slate-300 border-slate-600"
                    >
                      {sig}
                    </Badge>
                  ))}
                </div>
                
                <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      signal.confidence >= 90 ? 'bg-green-500' :
                      signal.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${signal.confidence}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Signals */}
      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-400" />
            Live Signals
          </CardTitle>
          <p className="text-sm text-slate-400">Signals for NIFTY</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {liveSignals.map((signal) => (
            <div
              key={signal.id}
              className={`p-3 rounded-lg glass-effect border-l-4 ${
                signal.status === 'BULLISH' ? 'border-l-green-500' : 'border-l-red-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {signal.status === 'BULLISH' ? 
                      <TrendingUp className="h-4 w-4 text-green-400" /> :
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    }
                    <span className="font-medium text-white">{signal.symbol}</span>
                    <Badge variant="outline" className="text-xs bg-slate-800">
                      {signal.timeAgo}
                    </Badge>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    signal.status === 'BULLISH' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                    'text-red-400 bg-red-500/10 border-red-500/20'
                  }`}
                >
                  {signal.status}
                </Badge>
              </div>
              
              <div className="mt-2">
                <h4 className="text-sm font-semibold text-white">{signal.type}</h4>
                <p className="text-xs text-slate-400">
                  Strong call buying detected at 19800 CE for India VIX trend rally. Confidence: {signal.confidence}%
                </p>
              </div>
              
              <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${signal.confidence}%` }}
                ></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}