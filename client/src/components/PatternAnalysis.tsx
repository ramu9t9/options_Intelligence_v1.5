import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Zap, Activity, Clock, BarChart3, Eye, Filter } from 'lucide-react';
import { PatternResult } from '../services/PatternDetector';
import { MarketDataService } from '../services/MarketDataService';
import { useMarketData } from '../context/MarketDataContext';

interface PatternAnalysisProps {
  selectedInstruments: string[];
}

export function PatternAnalysis({ selectedInstruments }: PatternAnalysisProps) {
  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<PatternResult | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'HIGH_CONFIDENCE'>('ALL');
  const [timeframeFilter, setTimeframeFilter] = useState<'ALL' | '1MIN' | '5MIN' | '15MIN' | '1HOUR' | 'DAILY'>('ALL');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { marketData, prices } = useMarketData();

  useEffect(() => {
    const marketService = MarketDataService.getInstance();
    
    const unsubscribe = marketService.subscribe((update) => {
      // Only show patterns for selected instruments
      if (selectedInstruments.includes(update.underlying)) {
        setPatterns(prev => {
          const otherPatterns = prev.filter(p => p.underlying !== update.underlying);
          const newPatterns = [...otherPatterns, ...update.patterns];
          
          // Apply enhanced filtering and scoring
          const validatedPatterns = validateAndScorePatterns(newPatterns);
          return validatedPatterns.slice(0, 25); // Increased limit for more comprehensive analysis
        });
      }
    });

    return unsubscribe;
  }, [selectedInstruments]);

  // Process current data for patterns
  useEffect(() => {
    const processData = async () => {
      const marketService = MarketDataService.getInstance();
      
      for (const instrument of selectedInstruments) {
        const data = marketData[instrument];
        const price = prices[instrument];
        
        if (data && data.length > 0 && price) {
          await marketService.processMarketData(instrument, price, data);
        }
      }
    };

    processData();
  }, [selectedInstruments, marketData, prices]);

  const validateAndScorePatterns = (patterns: PatternResult[]): PatternResult[] => {
    // Remove duplicates and score patterns
    const uniquePatterns = patterns.filter((pattern, index, self) => 
      index === self.findIndex(p => 
        p.underlying === pattern.underlying && 
        p.strike === pattern.strike && 
        p.type === pattern.type
      )
    );

    // Score and sort patterns
    return uniquePatterns
      .map(pattern => ({
        ...pattern,
        confidence: Math.min(1, pattern.confidence * getPatternMultiplier(pattern))
      }))
      .sort((a, b) => b.confidence - a.confidence);
  };

  const getPatternMultiplier = (pattern: PatternResult): number => {
    let multiplier = 1.0;
    
    // Boost high-impact patterns
    if (pattern.type === 'GAMMA_SQUEEZE' || pattern.type === 'MAX_PAIN') {
      multiplier *= 1.2;
    }
    
    // Boost unusual activity
    if (pattern.type === 'UNUSUAL_ACTIVITY') {
      multiplier *= 1.1;
    }
    
    // Boost shorter timeframes
    switch (pattern.timeframe) {
      case '1MIN':
        multiplier *= 1.15;
        break;
      case '5MIN':
        multiplier *= 1.1;
        break;
      case '15MIN':
        multiplier *= 1.05;
        break;
    }
    
    return multiplier;
  };

  // Filter patterns based on selected criteria
  const filteredPatterns = patterns.filter(pattern => {
    if (selectedInstruments.length > 0 && !selectedInstruments.includes(pattern.underlying)) {
      return false;
    }
    
    if (filterType === 'BULLISH' && pattern.direction !== 'BULLISH') return false;
    if (filterType === 'BEARISH' && pattern.direction !== 'BEARISH') return false;
    if (filterType === 'HIGH_CONFIDENCE' && pattern.confidence < 0.7) return false;
    
    if (timeframeFilter !== 'ALL' && pattern.timeframe !== timeframeFilter) return false;
    
    return true;
  });

  const getPatternIcon = (type: PatternResult['type']) => {
    switch (type) {
      case 'CALL_LONG_BUILDUP':
      case 'CALL_SHORT_COVER':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'PUT_LONG_BUILDUP':
      case 'PUT_SHORT_COVER':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'MAX_PAIN':
        return <Target className="w-5 h-5 text-blue-500" />;
      case 'GAMMA_SQUEEZE':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'VOLATILITY_SPIKE':
        return <BarChart3 className="w-5 h-5 text-purple-500" />;
      case 'UNUSUAL_ACTIVITY':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'SUPPORT_RESISTANCE':
        return <Activity className="w-5 h-5 text-indigo-500" />;
      case 'MOMENTUM_SHIFT':
        return <TrendingUp className="w-5 h-5 text-cyan-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPatternColor = (direction: PatternResult['direction']) => {
    switch (direction) {
      case 'BULLISH':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      case 'BEARISH':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'NEUTRAL':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStrengthColor = (strength: PatternResult['strength']) => {
    switch (strength) {
      case 'STRONG':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'WEAK':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getTimeframeColor = (timeframe: PatternResult['timeframe']) => {
    switch (timeframe) {
      case '1MIN':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case '5MIN':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case '15MIN':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case '1HOUR':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'DAILY':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    }
  };

  const formatPatternType = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRiskLevelColor = (riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (riskLevel) {
      case 'HIGH':
        return 'text-red-600 dark:text-red-400';
      case 'MEDIUM':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'LOW':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Enhanced Pattern Analysis
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {selectedInstruments.length > 0 
                  ? `AI-powered analysis for ${selectedInstruments.join(', ')}`
                  : 'Select instruments to analyze patterns'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                showAdvanced
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Advanced</span>
            </button>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {filteredPatterns.length} patterns
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Directions</option>
            <option value="BULLISH">Bullish Only</option>
            <option value="BEARISH">Bearish Only</option>
            <option value="HIGH_CONFIDENCE">High Confidence</option>
          </select>
          
          <select
            value={timeframeFilter}
            onChange={(e) => setTimeframeFilter(e.target.value as any)}
            className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="ALL">All Timeframes</option>
            <option value="1MIN">1 Minute</option>
            <option value="5MIN">5 Minutes</option>
            <option value="15MIN">15 Minutes</option>
            <option value="1HOUR">1 Hour</option>
            <option value="DAILY">Daily</option>
          </select>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {selectedInstruments.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No instruments selected</p>
            <p className="text-xs mt-1">Choose instruments from the selector above</p>
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Analyzing market patterns...</p>
            <p className="text-xs mt-1">Advanced AI algorithms processing option chain data</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {filteredPatterns.map((pattern, index) => (
              <div
                key={`${pattern.underlying}-${pattern.strike}-${pattern.type}-${index}`}
                className={`border-l-4 p-4 rounded-r-lg cursor-pointer transition-all hover:shadow-md ${getPatternColor(pattern.direction)}`}
                onClick={() => setSelectedPattern(pattern)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getPatternIcon(pattern.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {pattern.underlying}
                        </span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {pattern.strike}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStrengthColor(pattern.strength)}`}>
                          {pattern.strength}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTimeframeColor(pattern.timeframe)}`}>
                          {pattern.timeframe}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {formatPatternType(pattern.type)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {pattern.description}
                      </p>
                      
                      {/* Enhanced metadata display */}
                      {showAdvanced && pattern.metadata && (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          {pattern.metadata.riskLevel && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500 dark:text-gray-400">Risk:</span>
                              <span className={getRiskLevelColor(pattern.metadata.riskLevel)}>
                                {pattern.metadata.riskLevel}
                              </span>
                            </div>
                          )}
                          {pattern.metadata.volumeRatio && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500 dark:text-gray-400">Volume:</span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {pattern.metadata.volumeRatio.toFixed(1)}x
                              </span>
                            </div>
                          )}
                          {pattern.metadata.expectedMove && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500 dark:text-gray-400">Target:</span>
                              <span className="text-gray-700 dark:text-gray-300">
                                ₹{pattern.metadata.expectedMove.toFixed(0)}
                              </span>
                            </div>
                          )}
                          {pattern.metadata.gammaLevel && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500 dark:text-gray-400">Gamma:</span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {(pattern.metadata.gammaLevel * 100).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Confidence:</span>
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                pattern.confidence >= 0.8 ? 'bg-green-500' :
                                pattern.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${pattern.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {(pattern.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{pattern.timeframe}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pattern.direction === 'BULLISH'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : pattern.direction === 'BEARISH'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {pattern.direction}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Pattern Detail Modal */}
      {selectedPattern && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pattern Analysis Details
              </h4>
              <button
                onClick={() => setSelectedPattern(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Pattern Type</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatPatternType(selectedPattern.type)}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Timeframe</label>
                  <p className={`text-lg font-semibold ${getTimeframeColor(selectedPattern.timeframe).replace('bg-', 'text-').replace('100', '600')}`}>
                    {selectedPattern.timeframe}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Underlying & Strike</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedPattern.underlying} {selectedPattern.strike}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Direction & Strength</label>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedPattern.direction === 'BULLISH' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    selectedPattern.direction === 'BEARISH' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {selectedPattern.direction}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStrengthColor(selectedPattern.strength)}`}>
                    {selectedPattern.strength}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Confidence Score</label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        selectedPattern.confidence >= 0.8 ? 'bg-green-500' :
                        selectedPattern.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedPattern.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {(selectedPattern.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Description</label>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {selectedPattern.description}
                </p>
              </div>

              {/* Enhanced metadata display */}
              {selectedPattern.metadata && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Advanced Metrics</label>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {selectedPattern.metadata.riskLevel && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Risk Level</div>
                        <div className={`font-medium ${getRiskLevelColor(selectedPattern.metadata.riskLevel)}`}>
                          {selectedPattern.metadata.riskLevel}
                        </div>
                      </div>
                    )}
                    {selectedPattern.metadata.volumeRatio && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Volume Ratio</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {selectedPattern.metadata.volumeRatio.toFixed(1)}x
                        </div>
                      </div>
                    )}
                    {selectedPattern.metadata.expectedMove && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Expected Move</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          ₹{selectedPattern.metadata.expectedMove.toFixed(0)}
                        </div>
                      </div>
                    )}
                    {selectedPattern.metadata.maxPain && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Max Pain</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          ₹{selectedPattern.metadata.maxPain.toFixed(0)}
                        </div>
                      </div>
                    )}
                    {selectedPattern.metadata.gammaLevel && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Gamma Level</div>
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {(selectedPattern.metadata.gammaLevel * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}