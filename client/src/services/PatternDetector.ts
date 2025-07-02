export interface PatternResult {
  type: 'CALL_LONG_BUILDUP' | 'PUT_LONG_BUILDUP' | 'CALL_SHORT_COVER' | 'PUT_SHORT_COVER' | 'MAX_PAIN' | 'GAMMA_SQUEEZE' | 'VOLATILITY_SPIKE' | 'UNUSUAL_ACTIVITY' | 'SUPPORT_RESISTANCE' | 'MOMENTUM_SHIFT';
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  description: string;
  strike: number;
  underlying: string;
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  timeframe: '1MIN' | '5MIN' | '15MIN' | '1HOUR' | 'DAILY';
  metadata?: {
    maxPain?: number;
    gammaLevel?: number;
    volumeRatio?: number;
    priceTarget?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    expectedMove?: number;
  };
}

export interface OptionChainData {
  strike: number;
  callOI: number;
  callOIChange: number;
  callLTP: number;
  callLTPChange: number;
  callVolume: number;
  putOI: number;
  putOIChange: number;
  putLTP: number;
  putLTPChange: number;
  putVolume: number;
  timestamp?: string;
}

export interface MarketContext {
  currentPrice: number;
  previousPrice: number;
  volatility: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  volume: number;
  timeOfDay: 'OPENING' | 'MID_SESSION' | 'CLOSING' | 'AFTER_HOURS';
}

export class PatternDetector {
  private static readonly THRESHOLDS = {
    OI_CHANGE_THRESHOLD: 5000,
    PREMIUM_CHANGE_THRESHOLD: 5,
    VOLUME_THRESHOLD: 10000,
    CONFIDENCE_HIGH: 0.8,
    CONFIDENCE_MEDIUM: 0.6,
    CONFIDENCE_LOW: 0.4,
    VOLATILITY_SPIKE_THRESHOLD: 2.0,
    UNUSUAL_VOLUME_MULTIPLIER: 3.0,
    GAMMA_SQUEEZE_THRESHOLD: 0.7,
    MAX_PAIN_DEVIATION_THRESHOLD: 2.0
  };

  private static historicalData: Map<string, OptionChainData[][]> = new Map();
  private static priceHistory: Map<string, number[]> = new Map();

