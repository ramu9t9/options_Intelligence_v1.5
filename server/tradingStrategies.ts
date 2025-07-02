import { PatternResult, OptionChainData, MarketContext } from './patternDetector';

export interface TradingStrategy {
  id: string;
  name: string;
  type: 'BULLISH' | 'BEARISH';
  description: string;
  signals: StrategySignal[];
  riskManagement: RiskParams;
  entryConditions: string[];
  exitConditions: string[];
  confidence: number;
}

export interface StrategySignal {
  type: 'OI_BUILDUP' | 'SUPPORT_BOUNCE' | 'RESISTANCE_BREAK' | 'VOLUME_SPIKE' | 'PCR_EXTREME';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  description: string;
  value: number;
  threshold: number;
}

export interface RiskParams {
  maxRisk: number; // in rupees (1000-1500 as per user preference)
  stopLoss: number;
  target: number;
  positionSize: number;
}

export class AdvancedTradingStrategies {
  private static readonly RISK_TOLERANCE = 1500; // Max risk per trade

  // Bullish Strategy Implementation
  static analyzeBullishSetup(
    optionChain: OptionChainData[],
    context: MarketContext,
    supportLevel: number
  ): TradingStrategy | null {
    const signals: StrategySignal[] = [];
    let confidence = 0;

    // 1. Support Zone Analysis with High Put OI
    const nearSupportStrikes = optionChain.filter(
      data => Math.abs(data.strike - supportLevel) <= 100
    );
    
    const maxPutOI = Math.max(...nearSupportStrikes.map(d => d.putOI));
    const supportPutOI = nearSupportStrikes.find(d => d.putOI === maxPutOI);
    
    if (supportPutOI && supportPutOI.putOI > 50000) {
      signals.push({
        type: 'SUPPORT_BOUNCE',
        strength: 'STRONG',
        description: `High Put OI of ${supportPutOI.putOI.toLocaleString()} at ${supportPutOI.strike} indicates strong support`,
        value: supportPutOI.putOI,
        threshold: 50000
      });
      confidence += 25;
    }

    // 2. Long Buildup Detection (Rising Price + Rising OI)
    if (context.currentPrice > context.previousPrice) {
      const totalCallOI = optionChain.reduce((sum, data) => sum + data.callOI, 0);
      const totalCallOIChange = optionChain.reduce((sum, data) => sum + data.callOIChange, 0);
      
      if (totalCallOIChange > 0) {
        signals.push({
          type: 'OI_BUILDUP',
          strength: totalCallOIChange > 100000 ? 'STRONG' : 'MODERATE',
          description: `Long buildup detected: Call OI increased by ${totalCallOIChange.toLocaleString()}`,
          value: totalCallOIChange,
          threshold: 50000
        });
        confidence += totalCallOIChange > 100000 ? 30 : 20;
      }
    }

    // 3. Resistance Breakout Analysis
    const atmCallStrike = this.findATMStrike(optionChain, context.currentPrice);
    const atmCallData = optionChain.find(d => d.strike === atmCallStrike);
    
    if (atmCallData && atmCallData.callOIChange < 0 && context.currentPrice > context.previousPrice) {
      signals.push({
        type: 'RESISTANCE_BREAK',
        strength: 'STRONG',
        description: `Call covering at ATM strike ${atmCallStrike} suggests breakout momentum`,
        value: Math.abs(atmCallData.callOIChange),
        threshold: 10000
      });
      confidence += 25;
    }

    // 4. Volume Confirmation
    if (context.volatility > 20) {
      signals.push({
        type: 'VOLUME_SPIKE',
        strength: 'MODERATE',
        description: 'High volatility indicates strong market participation',
        value: context.volatility,
        threshold: 20
      });
      confidence += 15;
    }

    // 5. Put-Call Ratio Analysis
    const totalPutOI = optionChain.reduce((sum, data) => sum + data.putOI, 0);
    const totalCallOI = optionChain.reduce((sum, data) => sum + data.callOI, 0);
    const pcr = totalPutOI / totalCallOI;
    
    if (pcr > 1.2) { // High PCR indicates bearish sentiment, contrarian bullish
      signals.push({
        type: 'PCR_EXTREME',
        strength: 'MODERATE',
        description: `High PCR of ${pcr.toFixed(2)} suggests contrarian bullish opportunity`,
        value: pcr,
        threshold: 1.2
      });
      confidence += 10;
    }

    if (signals.length >= 2 && confidence >= 40) {
      const stopLoss = supportLevel - 50;
      const target = context.currentPrice + (context.currentPrice - stopLoss) * 2; // 1:2 RR
      
      return {
        id: `bullish_${Date.now()}`,
        name: 'Support Bounce Long Strategy',
        type: 'BULLISH',
        description: 'Bullish setup based on support zone defense and OI analysis',
        signals,
        riskManagement: {
          maxRisk: this.RISK_TOLERANCE,
          stopLoss,
          target,
          positionSize: Math.floor(this.RISK_TOLERANCE / (context.currentPrice - stopLoss))
        },
        entryConditions: [
          `Enter long above ${context.currentPrice + 10}`,
          'Confirm with volume spike',
          'Put OI holding at support level'
        ],
        exitConditions: [
          `Stop loss below ${stopLoss}`,
          `Target at ${target}`,
          'Trail stop once 1:1 achieved'
        ],
        confidence: confidence / 100
      };
    }

    return null;
  }

