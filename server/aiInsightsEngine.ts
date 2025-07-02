import { EventEmitter } from 'events';
import { storage } from './storage';
import { PatternDetector, type PatternResult, type OptionChainData } from './patternDetector';

export interface TradingInsight {
  id: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILITY' | 'ARBITRAGE';
  underlying: string;
  title: string;
  description: string;
  confidence: number; // 0-1
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signals: string[];
  recommendation: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'WATCH' | 'HEDGE';
    strategy: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    timeframe: '1D' | '1W' | '1M' | '3M';
    targetPrice?: number;
    stopLoss?: number;
  };
  metadata: {
    patterns: PatternResult[];
    indicators: Record<string, number>;
    marketCondition: string;
    volatility: number;
    sentiment: number; // -1 to 1
  };
  createdAt: Date;
  expiresAt: Date;
}

export interface MarketSentiment {
  overall: number; // -1 to 1
  putCallRatio: number;
  volatilityIndex: number;
  momentumScore: number;
  supportResistance: {
    support: number[];
    resistance: number[];
  };
  marketRegime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'CALM';
}

export interface AIRecommendation {
  id: string;
  underlying: string;
  strategy: string;
  action: 'ENTRY' | 'EXIT' | 'ADJUST' | 'MONITOR';
  confidence: number;
  reasoning: string[];
  riskReward: {
    expectedReturn: number;
    maxRisk: number;
    probability: number;
  };
  execution: {
    strikes: number[];
    expirations: string[];
    quantities: number[];
    orderType: 'MARKET' | 'LIMIT' | 'STOP';
  };
  createdAt: Date;
}

export class AIInsightsEngine extends EventEmitter {
  private insights = new Map<string, TradingInsight>();
  private recommendations = new Map<string, AIRecommendation>();
  private marketSentiment: MarketSentiment | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing AI Insights Engine...');
      
      // Start periodic analysis
      this.startPeriodicAnalysis();
      
