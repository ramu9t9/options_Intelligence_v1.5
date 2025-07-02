import { storage } from './storage';

export interface PatternResult {
  id: string;
  timestamp: string;
  underlying: string;
  strike: number;
  type: PatternType;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
  confidence: number;
  strength: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
  indicators: PatternIndicator[];
}

export interface PatternIndicator {
  name: string;
  value: number;
  threshold: number;
  status: 'TRIGGERED' | 'APPROACHING' | 'NORMAL';
}

export type PatternType = 
  | 'CALL_LONG_BUILDUP'
  | 'PUT_LONG_BUILDUP' 
  | 'CALL_SHORT_COVER'
  | 'PUT_SHORT_COVER'
  | 'GAMMA_SQUEEZE'
  | 'VOLATILITY_SPIKE'
  | 'UNUSUAL_ACTIVITY'
  | 'SUPPORT_RESISTANCE'
  | 'MOMENTUM_SHIFT'
  | 'MAX_PAIN';

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
}

export interface MarketContext {
  underlying: string;
  currentPrice: number;
  previousPrice: number;
  volatility: number;
  marketHours: boolean;
  timeframe: string;
}

export class PatternDetector {
  private static readonly THRESHOLDS = {
    // Open Interest thresholds
    OI_CHANGE_THRESHOLD: 5000,
    OI_BUILDUP_THRESHOLD: 10000,
    OI_CONCENTRATION_THRESHOLD: 0.3,
    
    // Premium change thresholds
    PREMIUM_CHANGE_THRESHOLD: 5,
    PREMIUM_SPIKE_THRESHOLD: 15,
    
    // Volume thresholds
    VOLUME_THRESHOLD: 10000,
    UNUSUAL_VOLUME_MULTIPLIER: 3,
    
    // Confidence scoring
    CONFIDENCE_HIGH: 0.8,
    CONFIDENCE_MEDIUM: 0.6,
    CONFIDENCE_LOW: 0.4,
    
    // Gamma squeeze thresholds
    GAMMA_CONCENTRATION_THRESHOLD: 0.5,
    DELTA_THRESHOLD: 0.8,
    
    // Volatility thresholds
    VOLATILITY_SPIKE_THRESHOLD: 2.0,
    VOLATILITY_CHANGE_THRESHOLD: 0.3,
    
    // Support/Resistance
    PRICE_PROXIMITY_THRESHOLD: 0.02, // 2%
    OI_SUPPORT_THRESHOLD: 50000,
  };

  static async analyzeOptionChain(
    data: OptionChainData[],
    context: MarketContext
  ): Promise<PatternResult[]> {
    const patterns: PatternResult[] = [];
    
    try {
      // Basic pattern detection
      patterns.push(...this.detectCallLongBuildup(data, context));
      patterns.push(...this.detectPutLongBuildup(data, context));
      patterns.push(...this.detectCallShortCover(data, context));
      patterns.push(...this.detectPutShortCover(data, context));
      
      // Advanced pattern detection
      patterns.push(...this.detectGammaSqueezePattern(data, context));
      patterns.push(...this.detectVolatilitySpike(data, context));
      patterns.push(...this.detectUnusualActivity(data, context));
      patterns.push(...this.detectSupportResistance(data, context));
      patterns.push(...this.detectMomentumShift(data, context));
      
      // Calculate Max Pain
      const maxPainResult = this.calculateMaxPain(data, context);
      if (maxPainResult) {
        patterns.push(maxPainResult);
      }
      
      // Store significant patterns in database
      await this.storePatterns(patterns.filter(p => p.confidence >= this.THRESHOLDS.CONFIDENCE_MEDIUM));
      
      return patterns;
    } catch (error) {
      console.error('Error in pattern analysis:', error);
      return [];
    }
  }

