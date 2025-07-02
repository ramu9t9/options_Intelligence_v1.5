import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Activity, BarChart3, Target } from 'lucide-react';

interface Pattern {
  id: string;
  type: 'CALL_BUILDUP' | 'PUT_BUILDUP' | 'CALL_UNWINDING' | 'PUT_UNWINDING' | 'CALL_SHORT_COVER' | 'PUT_SHORT_COVER' | 'GAMMA_SQUEEZE' | 'MAX_PAIN' | 'UNUSUAL_ACTIVITY' | 'SUPPORT_RESISTANCE';
  instrument: string;
  strike?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  description: string;
  signals: string[];
  timeDetected: Date;
  targetPrice?: number;
  recommendation: string;
}

interface MarketMetrics {
  putCallRatio: number;
  maxPainLevel: number;
  gammaExposure: number;
  totalCallOI: number;
  totalPutOI: number;
  unusualVolumeAlerts: number;
}

export function PatternAnalysis() {
  const [selectedInstrument, setSelectedInstrument] = useState('NIFTY');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics | null>(null);
  const [timeframe, setTimeframe] = useState('1D');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStrike, setFilterStrike] = useState('ALL');
  const [sortBy, setSortBy] = useState('confidence');

  useEffect(() => {
    generatePatternData();
    generateMarketMetrics();
  }, [selectedInstrument, timeframe]);

  const generatePatternData = () => {
    const currentPrice = selectedInstrument === 'NIFTY' ? 22150 : 47825;
    
    const patternData: Pattern[] = [
      {
        id: '1',
        type: 'CALL_BUILDUP',
        instrument: selectedInstrument,
        strike: selectedInstrument === 'NIFTY' ? 22200 : 48000,
        severity: 'HIGH',
        confidence: 85,
        description: `Strong call option buildup detected at ${selectedInstrument === 'NIFTY' ? '22200' : '48000'} strike`,
        signals: [
          'OI increase: +45,000 contracts',
          'Price increase: +15%',
          'Volume surge: 3x average',
          'High IV premium'
        ],
        timeDetected: new Date(Date.now() - 30 * 60 * 1000),
        targetPrice: selectedInstrument === 'NIFTY' ? 22200 : 48000,
        recommendation: 'Bullish momentum expected. Consider covered calls or protective puts.'
      },
      {
        id: '2',
        type: 'GAMMA_SQUEEZE',
        instrument: selectedInstrument,
        strike: currentPrice,
        severity: 'CRITICAL',
        confidence: 92,
        description: 'High gamma concentration creating potential squeeze conditions',
        signals: [
          'Gamma exposure: ₹2.5Cr per 1% move',
          'Options dealers short gamma',
          'ATM strike clustering',
          'Low implied volatility'
        ],
        timeDetected: new Date(Date.now() - 15 * 60 * 1000),
        recommendation: 'Explosive price movement likely. Monitor dealer positioning closely.'
      },
      {
        id: '3',
        type: 'MAX_PAIN',
        instrument: selectedInstrument,
        strike: selectedInstrument === 'NIFTY' ? 22100 : 47700,
        severity: 'MEDIUM',
        confidence: 78,
        description: 'Max pain level indicates potential price gravitation point',
        signals: [
          'Max pain: ' + (selectedInstrument === 'NIFTY' ? '22100' : '47700'),
          'Current premium decay favors sellers',
          'High put-call ratio at this level',
          'Historical support confluence'
        ],
        timeDetected: new Date(Date.now() - 45 * 60 * 1000),
        targetPrice: selectedInstrument === 'NIFTY' ? 22100 : 47700,
        recommendation: 'Price likely to gravitate towards max pain. Consider iron condor strategies.'
      },
      {
        id: '4',
        type: 'CALL_SHORT_COVER',
        instrument: selectedInstrument,
        strike: selectedInstrument === 'NIFTY' ? 22300 : 48200,
        severity: 'HIGH',
        confidence: 82,
        description: `Call short covering detected at ${selectedInstrument === 'NIFTY' ? '22300' : '48200'} strike`,
        signals: [
          'OI decrease: -28,000 contracts',
          'Premium surge: +22%',
          'High volume unwinding',
          'Shorts covering positions'
        ],
        timeDetected: new Date(Date.now() - 20 * 60 * 1000),
        targetPrice: selectedInstrument === 'NIFTY' ? 22350 : 48300,
        recommendation: 'Bullish pressure from short covering. Potential upside momentum.'
      },
      {
        id: '5',
        type: 'PUT_SHORT_COVER',
        instrument: selectedInstrument,
        strike: selectedInstrument === 'NIFTY' ? 22000 : 47500,
        severity: 'HIGH',
        confidence: 76,
        description: `Put short covering observed at ${selectedInstrument === 'NIFTY' ? '22000' : '47500'} strike`,
        signals: [
          'OI decrease: -18,500 contracts',
          'Premium increase: +18%',
          'Bears covering shorts',
          'Support level strengthening'
        ],
        timeDetected: new Date(Date.now() - 25 * 60 * 1000),
        targetPrice: selectedInstrument === 'NIFTY' ? 22050 : 47600,
        recommendation: 'Bullish sentiment from put covering. Reduced downside pressure.'
      },
      {
        id: '6',
        type: 'PUT_BUILDUP',
        instrument: selectedInstrument,
        strike: selectedInstrument === 'NIFTY' ? 22000 : 47500,
        severity: 'HIGH',
        confidence: 88,
        description: 'Strong put buildup indicating bearish sentiment',
        signals: [
          'Put OI increase: +35,000 contracts',
          'Smart money hedging detected',
          'Institutional flow confirmation',
          'Rising put premiums'
        ],
        timeDetected: new Date(Date.now() - 60 * 60 * 1000),
        recommendation: 'Bearish positioning detected. Consider protective strategies.'
      },
      {
        id: '5',
        type: 'PUT_UNWINDING',
        instrument: selectedInstrument,
        strike: selectedInstrument === 'NIFTY' ? 21950 : 47300,
        severity: 'MEDIUM',
        confidence: 71,
        description: 'Put option unwinding suggests reduced bearish sentiment',
        signals: [
          'Put OI decrease: -25,000 contracts',
          'Put prices declining despite spot stability',
          'Reduced hedge demand',
          'VIX compression'
        ],
        timeDetected: new Date(Date.now() - 90 * 60 * 1000),
        recommendation: 'Bullish undertone developing. Consider reducing hedges or adding exposure.'
      }
    ];

    setPatterns(patternData);
  };

  const generateMarketMetrics = () => {
    const metrics: MarketMetrics = {
      putCallRatio: 0.85 + Math.random() * 0.3,
      maxPainLevel: selectedInstrument === 'NIFTY' ? 22100 : 47700,
      gammaExposure: Math.random() * 5 + 2,
      totalCallOI: Math.floor(Math.random() * 2000000) + 3000000,
      totalPutOI: Math.floor(Math.random() * 1500000) + 2500000,
      unusualVolumeAlerts: Math.floor(Math.random() * 8) + 3
    };

    setMarketMetrics(metrics);
  };

  const getATMStrikes = () => {
    const currentPrice = selectedInstrument === 'NIFTY' ? 22150 : 47825;
    const strikeInterval = selectedInstrument === 'NIFTY' ? 50 : 100;
    
    // Find the nearest strike price
    const nearestStrike = Math.round(currentPrice / strikeInterval) * strikeInterval;
    
    // Generate 4 strikes above and below ATM
    const strikes = [];
    for (let i = -4; i <= 4; i++) {
      strikes.push(nearestStrike + (i * strikeInterval));
    }
    
    return strikes.sort((a, b) => a - b);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'HIGH': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'CRITICAL': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPatternSentiment = (type: string) => {
    const bullishPatterns = ['CALL_BUILDUP', 'PUT_UNWINDING', 'CALL_SHORT_COVER', 'PUT_SHORT_COVER'];
    const bearishPatterns = ['PUT_BUILDUP', 'CALL_UNWINDING'];
    
    if (bullishPatterns.includes(type)) return 'bullish';
    if (bearishPatterns.includes(type)) return 'bearish';
    return 'neutral';
  };

  const getPatternBorderColor = (type: string) => {
    const sentiment = getPatternSentiment(type);
    switch (sentiment) {
      case 'bullish': return 'border-l-4 border-l-green-500 bg-green-500/5';
      case 'bearish': return 'border-l-4 border-l-red-500 bg-red-500/5';
      default: return 'border-l-4 border-l-yellow-500 bg-yellow-500/5';
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'CALL_BUILDUP': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'PUT_BUILDUP': return <TrendingDown className="w-5 h-5 text-red-400" />;
      case 'CALL_SHORT_COVER': return <TrendingUp className="w-5 h-5 text-green-300" />;
      case 'PUT_SHORT_COVER': return <TrendingUp className="w-5 h-5 text-green-300" />;
      case 'GAMMA_SQUEEZE': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
      case 'MAX_PAIN': return <Target className="w-5 h-5 text-yellow-400" />;
      case 'UNUSUAL_ACTIVITY': return <Activity className="w-5 h-5 text-purple-400" />;
      default: return <BarChart3 className="w-5 h-5 text-blue-400" />;
    }
  };

  const formatPatternType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const filteredAndSortedPatterns = patterns
    .filter(pattern => {
      if (filterType !== 'ALL') {
        const sentiment = getPatternSentiment(pattern.type);
        if (filterType !== sentiment.toUpperCase()) return false;
      }
      
      if (filterSeverity !== 'ALL' && pattern.severity !== filterSeverity) {
        return false;
      }
      
      // Strike price filtering
      if (filterStrike !== 'ALL') {
        if (filterStrike === 'ATM' && pattern.strike) {
          const atmStrikes = getATMStrikes();
          if (!atmStrikes.includes(pattern.strike)) return false;
        } else if (filterStrike !== 'ATM' && pattern.strike) {
          const targetStrike = parseInt(filterStrike);
          if (pattern.strike !== targetStrike) return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'severity':
          const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'time':
          return b.timeDetected.getTime() - a.timeDetected.getTime();
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/'}
                className="p-2 text-white hover:bg-white/10 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-white">Advanced Pattern Analysis</h1>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-sm">
                LIVE
              </span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs">
                Last Updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
              >
                <option value="NIFTY">NIFTY</option>
                <option value="BANKNIFTY">BANK NIFTY</option>
                <option value="FINNIFTY">FIN NIFTY</option>
              </select>
              
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
              >
                <option value="1D">1 Day</option>
                <option value="1W">1 Week</option>
                <option value="1M">1 Month</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Market Metrics */}
        {marketMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Put/Call Ratio</div>
              <div className="text-xl font-bold text-yellow-400">
                {marketMetrics.putCallRatio.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Max Pain</div>
              <div className="text-xl font-bold text-orange-400">
                {marketMetrics.maxPainLevel}
              </div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Gamma Exposure</div>
              <div className="text-xl font-bold text-purple-400">
                ₹{marketMetrics.gammaExposure.toFixed(1)}Cr
              </div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Total Call OI</div>
              <div className="text-xl font-bold text-green-400">
                {(marketMetrics.totalCallOI / 100000).toFixed(1)}L
              </div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Total Put OI</div>
              <div className="text-xl font-bold text-red-400">
                {(marketMetrics.totalPutOI / 100000).toFixed(1)}L
              </div>
            </div>
            
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Volume Alerts</div>
              <div className="text-xl font-bold text-blue-400">
                {marketMetrics.unusualVolumeAlerts}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Filter by Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
              >
                <option value="ALL">All Patterns</option>
                <option value="BULLISH">🟢 Bullish</option>
                <option value="BEARISH">🔴 Bearish</option>
                <option value="NEUTRAL">🟡 Neutral</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Filter by Severity:</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
              >
                <option value="ALL">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Filter by Strike:</label>
              <select
                value={filterStrike}
                onChange={(e) => setFilterStrike(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
              >
                <option value="ALL">All Strikes</option>
                <option value="ATM">Near ATM (±4 strikes)</option>
                {getATMStrikes().map(strike => (
                  <option key={strike} value={strike.toString()}>
                    {strike}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
              >
                <option value="confidence">Confidence</option>
                <option value="severity">Severity</option>
                <option value="time">Time Detected</option>
              </select>
            </div>

            <div className="text-sm text-gray-400">
              Showing {filteredAndSortedPatterns.length} of {patterns.length} patterns
            </div>
          </div>
        </div>

        {/* Pattern Detection Results */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white mb-4">Detected Patterns</h2>
          
          {filteredAndSortedPatterns.map((pattern) => (
            <div key={pattern.id} className={`bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6 ${getPatternBorderColor(pattern.type)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div>
                    {getPatternIcon(pattern.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {formatPatternType(pattern.type)}
                      {pattern.strike && ` - ${pattern.strike}`}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Detected {Math.floor((Date.now() - pattern.timeDetected.getTime()) / 60000)} minutes ago
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(pattern.severity)}`}>
                    {pattern.severity}
                  </span>
                  <span className="text-sm text-gray-400">
                    {pattern.confidence}% confidence
                  </span>
                </div>
              </div>

              <p className="text-gray-300 mb-4">{pattern.description}</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Key Signals</h4>
                  <ul className="space-y-1">
                    {pattern.signals.map((signal, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-center">
                        <span className="w-1 h-1 bg-blue-400 rounded-full mr-2"></span>
                        {signal}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Trading Recommendation</h4>
                  <p className="text-sm text-gray-300">{pattern.recommendation}</p>
                  {pattern.targetPrice && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-400">Target: </span>
                      <span className="text-sm font-medium text-blue-400">{pattern.targetPrice}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pattern Summary */}
        <div className="mt-8 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pattern Analysis Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Bullish Patterns</div>
              <div className="text-green-400 font-semibold">
                {patterns.filter(p => ['CALL_BUILDUP', 'PUT_UNWINDING'].includes(p.type)).length}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Bearish Patterns</div>
              <div className="text-red-400 font-semibold">
                {patterns.filter(p => ['PUT_BUILDUP', 'CALL_UNWINDING'].includes(p.type)).length}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Neutral Patterns</div>
              <div className="text-yellow-400 font-semibold">
                {patterns.filter(p => ['MAX_PAIN', 'GAMMA_SQUEEZE'].includes(p.type)).length}
              </div>
            </div>
            <div>
              <div className="text-gray-400">High Confidence</div>
              <div className="text-blue-400 font-semibold">
                {patterns.filter(p => p.confidence >= 80).length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}