  // Bearish Strategy Implementation
  static analyzeBearishSetup(
    optionChain: OptionChainData[],
    context: MarketContext,
    resistanceLevel: number
  ): TradingStrategy | null {
    const signals: StrategySignal[] = [];
    let confidence = 0;

    // 1. Resistance Zone Analysis with High Call OI
    const nearResistanceStrikes = optionChain.filter(
      data => Math.abs(data.strike - resistanceLevel) <= 100
    );
    
    const maxCallOI = Math.max(...nearResistanceStrikes.map(d => d.callOI));
    const resistanceCallOI = nearResistanceStrikes.find(d => d.callOI === maxCallOI);
    
    if (resistanceCallOI && resistanceCallOI.callOI > 50000) {
      signals.push({
        type: 'RESISTANCE_BREAK',
        strength: 'STRONG',
        description: `High Call OI of ${resistanceCallOI.callOI.toLocaleString()} at ${resistanceCallOI.strike} indicates strong resistance`,
        value: resistanceCallOI.callOI,
        threshold: 50000
      });
      confidence += 25;
    }

    // 2. Short Buildup Detection (Falling Price + Rising OI)
    if (context.currentPrice < context.previousPrice) {
      const totalPutOI = optionChain.reduce((sum, data) => sum + data.putOI, 0);
      const totalPutOIChange = optionChain.reduce((sum, data) => sum + data.putOIChange, 0);
      
      if (totalPutOIChange > 0) {
        signals.push({
          type: 'OI_BUILDUP',
          strength: totalPutOIChange > 100000 ? 'STRONG' : 'MODERATE',
          description: `Short buildup detected: Put OI increased by ${totalPutOIChange.toLocaleString()}`,
          value: totalPutOIChange,
          threshold: 50000
        });
        confidence += totalPutOIChange > 100000 ? 30 : 20;
      }
    }

    // 3. Support Breakdown Analysis
    const atmPutStrike = this.findATMStrike(optionChain, context.currentPrice);
    const atmPutData = optionChain.find(d => d.strike === atmPutStrike);
    
    if (atmPutData && atmPutData.putOIChange < 0 && context.currentPrice < context.previousPrice) {
      signals.push({
        type: 'SUPPORT_BOUNCE',
        strength: 'STRONG',
        description: `Put covering at ATM strike ${atmPutStrike} suggests breakdown momentum`,
        value: Math.abs(atmPutData.putOIChange),
        threshold: 10000
      });
      confidence += 25;
    }

    // 4. Volume Confirmation
    if (context.volatility > 25) {
      signals.push({
        type: 'VOLUME_SPIKE',
        strength: 'STRONG',
        description: 'High volatility indicates strong selling pressure',
        value: context.volatility,
        threshold: 25
      });
      confidence += 20;
    }

    // 5. Put-Call Ratio Analysis
    const totalPutOI = optionChain.reduce((sum, data) => sum + data.putOI, 0);
    const totalCallOI = optionChain.reduce((sum, data) => sum + data.callOI, 0);
    const pcr = totalPutOI / totalCallOI;
    
    if (pcr < 0.8) { // Low PCR indicates bullish complacency, bearish opportunity
      signals.push({
        type: 'PCR_EXTREME',
        strength: 'MODERATE',
        description: `Low PCR of ${pcr.toFixed(2)} suggests complacency, bearish opportunity`,
        value: pcr,
        threshold: 0.8
      });
      confidence += 15;
    }

    if (signals.length >= 2 && confidence >= 40) {
      const stopLoss = resistanceLevel + 50;
      const target = context.currentPrice - (stopLoss - context.currentPrice) * 2; // 1:2 RR
      
      return {
        id: `bearish_${Date.now()}`,
        name: 'Resistance Rejection Short Strategy',
        type: 'BEARISH',
        description: 'Bearish setup based on resistance rejection and OI analysis',
        signals,
        riskManagement: {
          maxRisk: this.RISK_TOLERANCE,
          stopLoss,
          target,
          positionSize: Math.floor(this.RISK_TOLERANCE / (stopLoss - context.currentPrice))
        },
        entryConditions: [
          `Enter short below ${context.currentPrice - 10}`,
          'Confirm with volume spike',
          'Call OI building at resistance level'
        ],
        exitConditions: [
          `Stop loss above ${stopLoss}`,
          `Target at ${target}`,
          'Trail stop once 1:1 achieved'
        ],
        confidence: confidence / 100
      };
    }

    return null;
  }

  private static findATMStrike(optionChain: OptionChainData[], currentPrice: number): number {
    return optionChain.reduce((closest, current) => 
      Math.abs(current.strike - currentPrice) < Math.abs(closest.strike - currentPrice) 
        ? current : closest
    ).strike;
  }

  // Combined Strategy Analysis
  static analyzeStrategies(
    optionChain: OptionChainData[],
    context: MarketContext
  ): TradingStrategy[] {
    const strategies: TradingStrategy[] = [];
    
    // Dynamic support/resistance levels based on OI
    const strikes = optionChain.map(d => d.strike).sort((a, b) => a - b);
    const supportLevel = strikes.find(strike => 
      optionChain.find(d => d.strike === strike)?.putOI > 40000
    ) || context.currentPrice - 100;
    
    const resistanceLevel = strikes.reverse().find(strike => 
      optionChain.find(d => d.strike === strike)?.callOI > 40000
    ) || context.currentPrice + 100;

    // Analyze bullish setup
    const bullishStrategy = this.analyzeBullishSetup(optionChain, context, supportLevel);
    if (bullishStrategy) {
      strategies.push(bullishStrategy);
    }

    // Analyze bearish setup
    const bearishStrategy = this.analyzeBearishSetup(optionChain, context, resistanceLevel);
    if (bearishStrategy) {
      strategies.push(bearishStrategy);
    }

    return strategies;
  }
}