  private static detectCallLongBuildup(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    const atm = this.findATMStrike(data, context.currentPrice);
    
    data.forEach(option => {
      if (option.callOIChange > this.THRESHOLDS.OI_BUILDUP_THRESHOLD && 
          option.callLTPChange > 0 &&
          option.strike >= atm) {
        
        const confidence = this.calculateConfidence([
          { value: option.callOIChange, threshold: this.THRESHOLDS.OI_BUILDUP_THRESHOLD, weight: 0.4 },
          { value: option.callLTPChange, threshold: this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD, weight: 0.3 },
          { value: option.callVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD, weight: 0.3 }
        ]);

        patterns.push({
          id: `call_buildup_${context.underlying}_${option.strike}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          underlying: context.underlying,
          strike: option.strike,
          type: 'CALL_LONG_BUILDUP',
          direction: 'BULLISH',
          description: `Strong call buying at ${option.strike} strike. OI increased by ${option.callOIChange.toLocaleString()}, premium up ${option.callLTPChange.toFixed(2)}%`,
          confidence,
          strength: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW',
          timeframe: context.timeframe,
          indicators: [
            { name: 'OI Change', value: option.callOIChange, threshold: this.THRESHOLDS.OI_BUILDUP_THRESHOLD, status: 'TRIGGERED' },
            { name: 'Premium Change', value: option.callLTPChange, threshold: this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD, status: option.callLTPChange > this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD ? 'TRIGGERED' : 'NORMAL' },
            { name: 'Volume', value: option.callVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD, status: option.callVolume > this.THRESHOLDS.VOLUME_THRESHOLD ? 'TRIGGERED' : 'NORMAL' }
          ]
        });
      }
    });
    
    return patterns;
  }

  private static detectPutLongBuildup(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    const atm = this.findATMStrike(data, context.currentPrice);
    
    data.forEach(option => {
      if (option.putOIChange > this.THRESHOLDS.OI_BUILDUP_THRESHOLD && 
          option.putLTPChange > 0 &&
          option.strike <= atm) {
        
        const confidence = this.calculateConfidence([
          { value: option.putOIChange, threshold: this.THRESHOLDS.OI_BUILDUP_THRESHOLD, weight: 0.4 },
          { value: option.putLTPChange, threshold: this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD, weight: 0.3 },
          { value: option.putVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD, weight: 0.3 }
        ]);

        patterns.push({
          id: `put_buildup_${context.underlying}_${option.strike}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          underlying: context.underlying,
          strike: option.strike,
          type: 'PUT_LONG_BUILDUP',
          direction: 'BEARISH',
          description: `Strong put buying at ${option.strike} strike. OI increased by ${option.putOIChange.toLocaleString()}, premium up ${option.putLTPChange.toFixed(2)}%`,
          confidence,
          strength: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW',
          timeframe: context.timeframe,
          indicators: [
            { name: 'OI Change', value: option.putOIChange, threshold: this.THRESHOLDS.OI_BUILDUP_THRESHOLD, status: 'TRIGGERED' },
            { name: 'Premium Change', value: option.putLTPChange, threshold: this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD, status: option.putLTPChange > this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD ? 'TRIGGERED' : 'NORMAL' },
            { name: 'Volume', value: option.putVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD, status: option.putVolume > this.THRESHOLDS.VOLUME_THRESHOLD ? 'TRIGGERED' : 'NORMAL' }
          ]
        });
      }
    });
    
    return patterns;
  }