      this.isInitialized = true;
      console.log('✅ AI Insights Engine initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing AI Insights Engine:', error);
      throw error;
    }
  }

  private startPeriodicAnalysis(): void {
    // Run analysis every 30 seconds
    this.analysisInterval = setInterval(async () => {
      await this.performMarketAnalysis();
    }, 30000);

    // Initial analysis
    this.performMarketAnalysis();
  }

  private async performMarketAnalysis(): Promise<void> {
    try {
      // Get active instruments
      const instruments = await storage.getInstruments();
      
      for (const instrument of instruments.slice(0, 5)) { // Limit to top 5
        await this.analyzeInstrument(instrument.symbol);
      }
      
      // Update market sentiment
      await this.updateMarketSentiment();
      
      // Generate recommendations
      await this.generateRecommendations();
      
    } catch (error) {
      console.error('Error in market analysis:', error);
    }
  }

  private async analyzeInstrument(symbol: string): Promise<void> {
    try {
      // Generate mock option chain data for analysis
      const optionChain = this.generateMockOptionChain(symbol);
      const currentPrice = this.getCurrentPrice(symbol);
      
      // Run pattern detection
      const patterns = await PatternDetector.analyzeOptionChain(optionChain, {
        underlying: symbol,
        currentPrice,
        previousPrice: currentPrice * 0.998,
        volatility: Math.random() * 30 + 15,
        marketHours: this.isMarketHours(),
        timeframe: '5min'
      });

      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators(symbol, currentPrice);
      
      // Analyze sentiment
      const sentiment = this.analyzeSentiment(optionChain, patterns);
      
      // Generate insights
      const insights = this.generateInsights(symbol, patterns, indicators, sentiment, currentPrice);
      
      // Store insights
      insights.forEach(insight => {
        this.insights.set(insight.id, insight);
        this.emit('newInsight', insight);
      });
      
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
    }
  }

  private generateInsights(
    symbol: string, 
    patterns: PatternResult[], 
    indicators: Record<string, number>,
    sentiment: number,
    currentPrice: number
  ): TradingInsight[] {
    const insights: TradingInsight[] = [];

    // Pattern-based insights
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        const insight: TradingInsight = {
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: pattern.direction === 'BULLISH' ? 'BULLISH' : 
                pattern.direction === 'BEARISH' ? 'BEARISH' : 'NEUTRAL',
          underlying: symbol,
          title: `${pattern.type} Pattern Detected`,
          description: pattern.description,
          confidence: pattern.confidence,
          severity: pattern.confidence > 0.9 ? 'CRITICAL' : 
                   pattern.confidence > 0.8 ? 'HIGH' : 'MEDIUM',
          signals: [pattern.type],
          recommendation: this.generateRecommendationFromPattern(pattern, currentPrice),
          metadata: {
            patterns: [pattern],
            indicators,
            marketCondition: this.getMarketCondition(indicators),
            volatility: indicators.volatility || 20,
            sentiment
          },
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
        };
        
        insights.push(insight);
      }
    });

    // Technical indicator insights
    if (indicators.rsi > 70) {
      insights.push({
        id: `rsi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'BEARISH',
        underlying: symbol,
        title: 'Overbought Condition Detected',
        description: `RSI at ${indicators.rsi.toFixed(1)} indicates overbought conditions. Consider taking profits or shorting opportunities.`,
        confidence: Math.min(0.8, (indicators.rsi - 70) / 30),
        severity: indicators.rsi > 80 ? 'HIGH' : 'MEDIUM',
        signals: ['RSI_OVERBOUGHT'],
        recommendation: {
          action: 'SELL',
          strategy: 'Put Options or Profit Taking',
          riskLevel: 'MEDIUM',
          timeframe: '1W',
          targetPrice: currentPrice * 0.95,
          stopLoss: currentPrice * 1.02
        },
        metadata: {
          patterns: [],
          indicators,
          marketCondition: 'OVERBOUGHT',
          volatility: indicators.volatility || 20,
          sentiment
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
      });
    }

    if (indicators.rsi < 30) {
      insights.push({
        id: `rsi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'BULLISH',
        underlying: symbol,
        title: 'Oversold Condition Detected',
        description: `RSI at ${indicators.rsi.toFixed(1)} indicates oversold conditions. Potential buying opportunity emerging.`,
        confidence: Math.min(0.8, (30 - indicators.rsi) / 30),
        severity: indicators.rsi < 20 ? 'HIGH' : 'MEDIUM',
        signals: ['RSI_OVERSOLD'],
        recommendation: {
          action: 'BUY',
          strategy: 'Call Options or Long Position',
          riskLevel: 'MEDIUM',
          timeframe: '1W',
          targetPrice: currentPrice * 1.05,
          stopLoss: currentPrice * 0.98
        },
        metadata: {
          patterns: [],
          indicators,
          marketCondition: 'OVERSOLD',
          volatility: indicators.volatility || 20,
          sentiment
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
      });
    }

    // Volatility insights
    if (indicators.volatility > 35) {
      insights.push({
        id: `vol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'VOLATILITY',
        underlying: symbol,
        title: 'High Volatility Environment',
        description: `Implied volatility at ${indicators.volatility.toFixed(1)}% suggests elevated option premiums. Consider volatility strategies.`,
        confidence: 0.7,
        severity: 'MEDIUM',
        signals: ['HIGH_VOLATILITY'],
        recommendation: {
          action: 'HEDGE',
          strategy: 'Straddle or Strangle',
          riskLevel: 'HIGH',
          timeframe: '1M',
        },
        metadata: {
          patterns: [],
          indicators,
          marketCondition: 'VOLATILE',
          volatility: indicators.volatility,
          sentiment
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
      });
    }

    return insights;
  }

  private generateRecommendationFromPattern(pattern: PatternResult, currentPrice: number): TradingInsight['recommendation'] {
    const baseRec = {
      riskLevel: (pattern.confidence > 0.8 ? 'MEDIUM' : 'HIGH') as 'LOW' | 'MEDIUM' | 'HIGH',
      timeframe: '1W' as '1D' | '1W' | '1M' | '3M'
    };

    switch (pattern.type) {
      case 'CALL_LONG_BUILDUP':
        return {
          ...baseRec,
          action: 'BUY' as const,
          strategy: 'Long Call Options',
          targetPrice: currentPrice * 1.03,
          stopLoss: currentPrice * 0.98
        };
      
      case 'PUT_LONG_BUILDUP':
        return {
          ...baseRec,
          action: 'SELL' as const,
          strategy: 'Long Put Options',
          targetPrice: currentPrice * 0.97,
          stopLoss: currentPrice * 1.02
        };
      
      case 'GAMMA_SQUEEZE':
        return {
          ...baseRec,
          action: 'BUY' as const,
          strategy: 'Momentum Play - Calls',
          targetPrice: currentPrice * 1.05,
          stopLoss: currentPrice * 0.97
        };
      
      default:
        return {
          ...baseRec,
          action: 'WATCH' as const,
          strategy: 'Monitor for confirmation'
        };
    }
  }

  private calculateTechnicalIndicators(symbol: string, currentPrice: number): Record<string, number> {
    // Simulate technical indicators with realistic values
    return {
      rsi: Math.random() * 100,
      macd: (Math.random() - 0.5) * 50,
      bollinger_position: Math.random(), // 0-1 where 0.5 is middle
      volatility: Math.random() * 40 + 10,
      volume_ratio: Math.random() * 3 + 0.5,
      momentum: (Math.random() - 0.5) * 10,
      support_distance: Math.random() * 0.05, // % from support
      resistance_distance: Math.random() * 0.05 // % to resistance
    };
  }

  private analyzeSentiment(optionChain: OptionChainData[], patterns: PatternResult[]): number {
    // Calculate sentiment based on Put/Call ratio and patterns
    const totalCallOI = optionChain.reduce((sum, opt) => sum + opt.callOI, 0);
    const totalPutOI = optionChain.reduce((sum, opt) => sum + opt.putOI, 0);
    const pcRatio = totalPutOI / (totalCallOI || 1);
    
    let sentiment = 0;
    
    // PCR-based sentiment (inverted - high PCR = bearish)
    if (pcRatio > 1.2) sentiment -= 0.3;
    else if (pcRatio < 0.8) sentiment += 0.3;
    
    // Pattern-based sentiment
    patterns.forEach(pattern => {
      if (pattern.direction === 'BULLISH') sentiment += pattern.confidence * 0.4;
      else if (pattern.direction === 'BEARISH') sentiment -= pattern.confidence * 0.4;
    });
    
    return Math.max(-1, Math.min(1, sentiment));
  }

  private async updateMarketSentiment(): Promise<void> {
    // Calculate overall market sentiment
    const insights = Array.from(this.insights.values());
    
    let overallSentiment = 0;
    let totalWeight = 0;
    
    insights.forEach(insight => {
      const weight = insight.confidence;
      if (insight.type === 'BULLISH') overallSentiment += weight;
      else if (insight.type === 'BEARISH') overallSentiment -= weight;
      totalWeight += weight;
    });
    
    this.marketSentiment = {
      overall: totalWeight > 0 ? overallSentiment / totalWeight : 0,
      putCallRatio: 1.1 + Math.random() * 0.4,
      volatilityIndex: 15 + Math.random() * 20,
      momentumScore: (Math.random() - 0.5) * 2,
      supportResistance: {
        support: [21800, 21900, 22000],
        resistance: [22200, 22300, 22400]
      },
      marketRegime: this.determineMarketRegime()
    };
  }

  private determineMarketRegime(): MarketSentiment['marketRegime'] {
    const vol = Math.random() * 40;
    if (vol > 30) return 'VOLATILE';
    if (vol < 15) return 'CALM';
    
    const trend = Math.random();
    return trend > 0.6 ? 'TRENDING' : 'RANGING';
  }

  private async generateRecommendations(): Promise<void> {
    const insights = Array.from(this.insights.values())
      .filter(insight => insight.confidence > 0.75)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 insights

    for (const insight of insights) {
      const recommendation: AIRecommendation = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        underlying: insight.underlying,
        strategy: this.generateStrategyFromInsight(insight),
        action: this.mapActionFromRecommendation(insight.recommendation.action),
        confidence: insight.confidence,
        reasoning: this.generateReasoning(insight),
        riskReward: {
          expectedReturn: this.calculateExpectedReturn(insight),
          maxRisk: this.calculateMaxRisk(insight),
          probability: insight.confidence
        },
        execution: this.generateExecutionPlan(insight),
        createdAt: new Date()
      };

      this.recommendations.set(recommendation.id, recommendation);
      this.emit('newRecommendation', recommendation);
    }
  }

  private generateStrategyFromInsight(insight: TradingInsight): string {
    const strategies = {
      'BULLISH': ['Long Call', 'Bull Call Spread', 'Cash Secured Put'],
      'BEARISH': ['Long Put', 'Bear Put Spread', 'Covered Call'],
      'NEUTRAL': ['Iron Condor', 'Butterfly Spread', 'Covered Call'],
      'VOLATILITY': ['Long Straddle', 'Long Strangle', 'Calendar Spread'],
      'ARBITRAGE': ['Box Spread', 'Calendar Spread', 'Conversion']
    };
    
    const typeStrategies = strategies[insight.type] || strategies['NEUTRAL'];
    return typeStrategies[Math.floor(Math.random() * typeStrategies.length)];
  }

  private mapActionFromRecommendation(action: string): AIRecommendation['action'] {
    switch (action) {
      case 'BUY': return 'ENTRY';
      case 'SELL': return 'ENTRY';
      case 'HOLD': return 'MONITOR';
      default: return 'MONITOR';
    }
  }

  private generateReasoning(insight: TradingInsight): string[] {
    const reasoning = [
      `${insight.type.toLowerCase()} bias with ${(insight.confidence * 100).toFixed(0)}% confidence`,
      `Pattern: ${insight.signals.join(', ')}`,
      `Market condition: ${insight.metadata.marketCondition}`
    ];

    if (insight.metadata.volatility > 25) {
      reasoning.push('Elevated volatility environment');
    }

    return reasoning;
  }

  private calculateExpectedReturn(insight: TradingInsight): number {
    const baseReturn = insight.confidence * 0.15; // 15% max return
    const volatilityMultiplier = Math.min(2, insight.metadata.volatility / 20);
    return baseReturn * volatilityMultiplier;
  }

  private calculateMaxRisk(insight: TradingInsight): number {
    const riskMultiplier = {
      'LOW': 0.02,
      'MEDIUM': 0.05,
      'HIGH': 0.10
    };
    return riskMultiplier[insight.recommendation.riskLevel] || 0.05;
  }

  private generateExecutionPlan(insight: TradingInsight): AIRecommendation['execution'] {
    const currentPrice = this.getCurrentPrice(insight.underlying);
    
    return {
      strikes: [
        Math.round(currentPrice * 0.98 / 50) * 50,
        Math.round(currentPrice / 50) * 50,
        Math.round(currentPrice * 1.02 / 50) * 50
      ],
      expirations: [this.getNextExpiry(), this.getNextMonthExpiry()],
      quantities: [1, 2, 1],
      orderType: insight.confidence > 0.85 ? 'MARKET' : 'LIMIT'
    };
  }

  private generateMockOptionChain(symbol: string): OptionChainData[] {
    const basePrice = this.getCurrentPrice(symbol);
    const strikes = [];
    
    for (let i = -5; i <= 5; i++) {
      strikes.push(Math.round((basePrice + i * 50) / 50) * 50);
    }
    
    return strikes.map(strike => ({
      strike,
      callOI: Math.floor(Math.random() * 50000) + 10000,
      callOIChange: Math.floor(Math.random() * 10000) - 5000,
      callLTP: Math.max(1, basePrice - strike + Math.random() * 100),
      callLTPChange: (Math.random() - 0.5) * 20,
      callVolume: Math.floor(Math.random() * 5000),
      putOI: Math.floor(Math.random() * 45000) + 8000,
      putOIChange: Math.floor(Math.random() * 8000) - 4000,
      putLTP: Math.max(1, strike - basePrice + Math.random() * 80),
      putLTPChange: (Math.random() - 0.5) * 15,
      putVolume: Math.floor(Math.random() * 4000)
    }));
  }

  private getCurrentPrice(symbol: string): number {
    const prices: Record<string, number> = {
      'NIFTY': 22150,
      'BANKNIFTY': 45300,
      'FINNIFTY': 18200,
      'GOLD': 62000,
      'SILVER': 72000
    };
    return prices[symbol] || 22150;
  }

  private getMarketCondition(indicators: Record<string, number>): string {
    if (indicators.rsi > 70) return 'OVERBOUGHT';
    if (indicators.rsi < 30) return 'OVERSOLD';
    if (indicators.volatility > 30) return 'VOLATILE';
    return 'NORMAL';
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();
    return day >= 1 && day <= 5 && hours >= 9 && hours < 16;
  }

  private getNextExpiry(): string {
    const now = new Date();
    const nextThursday = new Date(now);
    const daysUntilThursday = (4 - now.getDay() + 7) % 7;
    nextThursday.setDate(now.getDate() + (daysUntilThursday || 7));
    return nextThursday.toISOString().split('T')[0];
  }

  private getNextMonthExpiry(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastThursday = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
    lastThursday.setDate(lastThursday.getDate() - ((lastThursday.getDay() + 3) % 7));
    return lastThursday.toISOString().split('T')[0];
  }

  // Public API methods
  getInsights(symbol?: string): TradingInsight[] {
    const insights = Array.from(this.insights.values())
      .filter(insight => !symbol || insight.underlying === symbol)
      .filter(insight => insight.expiresAt > new Date())
      .sort((a, b) => b.confidence - a.confidence);
    
    return insights.slice(0, 10);
  }

  getRecommendations(symbol?: string): AIRecommendation[] {
    return Array.from(this.recommendations.values())
      .filter(rec => !symbol || rec.underlying === symbol)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  getMarketSentiment(): MarketSentiment | null {
    return this.marketSentiment;
  }

  getAIAnalytics(): {
    totalInsights: number;
    averageConfidence: number;
    topPatterns: string[];
    marketBias: string;
  } {
    const insights = Array.from(this.insights.values());
    const avgConfidence = insights.length > 0 
      ? insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length
      : 0;
    
    const patternCounts = new Map<string, number>();
    insights.forEach(insight => {
      insight.signals.forEach(signal => {
        patternCounts.set(signal, (patternCounts.get(signal) || 0) + 1);
      });
    });
    
    const topPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);
    
    const bullishCount = insights.filter(i => i.type === 'BULLISH').length;
    const bearishCount = insights.filter(i => i.type === 'BEARISH').length;
    const marketBias = bullishCount > bearishCount ? 'BULLISH' : 
                      bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';
    
    return {
      totalInsights: insights.length,
      averageConfidence: avgConfidence,
      topPatterns,
      marketBias
    };
  }

  stop(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    this.insights.clear();
    this.recommendations.clear();
    this.isInitialized = false;
    
    console.log('🤖 AI Insights Engine stopped');
  }
}

// Export singleton instance
export const aiInsightsEngine = new AIInsightsEngine();