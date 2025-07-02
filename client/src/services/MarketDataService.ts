import { DatabaseService } from '../lib/database';
import { PatternDetector, PatternResult, OptionChainData, MarketContext } from './PatternDetector';
import { AuthService } from './AuthService';

export interface MarketDataUpdate {
  underlying: string;
  price: number;
  options: OptionChainData[];
  timestamp: string;
  patterns: PatternResult[];
  marketContext?: MarketContext;
}

export interface MarketAlert {
  id: string;
  type: 'PATTERN_DETECTED' | 'PRICE_MOVEMENT' | 'VOLUME_SPIKE' | 'OI_CHANGE' | 'VOLATILITY_SPIKE' | 'GAMMA_ALERT' | 'MAX_PAIN_SHIFT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  underlying: string;
  strike?: number;
  timestamp: string;
  acknowledged: boolean;
  metadata?: {
    confidence?: number;
    timeframe?: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    expectedMove?: number;
  };
}

export class MarketDataService {
  private static instance: MarketDataService;
  private subscribers: ((update: MarketDataUpdate) => void)[] = [];
  private alertSubscribers: ((alert: MarketAlert) => void)[] = [];
  private previousData: Map<string, OptionChainData[]> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private alertHistory: MarketAlert[] = [];
  private patternHistory: Map<string, PatternResult[]> = new Map();

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  subscribe(callback: (update: MarketDataUpdate) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  subscribeToAlerts(callback: (alert: MarketAlert) => void): () => void {
    this.alertSubscribers.push(callback);
    return () => {
      this.alertSubscribers = this.alertSubscribers.filter(sub => sub !== callback);
    };
  }

  async processMarketData(
    underlying: string,
    price: number,
    options: OptionChainData[]
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Update price history
    this.updatePriceHistory(underlying, price);
    
    // Generate market context
    const marketContext = this.generateMarketContext(underlying, price);
    
    // Detect patterns with enhanced analysis
    const patterns = PatternDetector.analyzeOptionChain(options, underlying, price, marketContext);
    
    // Check for emerging patterns if we have previous data
    const previousOptions = this.previousData.get(underlying);
    if (previousOptions) {
      const emergingPatterns = PatternDetector.monitorPatterns(
        previousOptions,
        options,
        underlying,
        price,
        marketContext
      );
      patterns.push(...emergingPatterns);
    }

    // Validate and score patterns
    const validatedPatterns = PatternDetector.validatePatterns(patterns);
    const scoredPatterns = PatternDetector.scorePatterns(validatedPatterns);

    // Store current data for next comparison
    this.previousData.set(underlying, [...options]);
    this.patternHistory.set(underlying, scoredPatterns);

    // Generate enhanced alerts for significant patterns
    await this.generateEnhancedAlerts(scoredPatterns, underlying, price, marketContext);

    // Store patterns in database only if user is authenticated
    try {
      await this.storePatterns(scoredPatterns);
    } catch (error) {
      console.error('Failed to store patterns in database:', error);
      // Continue execution even if database storage fails
    }

    // Notify subscribers
    const update: MarketDataUpdate = {
      underlying,
      price,
      options,
      timestamp,
      patterns: scoredPatterns,
      marketContext
    };

    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in market data subscriber:', error);
      }
    });
  }

  private updatePriceHistory(underlying: string, price: number): void {
    if (!this.priceHistory.has(underlying)) {
      this.priceHistory.set(underlying, []);
    }
    const history = this.priceHistory.get(underlying)!;
    history.push(price);
    if (history.length > 100) {
      history.shift();
    }
  }

  private generateMarketContext(underlying: string, currentPrice: number): MarketContext {
    const priceHistory = this.priceHistory.get(underlying) || [];
    const previousPrice = priceHistory.length > 1 ? priceHistory[priceHistory.length - 2] : currentPrice;
    
    // Calculate volatility (simplified)
    const volatility = this.calculateVolatility(priceHistory);
    
    // Determine trend
    const trend = this.determineTrend(priceHistory);
    
    // Calculate volume (simplified - would need actual volume data)
    const volume = Math.random() * 1000000; // Mock volume
    
    // Determine time of day
    const timeOfDay = this.getTimeOfDay();
    
    return {
      currentPrice,
      previousPrice,
      volatility,
      trend,
      volume,
      timeOfDay
    };
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  private determineTrend(prices: number[]): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
    if (prices.length < 10) return 'SIDEWAYS';
    
    const recent = prices.slice(-10);
    const older = prices.slice(-20, -10);
    
    if (older.length === 0) return 'SIDEWAYS';
    
    const recentAvg = recent.reduce((sum, price) => sum + price, 0) / recent.length;
    const olderAvg = older.reduce((sum, price) => sum + price, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.005) return 'UPTREND';
    if (change < -0.005) return 'DOWNTREND';
    return 'SIDEWAYS';
  }

  private getTimeOfDay(): 'OPENING' | 'MID_SESSION' | 'CLOSING' | 'AFTER_HOURS' {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // IST market hours: 9:15 AM - 3:30 PM
    const marketOpen = 9 * 60 + 15; // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM
    
    if (timeInMinutes < marketOpen || timeInMinutes > marketClose) {
      return 'AFTER_HOURS';
    } else if (timeInMinutes < marketOpen + 30) {
      return 'OPENING';
    } else if (timeInMinutes > marketClose - 30) {
      return 'CLOSING';
    } else {
      return 'MID_SESSION';
    }
  }

  private async generateEnhancedAlerts(
    patterns: PatternResult[],
    underlying: string,
    price: number,
    marketContext: MarketContext
  ): Promise<void> {
    const highConfidencePatterns = patterns.filter(p => p.confidence >= 0.7);
    
    for (const pattern of highConfidencePatterns) {
      // Check if we've already alerted for this pattern recently
      const recentAlert = this.alertHistory.find(alert => 
        alert.underlying === underlying &&
        alert.strike === pattern.strike &&
        alert.type === 'PATTERN_DETECTED' &&
        Date.now() - new Date(alert.timestamp).getTime() < 5 * 60 * 1000 // 5 minutes
      );

      if (recentAlert) continue;

      const alert: MarketAlert = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: this.getAlertTypeFromPattern(pattern),
        severity: this.getSeverityFromPattern(pattern),
        title: `${pattern.strength} ${pattern.type.replace(/_/g, ' ')} Detected`,
        message: `${underlying}: ${pattern.description}`,
        underlying,
        strike: pattern.strike,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: {
          confidence: pattern.confidence,
          timeframe: pattern.timeframe,
          riskLevel: pattern.metadata?.riskLevel,
          expectedMove: pattern.metadata?.expectedMove
        }
      };

      this.alertHistory.push(alert);
      
      // Keep only last 100 alerts
      if (this.alertHistory.length > 100) {
        this.alertHistory = this.alertHistory.slice(-100);
      }

      // Notify alert subscribers
      this.alertSubscribers.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Error in alert subscriber:', error);
        }
      });
    }

    // Generate additional alerts for specific conditions
    await this.generateSpecializedAlerts(patterns, underlying, price, marketContext);
  }

  private async generateSpecializedAlerts(
    patterns: PatternResult[],
    underlying: string,
    price: number,
    marketContext: MarketContext
  ): Promise<void> {
    // Volatility spike alert
    if (marketContext.volatility > 2.0) {
      const alert: MarketAlert = {
        id: `${Date.now()}-vol-${Math.random().toString(36).substr(2, 9)}`,
        type: 'VOLATILITY_SPIKE',
        severity: marketContext.volatility > 3.0 ? 'HIGH' : 'MEDIUM',
        title: 'High Volatility Detected',
        message: `${underlying} showing elevated volatility (${(marketContext.volatility * 100).toFixed(0)}%). Expect increased price movement.`,
        underlying,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: {
          riskLevel: marketContext.volatility > 3.0 ? 'HIGH' : 'MEDIUM'
        }
      };

      this.alertHistory.push(alert);
      this.alertSubscribers.forEach(callback => callback(alert));
    }

    // Gamma squeeze alert
    const gammaPatterns = patterns.filter(p => p.type === 'GAMMA_SQUEEZE');
    if (gammaPatterns.length > 0) {
      const highestGamma = gammaPatterns.reduce((highest, current) => 
        current.confidence > highest.confidence ? current : highest
      );

      const alert: MarketAlert = {
        id: `${Date.now()}-gamma-${Math.random().toString(36).substr(2, 9)}`,
        type: 'GAMMA_ALERT',
        severity: 'HIGH',
        title: 'Gamma Squeeze Risk',
        message: `${underlying} showing high gamma concentration at ${highestGamma.strike}. Potential for rapid price movement.`,
        underlying,
        strike: highestGamma.strike,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: {
          confidence: highestGamma.confidence,
          riskLevel: 'HIGH'
        }
      };

      this.alertHistory.push(alert);
      this.alertSubscribers.forEach(callback => callback(alert));
    }

    // Max pain shift alert
    const maxPainPatterns = patterns.filter(p => p.type === 'MAX_PAIN');
    if (maxPainPatterns.length > 0) {
      const maxPain = maxPainPatterns[0];
      const deviation = Math.abs((maxPain.strike - price) / price) * 100;

      if (deviation > 3) {
        const alert: MarketAlert = {
          id: `${Date.now()}-maxpain-${Math.random().toString(36).substr(2, 9)}`,
          type: 'MAX_PAIN_SHIFT',
          severity: deviation > 5 ? 'HIGH' : 'MEDIUM',
          title: 'Significant Max Pain Deviation',
          message: `${underlying} trading ${deviation.toFixed(1)}% away from Max Pain (${maxPain.strike}). Potential for price correction.`,
          underlying,
          strike: maxPain.strike,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          metadata: {
            expectedMove: Math.abs(maxPain.strike - price),
            riskLevel: deviation > 5 ? 'HIGH' : 'MEDIUM'
          }
        };

        this.alertHistory.push(alert);
        this.alertSubscribers.forEach(callback => callback(alert));
      }
    }
  }

  private getAlertTypeFromPattern(pattern: PatternResult): MarketAlert['type'] {
    switch (pattern.type) {
      case 'GAMMA_SQUEEZE':
        return 'GAMMA_ALERT';
      case 'MAX_PAIN':
        return 'MAX_PAIN_SHIFT';
      case 'VOLATILITY_SPIKE':
        return 'VOLATILITY_SPIKE';
      case 'UNUSUAL_ACTIVITY':
        return 'VOLUME_SPIKE';
      default:
        return 'PATTERN_DETECTED';
    }
  }

  private getSeverityFromPattern(pattern: PatternResult): MarketAlert['severity'] {
    if (pattern.confidence >= 0.9) return 'CRITICAL';
    if (pattern.confidence >= 0.8) return 'HIGH';
    if (pattern.confidence >= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  private async storePatterns(patterns: PatternResult[]): Promise<void> {
    // Check if user is authenticated before attempting to store patterns
    if (!AuthService.getInstance().isAuthenticated()) {
      console.warn('User not authenticated, skipping pattern storage');
      return;
    }

    try {
      // Get instruments from database
      const instruments = await DatabaseService.getInstruments();
      
      for (const pattern of patterns) {
        const instrument = instruments.find(i => i.symbol === pattern.underlying);
        if (!instrument) {
          console.warn(`Instrument not found for ${pattern.underlying}, skipping pattern storage`);
          continue;
        }

        const success = await DatabaseService.insertSignal({
          instrument_id: instrument.id,
          strike_price: pattern.strike,
          signal_type: pattern.type,
          direction: pattern.direction,
          description: pattern.description,
          confidence_score: pattern.confidence,
          is_active: true
        });

        if (!success) {
          console.warn(`Failed to store pattern for ${pattern.underlying} ${pattern.strike}`);
        }
      }
    } catch (error) {
      console.error('Error storing patterns:', error);
      throw error; // Re-throw to be caught by caller
    }
  }

  // Price movement alerts with enhanced logic
  async checkPriceMovements(
    underlying: string,
    currentPrice: number,
    previousPrice: number
  ): Promise<void> {
    const changePercent = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
    
    if (changePercent >= 1) { // 1% or more movement
      const severity: MarketAlert['severity'] = 
        changePercent >= 3 ? 'CRITICAL' :
        changePercent >= 2 ? 'HIGH' : 'MEDIUM';

      const alert: MarketAlert = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'PRICE_MOVEMENT',
        severity,
        title: `Significant Price Movement`,
        message: `${underlying} moved ${changePercent.toFixed(2)}% to ₹${currentPrice.toFixed(2)}`,
        underlying,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metadata: {
          expectedMove: Math.abs(currentPrice - previousPrice),
          riskLevel: changePercent >= 2 ? 'HIGH' : 'MEDIUM'
        }
      };

      this.alertHistory.push(alert);
      this.alertSubscribers.forEach(callback => callback(alert));
    }
  }

  // Volume spike detection with enhanced analysis
  async checkVolumeSpikes(options: OptionChainData[], underlying: string): Promise<void> {
    const avgVolume = options.reduce((sum, opt) => sum + opt.callVolume + opt.putVolume, 0) / (options.length * 2);
    
    options.forEach(option => {
      const totalVolume = option.callVolume + option.putVolume;
      const volumeRatio = totalVolume / avgVolume;

      if (volumeRatio > 3) { // 3x average volume
        const severity: MarketAlert['severity'] = 
          volumeRatio > 5 ? 'HIGH' : 'MEDIUM';

        const alert: MarketAlert = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'VOLUME_SPIKE',
          severity,
          title: `Volume Spike Detected`,
          message: `${underlying} ${option.strike} showing ${(totalVolume/1000).toFixed(0)}K volume (${volumeRatio.toFixed(1)}x average)`,
          underlying,
          strike: option.strike,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          metadata: {
            riskLevel: volumeRatio > 5 ? 'HIGH' : 'MEDIUM'
          }
        };

        this.alertHistory.push(alert);
        this.alertSubscribers.forEach(callback => callback(alert));
      }
    });
  }

  getAlertHistory(): MarketAlert[] {
    return [...this.alertHistory].reverse(); // Most recent first
  }

  getPatternHistory(underlying?: string): PatternResult[] {
    if (underlying) {
      return this.patternHistory.get(underlying) || [];
    }
    
    const allPatterns: PatternResult[] = [];
    this.patternHistory.forEach(patterns => {
      allPatterns.push(...patterns);
    });
    
    return allPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  clearAlerts(): void {
    this.alertHistory = [];
  }

  // Analytics methods
  getPatternStatistics(underlying?: string): {
    totalPatterns: number;
    bullishPatterns: number;
    bearishPatterns: number;
    highConfidencePatterns: number;
    patternTypes: Record<string, number>;
  } {
    const patterns = this.getPatternHistory(underlying);
    
    const stats = {
      totalPatterns: patterns.length,
      bullishPatterns: patterns.filter(p => p.direction === 'BULLISH').length,
      bearishPatterns: patterns.filter(p => p.direction === 'BEARISH').length,
      highConfidencePatterns: patterns.filter(p => p.confidence >= 0.8).length,
      patternTypes: {} as Record<string, number>
    };

    patterns.forEach(pattern => {
      stats.patternTypes[pattern.type] = (stats.patternTypes[pattern.type] || 0) + 1;
    });

    return stats;
  }
}