  private static detectCallShortCover(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    
    data.forEach(option => {
      if (option.callOIChange < -this.THRESHOLDS.OI_CHANGE_THRESHOLD && 
          option.callLTPChange > this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD &&
          option.callVolume > this.THRESHOLDS.VOLUME_THRESHOLD) {
        
        const confidence = this.calculateConfidence([
          { value: Math.abs(option.callOIChange), threshold: this.THRESHOLDS.OI_CHANGE_THRESHOLD, weight: 0.4 },
          { value: option.callLTPChange, threshold: this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD, weight: 0.4 },
          { value: option.callVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD, weight: 0.2 }
        ]);

        patterns.push({
          id: `call_cover_${context.underlying}_${option.strike}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          underlying: context.underlying,
          strike: option.strike,
          type: 'CALL_SHORT_COVER',
          direction: 'BULLISH',
          description: `Call short covering at ${option.strike}. OI decreased by ${Math.abs(option.callOIChange).toLocaleString()}, premium surged ${option.callLTPChange.toFixed(2)}%`,
          confidence,
          strength: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW',
          timeframe: context.timeframe,
          indicators: [
            { name: 'OI Decrease', value: Math.abs(option.callOIChange), threshold: this.THRESHOLDS.OI_CHANGE_THRESHOLD, status: 'TRIGGERED' },
            { name: 'Premium Surge', value: option.callLTPChange, threshold: this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD, status: 'TRIGGERED' },
            { name: 'Volume', value: option.callVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD, status: 'TRIGGERED' }
          ]
        });
      }
    });
    
    return patterns;
  }

  private static detectPutShortCover(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    
    data.forEach(option => {
      if (option.putOIChange < -this.THRESHOLDS.OI_CHANGE_THRESHOLD && 
          option.putLTPChange > this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD &&
          option.putVolume > this.THRESHOLDS.VOLUME_THRESHOLD) {
        
        const confidence = this.calculateConfidence([
          { value: Math.abs(option.putOIChange), threshold: this.THRESHOLDS.OI_CHANGE_THRESHOLD, weight: 0.4 },
          { value: option.putLTPChange, threshold: this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD, weight: 0.4 },
          { value: option.putVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD, weight: 0.2 }
        ]);

        patterns.push({
          id: `put_cover_${context.underlying}_${option.strike}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          underlying: context.underlying,
          strike: option.strike,
          type: 'PUT_SHORT_COVER',
          direction: 'BEARISH',
          description: `Put short covering at ${option.strike}. OI decreased by ${Math.abs(option.putOIChange).toLocaleString()}, premium surged ${option.putLTPChange.toFixed(2)}%`,
          confidence,
          strength: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW',
          timeframe: context.timeframe,
          indicators: [
            { name: 'OI Decrease', value: Math.abs(option.putOIChange), threshold: this.THRESHOLDS.OI_CHANGE_THRESHOLD, status: 'TRIGGERED' },
            { name: 'Premium Surge', value: option.putLTPChange, threshold: this.THRESHOLDS.PREMIUM_CHANGE_THRESHOLD, status: 'TRIGGERED' },
            { name: 'Volume', value: option.putVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD, status: 'TRIGGERED' }
          ]
        });
      }
    });
    
    return patterns;
  }

  private static detectGammaSqueezePattern(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    const atm = this.findATMStrike(data, context.currentPrice);
    
    // Find strikes near ATM with high gamma exposure
    const nearATMStrikes = data.filter(option => 
      Math.abs(option.strike - atm) / atm <= 0.05 // Within 5% of ATM
    );
    
    const totalCallOI = nearATMStrikes.reduce((sum, option) => sum + option.callOI, 0);
    const totalPutOI = nearATMStrikes.reduce((sum, option) => sum + option.putOI, 0);
    const gammaRisk = totalCallOI + totalPutOI;
    
    if (gammaRisk > 100000) { // Significant gamma exposure
      const confidence = Math.min(0.95, gammaRisk / 500000);
      
      patterns.push({
        id: `gamma_squeeze_${context.underlying}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        underlying: context.underlying,
        strike: atm,
        type: 'GAMMA_SQUEEZE',
        direction: totalCallOI > totalPutOI ? 'BULLISH' : 'BEARISH',
        description: `High gamma exposure detected near ATM. Total OI: ${gammaRisk.toLocaleString()}. Price may experience accelerated moves.`,
        confidence,
        strength: confidence > 0.8 ? 'HIGH' : 'MEDIUM',
        timeframe: context.timeframe,
        indicators: [
          { name: 'Gamma Exposure', value: gammaRisk, threshold: 100000, status: 'TRIGGERED' },
          { name: 'Call/Put Ratio', value: totalCallOI / totalPutOI, threshold: 1, status: totalCallOI > totalPutOI ? 'TRIGGERED' : 'NORMAL' }
        ]
      });
    }
    
    return patterns;
  }

  private static detectVolatilitySpike(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    
    // Calculate average premium changes across all strikes
    const avgCallPremiumChange = data.reduce((sum, opt) => sum + Math.abs(opt.callLTPChange), 0) / data.length;
    const avgPutPremiumChange = data.reduce((sum, opt) => sum + Math.abs(opt.putLTPChange), 0) / data.length;
    
    if (avgCallPremiumChange > this.THRESHOLDS.PREMIUM_SPIKE_THRESHOLD || 
        avgPutPremiumChange > this.THRESHOLDS.PREMIUM_SPIKE_THRESHOLD) {
      
      const spikeIntensity = Math.max(avgCallPremiumChange, avgPutPremiumChange);
      const confidence = Math.min(0.95, spikeIntensity / (this.THRESHOLDS.PREMIUM_SPIKE_THRESHOLD * 2));
      
      patterns.push({
        id: `volatility_spike_${context.underlying}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        underlying: context.underlying,
        strike: this.findATMStrike(data, context.currentPrice),
        type: 'VOLATILITY_SPIKE',
        direction: 'NEUTRAL',
        description: `Volatility spike detected. Average premium surge: ${spikeIntensity.toFixed(2)}%. Expect increased market volatility.`,
        confidence,
        strength: confidence > 0.8 ? 'HIGH' : 'MEDIUM',
        timeframe: context.timeframe,
        indicators: [
          { name: 'Volatility Spike', value: spikeIntensity, threshold: this.THRESHOLDS.PREMIUM_SPIKE_THRESHOLD, status: 'TRIGGERED' }
        ]
      });
    }
    
    return patterns;
  }