  static analyzeOptionChain(
    data: OptionChainData[], 
    underlying: string,
    currentPrice: number,
    marketContext?: MarketContext
  ): PatternResult[] {
    const patterns: PatternResult[] = [];

    // Store historical data for trend analysis
    this.updateHistoricalData(underlying, data, currentPrice);

    // Find ATM strike
    const atmStrike = this.findATMStrike(data, currentPrice);
    
    // Basic pattern analysis
    data.forEach(strike => {
      const basicPatterns = this.analyzeStrike(strike, underlying, atmStrike, marketContext);
      patterns.push(...basicPatterns);
    });

    // Advanced pattern analysis
    const advancedPatterns = this.analyzeAdvancedPatterns(data, underlying, currentPrice, marketContext);
    patterns.push(...advancedPatterns);

    // Multi-timeframe analysis
    const timeframePatterns = this.analyzeMultiTimeframe(underlying, data, currentPrice);
    patterns.push(...timeframePatterns);

    // Sort by confidence and return top patterns
    return patterns
      .filter(p => p.confidence >= this.THRESHOLDS.CONFIDENCE_LOW)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 15); // Increased from 10 to 15 for more comprehensive analysis
  }

  private static updateHistoricalData(underlying: string, data: OptionChainData[], price: number): void {
    // Store option chain history (last 20 snapshots)
    if (!this.historicalData.has(underlying)) {
      this.historicalData.set(underlying, []);
    }
    const history = this.historicalData.get(underlying)!;
    history.push([...data]);
    if (history.length > 20) {
      history.shift();
    }

    // Store price history (last 100 prices)
    if (!this.priceHistory.has(underlying)) {
      this.priceHistory.set(underlying, []);
    }
    const priceHist = this.priceHistory.get(underlying)!;
    priceHist.push(price);
    if (priceHist.length > 100) {
      priceHist.shift();
    }
  }

  private static analyzeAdvancedPatterns(
    data: OptionChainData[], 
    underlying: string,
    currentPrice: number,
    marketContext?: MarketContext
  ): PatternResult[] {
    const patterns: PatternResult[] = [];

    // Max Pain Analysis
    const maxPainPattern = this.calculateMaxPainPattern(data, underlying, currentPrice);
    if (maxPainPattern) patterns.push(maxPainPattern);

    // Gamma Squeeze Detection
    const gammaPattern = this.detectGammaSqueezePattern(data, underlying, currentPrice);
    if (gammaPattern) patterns.push(gammaPattern);

    // Volatility Spike Detection
    const volatilityPattern = this.detectVolatilitySpike(data, underlying, marketContext);
    if (volatilityPattern) patterns.push(volatilityPattern);

    // Unusual Activity Detection
    const unusualActivity = this.detectUnusualActivity(data, underlying, currentPrice);
    patterns.push(...unusualActivity);

    // Support/Resistance Levels
    const supportResistance = this.detectSupportResistanceLevels(data, underlying, currentPrice);
    patterns.push(...supportResistance);

    // Momentum Shift Detection
    const momentumShift = this.detectMomentumShift(underlying, currentPrice, marketContext);
    if (momentumShift) patterns.push(momentumShift);

    return patterns;
  }

  private static calculateMaxPainPattern(
    data: OptionChainData[], 
    underlying: string,
    currentPrice: number
  ): PatternResult | null {
    const maxPain = this.calculateMaxPain(data);
    const deviation = Math.abs(maxPain - currentPrice);
    const deviationPercent = (deviation / currentPrice) * 100;

    if (deviationPercent > this.THRESHOLDS.MAX_PAIN_DEVIATION_THRESHOLD) {
      const direction = maxPain > currentPrice ? 'BULLISH' : 'BEARISH';
      const confidence = Math.min(0.9, deviationPercent / 5);
      
      return {
        type: 'MAX_PAIN',
        direction,
        confidence,
        description: `Max Pain at ${maxPain.toFixed(0)} suggests ${direction.toLowerCase()} pressure. Current price: ${currentPrice.toFixed(0)} (${deviationPercent.toFixed(1)}% deviation)`,
        strike: maxPain,
        underlying,
        strength: this.getStrength(confidence),
        timeframe: 'DAILY',
        metadata: {
          maxPain,
          expectedMove: deviation,
          riskLevel: deviationPercent > 5 ? 'HIGH' : deviationPercent > 3 ? 'MEDIUM' : 'LOW'
        }
      };
    }

    return null;
  }

  private static detectGammaSqueezePattern(
    data: OptionChainData[], 
    underlying: string,
    currentPrice: number
  ): PatternResult | null {
    // Find strikes within 2% of current price
    const nearbyStrikes = data.filter(strike => 
      Math.abs(strike.strike - currentPrice) / currentPrice <= 0.02
    );

    let maxGammaRisk = 0;
    let riskDirection: 'BULLISH' | 'BEARISH' = 'BULLISH';
    let riskStrike = currentPrice;
    let totalOI = 0;

    nearbyStrikes.forEach(strike => {
      const totalStrikeOI = strike.callOI + strike.putOI;
      totalOI += totalStrikeOI;

      // High call OI above current price suggests gamma squeeze risk on upside
      if (strike.strike > currentPrice) {
        const callGammaRisk = (strike.callOI * strike.callVolume) / 1000000;
        if (callGammaRisk > maxGammaRisk) {
          maxGammaRisk = callGammaRisk;
          riskDirection = 'BULLISH';
          riskStrike = strike.strike;
        }
      }

      // High put OI below current price suggests gamma squeeze risk on downside
      if (strike.strike < currentPrice) {
        const putGammaRisk = (strike.putOI * strike.putVolume) / 1000000;
        if (putGammaRisk > maxGammaRisk) {
          maxGammaRisk = putGammaRisk;
          riskDirection = 'BEARISH';
          riskStrike = strike.strike;
        }
      }
    });

    const normalizedRisk = Math.min(1, maxGammaRisk);
    
    if (normalizedRisk > this.THRESHOLDS.GAMMA_SQUEEZE_THRESHOLD) {
      return {
        type: 'GAMMA_SQUEEZE',
        direction: riskDirection,
        confidence: normalizedRisk,
        description: `High gamma concentration near ${riskStrike.toFixed(0)}. Potential for rapid ${riskDirection.toLowerCase()} movement. Total nearby OI: ${(totalOI/1000).toFixed(0)}K`,
        strike: riskStrike,
        underlying,
        strength: this.getStrength(normalizedRisk),
        timeframe: '15MIN',
        metadata: {
          gammaLevel: normalizedRisk,
          expectedMove: Math.abs(riskStrike - currentPrice),
          riskLevel: normalizedRisk > 0.8 ? 'HIGH' : 'MEDIUM'
        }
      };
    }

    return null;
  }

  private static detectVolatilitySpike(
    data: OptionChainData[], 
    underlying: string,
    marketContext?: MarketContext
  ): PatternResult | null {
    // Calculate implied volatility proxy from option premiums
    const atmOptions = data.filter(strike => 
      Math.abs(strike.strike - (marketContext?.currentPrice || 0)) < 100
    );

    if (atmOptions.length === 0) return null;

    const avgCallPremium = atmOptions.reduce((sum, opt) => sum + opt.callLTP, 0) / atmOptions.length;
    const avgPutPremium = atmOptions.reduce((sum, opt) => sum + opt.putLTP, 0) / atmOptions.length;
    const avgPremium = (avgCallPremium + avgPutPremium) / 2;

    // Compare with historical average (simplified calculation)
    const historicalAvg = avgPremium * 0.8; // Assume current is 25% higher than historical
    const volatilityRatio = avgPremium / historicalAvg;

    if (volatilityRatio > this.THRESHOLDS.VOLATILITY_SPIKE_THRESHOLD) {
      const confidence = Math.min(0.9, (volatilityRatio - 1) * 2);
      
      return {
        type: 'VOLATILITY_SPIKE',
        direction: 'NEUTRAL',
        confidence,
        description: `Volatility spike detected. Option premiums ${((volatilityRatio - 1) * 100).toFixed(0)}% above normal. Expect increased price movement.`,
        strike: marketContext?.currentPrice || 0,
        underlying,
        strength: this.getStrength(confidence),
        timeframe: '1HOUR',
        metadata: {
          volumeRatio: volatilityRatio,
          riskLevel: volatilityRatio > 2.5 ? 'HIGH' : 'MEDIUM'
        }
      };
    }

    return null;
  }

  private static detectUnusualActivity(
    data: OptionChainData[], 
    underlying: string,
    currentPrice: number
  ): PatternResult[] {
    const patterns: PatternResult[] = [];
    const avgVolume = data.reduce((sum, opt) => sum + opt.callVolume + opt.putVolume, 0) / (data.length * 2);

    data.forEach(option => {
      const totalVolume = option.callVolume + option.putVolume;
      const volumeRatio = totalVolume / avgVolume;

      if (volumeRatio > this.THRESHOLDS.UNUSUAL_VOLUME_MULTIPLIER) {
        const confidence = Math.min(0.85, volumeRatio / 5);
        const isCall = option.callVolume > option.putVolume;
        const direction = isCall ? 'BULLISH' : 'BEARISH';

        patterns.push({
          type: 'UNUSUAL_ACTIVITY',
          direction,
          confidence,
          description: `Unusual ${isCall ? 'call' : 'put'} activity at ${option.strike}. Volume ${volumeRatio.toFixed(1)}x average (${(totalVolume/1000).toFixed(0)}K contracts)`,
          strike: option.strike,
          underlying,
          strength: this.getStrength(confidence),
          timeframe: '5MIN',
          metadata: {
            volumeRatio,
            riskLevel: volumeRatio > 5 ? 'HIGH' : 'MEDIUM'
          }
        });
      }
    });

    return patterns.slice(0, 3); // Limit to top 3 unusual activities
  }

  private static detectSupportResistanceLevels(
    data: OptionChainData[], 
    underlying: string,
    currentPrice: number
  ): PatternResult[] {
    const patterns: PatternResult[] = [];
    
    // Find strikes with high OI that could act as support/resistance
    const highOIStrikes = data
      .filter(strike => strike.callOI + strike.putOI > 50000)
      .sort((a, b) => (b.callOI + b.putOI) - (a.callOI + a.putOI))
      .slice(0, 5);

    highOIStrikes.forEach(strike => {
      const totalOI = strike.callOI + strike.putOI;
      const distance = Math.abs(strike.strike - currentPrice);
      const distancePercent = (distance / currentPrice) * 100;

      // Only consider levels within 5% of current price
      if (distancePercent <= 5) {
        const isSupport = strike.strike < currentPrice;
        const confidence = Math.min(0.8, totalOI / 200000);

        patterns.push({
          type: 'SUPPORT_RESISTANCE',
          direction: isSupport ? 'BULLISH' : 'BEARISH',
          confidence,
          description: `Strong ${isSupport ? 'support' : 'resistance'} at ${strike.strike} with ${(totalOI/1000).toFixed(0)}K OI. ${distancePercent.toFixed(1)}% from current price.`,
          strike: strike.strike,
          underlying,
          strength: this.getStrength(confidence),
          timeframe: 'DAILY',
          metadata: {
            riskLevel: distancePercent < 1 ? 'HIGH' : distancePercent < 3 ? 'MEDIUM' : 'LOW'
          }
        });
      }
    });

    return patterns;
  }

  private static detectMomentumShift(
    underlying: string,
    currentPrice: number,
    marketContext?: MarketContext
  ): PatternResult | null {
    const priceHistory = this.priceHistory.get(underlying);
    if (!priceHistory || priceHistory.length < 10) return null;

    const recentPrices = priceHistory.slice(-10);
    const olderPrices = priceHistory.slice(-20, -10);

    if (olderPrices.length === 0) return null;

    const recentAvg = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const olderAvg = olderPrices.reduce((sum, price) => sum + price, 0) / olderPrices.length;

    const momentumChange = (recentAvg - olderAvg) / olderAvg;
    const momentumStrength = Math.abs(momentumChange);

    if (momentumStrength > 0.005) { // 0.5% momentum shift
      const direction = momentumChange > 0 ? 'BULLISH' : 'BEARISH';
      const confidence = Math.min(0.8, momentumStrength * 100);

      return {
        type: 'MOMENTUM_SHIFT',
        direction,
        confidence,
        description: `${direction.toLowerCase()} momentum shift detected. Price trend changed by ${(momentumChange * 100).toFixed(2)}% in recent periods.`,
        strike: currentPrice,
        underlying,
        strength: this.getStrength(confidence),
        timeframe: '15MIN',
        metadata: {
          expectedMove: Math.abs(recentAvg - olderAvg),
          riskLevel: momentumStrength > 0.02 ? 'HIGH' : momentumStrength > 0.01 ? 'MEDIUM' : 'LOW'
        }
      };
    }

    return null;
  }

  private static analyzeMultiTimeframe(
    underlying: string,
    data: OptionChainData[],
    currentPrice: number
  ): PatternResult[] {
    const patterns: PatternResult[] = [];
    const history = this.historicalData.get(underlying);
    
    if (!history || history.length < 5) return patterns;

    // Analyze 5-minute trend
    const recent5Min = history.slice(-3); // Last 3 snapshots
    if (recent5Min.length >= 2) {
      const trend5Min = this.calculateTrend(recent5Min, currentPrice);
      if (trend5Min) {
        patterns.push({
          ...trend5Min,
          timeframe: '5MIN',
          underlying
        });
      }
    }

    // Analyze 15-minute trend
    const recent15Min = history.slice(-6); // Last 6 snapshots
    if (recent15Min.length >= 3) {
      const trend15Min = this.calculateTrend(recent15Min, currentPrice);
      if (trend15Min) {
        patterns.push({
          ...trend15Min,
          timeframe: '15MIN',
          underlying
        });
      }
    }

    return patterns;
  }

  private static calculateTrend(
    historicalSnapshots: OptionChainData[][],
    currentPrice: number
  ): Partial<PatternResult> | null {
    if (historicalSnapshots.length < 2) return null;

    // Calculate OI changes across timeframes
    const firstSnapshot = historicalSnapshots[0];
    const lastSnapshot = historicalSnapshots[historicalSnapshots.length - 1];

    let totalCallOIChange = 0;
    let totalPutOIChange = 0;
    let significantChanges = 0;

    firstSnapshot.forEach(firstStrike => {
      const lastStrike = lastSnapshot.find(s => s.strike === firstStrike.strike);
      if (lastStrike) {
        const callOIChange = lastStrike.callOI - firstStrike.callOI;
        const putOIChange = lastStrike.putOI - firstStrike.putOI;
        
        totalCallOIChange += callOIChange;
        totalPutOIChange += putOIChange;
        
        if (Math.abs(callOIChange) > 5000 || Math.abs(putOIChange) > 5000) {
          significantChanges++;
        }
      }
    });

    if (significantChanges > 0) {
      const netOIChange = totalCallOIChange - totalPutOIChange;
      const direction = netOIChange > 0 ? 'BULLISH' : 'BEARISH';
      const confidence = Math.min(0.7, significantChanges / 10);

      return {
        type: netOIChange > 0 ? 'CALL_LONG_BUILDUP' : 'PUT_LONG_BUILDUP',
        direction,
        confidence,
        description: `Multi-timeframe ${direction.toLowerCase()} buildup. Net OI change: ${(netOIChange/1000).toFixed(0)}K across ${significantChanges} strikes`,
        strike: currentPrice,
        strength: this.getStrength(confidence)
      };
    }

    return null;
  }

  // Enhanced existing methods
  private static findATMStrike(data: OptionChainData[], currentPrice: number): number {
    return data.reduce((closest, strike) => 
      Math.abs(strike.strike - currentPrice) < Math.abs(closest.strike - currentPrice) 
        ? strike 
        : closest
    ).strike;
  }

  private static analyzeStrike(
    strike: OptionChainData, 
    underlying: string,
    atmStrike: number,
    marketContext?: MarketContext
  ): PatternResult[] {
    const patterns: PatternResult[] = [];
    const { THRESHOLDS } = this;

    // Enhanced confidence calculation with market context
    const contextMultiplier = this.getContextMultiplier(marketContext);

    // Call Long Buildup Pattern
    if (strike.callOIChange > THRESHOLDS.OI_CHANGE_THRESHOLD && 
        strike.callLTPChange > THRESHOLDS.PREMIUM_CHANGE_THRESHOLD) {
      
      const confidence = this.calculateEnhancedConfidence(
        strike.callOIChange,
        strike.callLTPChange,
        strike.callVolume,
        strike.strike,
        atmStrike,
        contextMultiplier
      );

      patterns.push({
        type: 'CALL_LONG_BUILDUP',
        direction: 'BULLISH',
        confidence,
        description: `Strong call buying at ${strike.strike}. OI +${(strike.callOIChange/1000).toFixed(0)}K, Premium +₹${strike.callLTPChange.toFixed(2)}`,
        strike: strike.strike,
        underlying,
        strength: this.getStrength(confidence),
        timeframe: '5MIN',
        metadata: {
          volumeRatio: strike.callVolume / 10000,
          riskLevel: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW'
        }
      });
    }

    // Put Long Buildup Pattern
    if (strike.putOIChange > THRESHOLDS.OI_CHANGE_THRESHOLD && 
        strike.putLTPChange > THRESHOLDS.PREMIUM_CHANGE_THRESHOLD) {
      
      const confidence = this.calculateEnhancedConfidence(
        strike.putOIChange,
        strike.putLTPChange,
        strike.putVolume,
        strike.strike,
        atmStrike,
        contextMultiplier
      );

      patterns.push({
        type: 'PUT_LONG_BUILDUP',
        direction: 'BEARISH',
        confidence,
        description: `Heavy put accumulation at ${strike.strike}. OI +${(strike.putOIChange/1000).toFixed(0)}K, Premium +₹${strike.putLTPChange.toFixed(2)}`,
        strike: strike.strike,
        underlying,
        strength: this.getStrength(confidence),
        timeframe: '5MIN',
        metadata: {
          volumeRatio: strike.putVolume / 10000,
          riskLevel: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW'
        }
      });
    }

    // Call Short Covering Pattern
    if (strike.callOIChange < -THRESHOLDS.OI_CHANGE_THRESHOLD && 
        strike.callLTPChange > THRESHOLDS.PREMIUM_CHANGE_THRESHOLD) {
      
      const confidence = this.calculateEnhancedConfidence(
        Math.abs(strike.callOIChange),
        strike.callLTPChange,
        strike.callVolume,
        strike.strike,
        atmStrike,
        contextMultiplier
      );

      patterns.push({
        type: 'CALL_SHORT_COVER',
        direction: 'BULLISH',
        confidence,
        description: `Call short covering at ${strike.strike}. OI ${(strike.callOIChange/1000).toFixed(0)}K, Premium +₹${strike.callLTPChange.toFixed(2)}`,
        strike: strike.strike,
        underlying,
        strength: this.getStrength(confidence),
        timeframe: '5MIN',
        metadata: {
          volumeRatio: strike.callVolume / 10000,
          riskLevel: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW'
        }
      });
    }

    // Put Short Covering Pattern
    if (strike.putOIChange < -THRESHOLDS.OI_CHANGE_THRESHOLD && 
        strike.putLTPChange > THRESHOLDS.PREMIUM_CHANGE_THRESHOLD) {
      
      const confidence = this.calculateEnhancedConfidence(
        Math.abs(strike.putOIChange),
        strike.putLTPChange,
        strike.putVolume,
        strike.strike,
        atmStrike,
        contextMultiplier
      );

      patterns.push({
        type: 'PUT_SHORT_COVER',
        direction: 'BEARISH',
        confidence,
        description: `Put short covering at ${strike.strike}. OI ${(strike.putOIChange/1000).toFixed(0)}K, Premium +₹${strike.putLTPChange.toFixed(2)}`,
        strike: strike.strike,
        underlying,
        strength: this.getStrength(confidence),
        timeframe: '5MIN',
        metadata: {
          volumeRatio: strike.putVolume / 10000,
          riskLevel: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW'
        }
      });
    }

    return patterns;
  }

  private static getContextMultiplier(marketContext?: MarketContext): number {
    if (!marketContext) return 1.0;

    let multiplier = 1.0;

    // Time of day adjustment
    switch (marketContext.timeOfDay) {
      case 'OPENING':
        multiplier *= 1.2; // Higher confidence during opening
        break;
      case 'CLOSING':
        multiplier *= 1.1; // Slightly higher during closing
        break;
      case 'MID_SESSION':
        multiplier *= 1.0; // Normal confidence
        break;
      case 'AFTER_HOURS':
        multiplier *= 0.8; // Lower confidence after hours
        break;
    }

    // Volatility adjustment
    if (marketContext.volatility > 2.0) {
      multiplier *= 1.1; // Higher confidence in high volatility
    } else if (marketContext.volatility < 0.5) {
      multiplier *= 0.9; // Lower confidence in low volatility
    }

    // Trend adjustment
    if (marketContext.trend !== 'SIDEWAYS') {
      multiplier *= 1.05; // Slightly higher confidence in trending markets
    }

    return Math.min(1.3, Math.max(0.7, multiplier));
  }

  private static calculateEnhancedConfidence(
    oiChange: number,
    premiumChange: number,
    volume: number,
    strike: number,
    atmStrike: number,
    contextMultiplier: number
  ): number {
    let confidence = 0;

    // OI change contribution (35%)
    const oiScore = Math.min(1, Math.abs(oiChange) / 50000) * 0.35;
    confidence += oiScore;

    // Premium change contribution (25%)
    const premiumScore = Math.min(1, Math.abs(premiumChange) / 20) * 0.25;
    confidence += premiumScore;

    // Volume contribution (20%)
    const volumeScore = Math.min(1, volume / 100000) * 0.20;
    confidence += volumeScore;

    // Distance from ATM contribution (10%)
    const distanceFromATM = Math.abs(strike - atmStrike) / atmStrike;
    const atmScore = Math.max(0, 1 - distanceFromATM * 5) * 0.10;
    confidence += atmScore;

    // Consistency score (10%) - how well all factors align
    const consistencyScore = (oiScore + premiumScore + volumeScore) / 3 * 0.10;
    confidence += consistencyScore;

    // Apply context multiplier
    confidence *= contextMultiplier;

    return Math.min(1, confidence);
  }

  private static calculateMaxPain(data: OptionChainData[]): number {
    let minPain = Infinity;
    let maxPainStrike = 0;

    data.forEach(strike => {
      let totalPain = 0;

      // Calculate pain for all strikes
      data.forEach(otherStrike => {
        if (otherStrike.strike < strike.strike) {
          // ITM puts
          totalPain += otherStrike.putOI * (strike.strike - otherStrike.strike);
        }
        if (otherStrike.strike > strike.strike) {
          // ITM calls
          totalPain += otherStrike.callOI * (otherStrike.strike - strike.strike);
        }
      });

      if (totalPain < minPain) {
        minPain = totalPain;
        maxPainStrike = strike.strike;
      }
    });

    return maxPainStrike;
  }

  private static getStrength(confidence: number): 'WEAK' | 'MODERATE' | 'STRONG' {
    if (confidence >= this.THRESHOLDS.CONFIDENCE_HIGH) return 'STRONG';
    if (confidence >= this.THRESHOLDS.CONFIDENCE_MEDIUM) return 'MODERATE';
    return 'WEAK';
  }

  // Real-time pattern monitoring with enhanced features
  static monitorPatterns(
    previousData: OptionChainData[],
    currentData: OptionChainData[],
    underlying: string,
    currentPrice: number,
    marketContext?: MarketContext
  ): PatternResult[] {
    const emergingPatterns: PatternResult[] = [];

    // Compare current vs previous to detect emerging patterns
    currentData.forEach(current => {
      const previous = previousData.find(p => p.strike === current.strike);
      if (!previous) return;

      // Detect rapid changes that might indicate emerging patterns
      const oiVelocity = current.callOIChange - previous.callOIChange;
      const premiumVelocity = current.callLTPChange - previous.callLTPChange;
      const volumeAcceleration = current.callVolume - previous.callVolume;

      // Enhanced velocity detection
      if (Math.abs(oiVelocity) > 10000 && Math.abs(premiumVelocity) > 2) {
        const confidence = Math.min(0.9, Math.abs(oiVelocity) / 50000);
        const contextMultiplier = this.getContextMultiplier(marketContext);

        emergingPatterns.push({
          type: oiVelocity > 0 ? 'CALL_LONG_BUILDUP' : 'CALL_SHORT_COVER',
          direction: oiVelocity > 0 ? 'BULLISH' : 'BEARISH',
          confidence: confidence * contextMultiplier,
          description: `Rapid pattern emergence at ${current.strike}. OI velocity: ${(oiVelocity/1000).toFixed(0)}K, Volume acceleration: ${(volumeAcceleration/1000).toFixed(0)}K`,
          strike: current.strike,
          underlying,
          strength: 'STRONG',
          timeframe: '1MIN',
          metadata: {
            volumeRatio: volumeAcceleration / 10000,
            riskLevel: Math.abs(oiVelocity) > 20000 ? 'HIGH' : 'MEDIUM'
          }
        });
      }
    });

    return emergingPatterns;
  }

  // Pattern validation and filtering
  static validatePatterns(patterns: PatternResult[]): PatternResult[] {
    return patterns.filter(pattern => {
      // Remove duplicate patterns for same strike and type
      const duplicates = patterns.filter(p => 
        p.strike === pattern.strike && 
        p.type === pattern.type && 
        p.underlying === pattern.underlying
      );
      
      if (duplicates.length > 1) {
        // Keep only the highest confidence pattern
        return pattern === duplicates.reduce((highest, current) => 
          current.confidence > highest.confidence ? current : highest
        );
      }
      
      return true;
    });
  }

  // Pattern scoring for prioritization
  static scorePatterns(patterns: PatternResult[]): PatternResult[] {
    return patterns.map(pattern => {
      let score = pattern.confidence;
      
      // Boost score for high-impact patterns
      if (pattern.type === 'GAMMA_SQUEEZE' || pattern.type === 'MAX_PAIN') {
        score *= 1.2;
      }
      
      // Boost score for unusual activity
      if (pattern.type === 'UNUSUAL_ACTIVITY') {
        score *= 1.1;
      }
      
      // Boost score for shorter timeframes (more immediate)
      switch (pattern.timeframe) {
        case '1MIN':
          score *= 1.15;
          break;
        case '5MIN':
          score *= 1.1;
          break;
        case '15MIN':
          score *= 1.05;
          break;
      }
      
      return {
        ...pattern,
        confidence: Math.min(1, score)
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }
}