  private static detectUnusualActivity(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    
    data.forEach(option => {
      const totalVolume = option.callVolume + option.putVolume;
      const totalOI = option.callOI + option.putOI;
      const volumeToOIRatio = totalOI > 0 ? totalVolume / totalOI : 0;
      
      if (volumeToOIRatio > 0.5 && totalVolume > this.THRESHOLDS.VOLUME_THRESHOLD * 2) {
        const confidence = Math.min(0.9, volumeToOIRatio);
        
        patterns.push({
          id: `unusual_activity_${context.underlying}_${option.strike}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          underlying: context.underlying,
          strike: option.strike,
          type: 'UNUSUAL_ACTIVITY',
          direction: option.callVolume > option.putVolume ? 'BULLISH' : 'BEARISH',
          description: `Unusual options activity at ${option.strike}. Volume/OI ratio: ${volumeToOIRatio.toFixed(2)}`,
          confidence,
          strength: confidence > 0.8 ? 'HIGH' : 'MEDIUM',
          timeframe: context.timeframe,
          indicators: [
            { name: 'Volume/OI Ratio', value: volumeToOIRatio, threshold: 0.5, status: 'TRIGGERED' },
            { name: 'Total Volume', value: totalVolume, threshold: this.THRESHOLDS.VOLUME_THRESHOLD * 2, status: 'TRIGGERED' }
          ]
        });
      }
    });
    
    return patterns;
  }

  private static detectSupportResistance(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    
    data.forEach(option => {
      const priceProximity = Math.abs(option.strike - context.currentPrice) / context.currentPrice;
      
      if (priceProximity <= this.THRESHOLDS.PRICE_PROXIMITY_THRESHOLD) {
        const totalOI = option.callOI + option.putOI;
        
        if (totalOI > this.THRESHOLDS.OI_SUPPORT_THRESHOLD) {
          const isSupport = option.strike < context.currentPrice && option.putOI > option.callOI;
          const isResistance = option.strike > context.currentPrice && option.callOI > option.putOI;
          
          if (isSupport || isResistance) {
            const confidence = Math.min(0.85, totalOI / 100000);
            
            patterns.push({
              id: `${isSupport ? 'support' : 'resistance'}_${context.underlying}_${option.strike}_${Date.now()}`,
              timestamp: new Date().toISOString(),
              underlying: context.underlying,
              strike: option.strike,
              type: 'SUPPORT_RESISTANCE',
              direction: isSupport ? 'BULLISH' : 'BEARISH',
              description: `Strong ${isSupport ? 'support' : 'resistance'} level at ${option.strike}. Total OI: ${totalOI.toLocaleString()}`,
              confidence,
              strength: confidence > 0.7 ? 'HIGH' : 'MEDIUM',
              timeframe: context.timeframe,
              indicators: [
                { name: 'Total OI', value: totalOI, threshold: this.THRESHOLDS.OI_SUPPORT_THRESHOLD, status: 'TRIGGERED' },
                { name: 'Price Proximity', value: priceProximity * 100, threshold: this.THRESHOLDS.PRICE_PROXIMITY_THRESHOLD * 100, status: 'TRIGGERED' }
              ]
            });
          }
        }
      }
    });
    
    return patterns;
  }

  private static detectMomentumShift(data: OptionChainData[], context: MarketContext): PatternResult[] {
    const patterns: PatternResult[] = [];
    
    const priceChange = ((context.currentPrice - context.previousPrice) / context.previousPrice) * 100;
    
    if (Math.abs(priceChange) > 2) { // Significant price movement
      const callActivity = data.reduce((sum, opt) => sum + opt.callOIChange, 0);
      const putActivity = data.reduce((sum, opt) => sum + opt.putOIChange, 0);
      
      const momentumDirection = priceChange > 0 ? 'BULLISH' : 'BEARISH';
      const optionFlow = callActivity > putActivity ? 'BULLISH' : 'BEARISH';
      
      if (momentumDirection === optionFlow) { // Confirming momentum
        const confidence = Math.min(0.9, Math.abs(priceChange) / 5);
        
        patterns.push({
          id: `momentum_shift_${context.underlying}_${Date.now()}`,
          timestamp: new Date().toISOString(),
          underlying: context.underlying,
          strike: this.findATMStrike(data, context.currentPrice),
          type: 'MOMENTUM_SHIFT',
          direction: momentumDirection,
          description: `${momentumDirection.toLowerCase()} momentum confirmed by options flow. Price change: ${priceChange.toFixed(2)}%`,
          confidence,
          strength: confidence > 0.7 ? 'HIGH' : 'MEDIUM',
          timeframe: context.timeframe,
          indicators: [
            { name: 'Price Change', value: Math.abs(priceChange), threshold: 2, status: 'TRIGGERED' },
            { name: 'Options Flow', value: callActivity - putActivity, threshold: 0, status: momentumDirection === optionFlow ? 'TRIGGERED' : 'NORMAL' }
          ]
        });
      }
    }
    
    return patterns;
  }

  private static calculateMaxPain(data: OptionChainData[], context: MarketContext): PatternResult | null {
    let maxPainStrike = 0;
    let minPain = Infinity;
    
    // Calculate pain for each strike
    data.forEach(option => {
      let pain = 0;
      
      // Calculate pain from all call options
      data.forEach(callOption => {
        if (callOption.strike < option.strike) {
          pain += callOption.callOI * (option.strike - callOption.strike);
        }
      });
      
      // Calculate pain from all put options
      data.forEach(putOption => {
        if (putOption.strike > option.strike) {
          pain += putOption.putOI * (putOption.strike - option.strike);
        }
      });
      
      if (pain < minPain) {
        minPain = pain;
        maxPainStrike = option.strike;
      }
    });
    
    const distanceFromMaxPain = Math.abs(context.currentPrice - maxPainStrike) / context.currentPrice;
    
    if (distanceFromMaxPain > 0.02) { // More than 2% away from max pain
      return {
        id: `max_pain_${context.underlying}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        underlying: context.underlying,
        strike: maxPainStrike,
        type: 'MAX_PAIN',
        direction: context.currentPrice > maxPainStrike ? 'BEARISH' : 'BULLISH',
        description: `Max Pain at ${maxPainStrike}. Current price ${context.currentPrice} suggests ${context.currentPrice > maxPainStrike ? 'downward' : 'upward'} pressure.`,
        confidence: Math.min(0.8, distanceFromMaxPain * 10),
        strength: distanceFromMaxPain > 0.05 ? 'HIGH' : 'MEDIUM',
        timeframe: context.timeframe,
        indicators: [
          { name: 'Distance from Max Pain', value: distanceFromMaxPain * 100, threshold: 2, status: 'TRIGGERED' },
          { name: 'Max Pain Strike', value: maxPainStrike, threshold: context.currentPrice, status: 'TRIGGERED' }
        ]
      };
    }
    
    return null;
  }

  private static findATMStrike(data: OptionChainData[], currentPrice: number): number {
    return data.reduce((closest, option) => 
      Math.abs(option.strike - currentPrice) < Math.abs(closest - currentPrice) 
        ? option.strike 
        : closest
    , data[0]?.strike || currentPrice);
  }

  private static calculateConfidence(indicators: Array<{ value: number; threshold: number; weight: number }>): number {
    const weightedScore = indicators.reduce((score, indicator) => {
      const normalizedValue = Math.min(1, indicator.value / indicator.threshold);
      return score + (normalizedValue * indicator.weight);
    }, 0);
    
    return Math.min(0.95, weightedScore);
  }

  private static async storePatterns(patterns: PatternResult[]): Promise<void> {
    try {
      for (const pattern of patterns) {
        const instrument = await storage.getInstrumentBySymbol(pattern.underlying);
        if (instrument) {
          await storage.insertSignal({
            instrumentId: instrument.id,
            strikePrice: pattern.strike.toString(),
            signalType: pattern.type,
            direction: pattern.direction === 'NEUTRAL' ? 'BULLISH' : pattern.direction,
            description: pattern.description,
            confidenceScore: pattern.confidence.toString(),
            isActive: true,
          });
        }
      }
    } catch (error) {
      console.error('Error storing patterns:', error);
    }
  }
}