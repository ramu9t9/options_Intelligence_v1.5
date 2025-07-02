/**
 * Phase 5: Comprehensive Backtesting Engine
 * Replays strategy rules over historical option chain data
 */

import { db } from "./db";
import { 
  userStrategies, 
  strategyBacktestResults, 
  historicalOptionChain, 
  dailyOptionOI,
  intradayOptionOI,
  type StrategyBacktestResult,
  type UserStrategy 
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface BacktestRequest {
  strategyId: number;
  symbol: string;
  startDate: Date;
  endDate: Date;
  timeframe: '1MIN' | '5MIN' | '15MIN' | '1HOUR' | '1DAY';
  backtestName?: string;
}

export interface BacktestMatch {
  timestamp: Date;
  instrumentSymbol: string;
  matchedConditions: Array<{
    field: string;
    operator: string;
    value: number;
    actualValue: number;
    matched: boolean;
  }>;
  marketData: {
    strike: number;
    optionType: 'CE' | 'PE';
    openInterest: number;
    lastPrice: number;
    volume: number;
  };
  priceMovement?: {
    entryPrice: number;
    exitPrice: number;
    movementPercent: number;
    timeToMove: number; // minutes
  };
}

export interface BacktestResults {
  backtestId: number;
  totalEvaluations: number;
  matchesFound: number;
  successfulMatches: number;
  successRate: number;
  totalROI: number;
  avgMovePostMatch: number;
  maxDrawdown: number;
  sharpeRatio: number;
  matches: BacktestMatch[];
  performanceChart: Array<{
    timestamp: Date;
    cumulativeReturn: number;
    drawdown: number;
  }>;
  executionTime: number;
}

export class BacktestingEngine {
  private async getHistoricalData(
    symbol: string, 
    startDate: Date, 
    endDate: Date, 
    timeframe: string
  ) {
    console.log(`📊 Fetching historical data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Use appropriate table based on timeframe
    if (timeframe === '1DAY') {
      return await db.select()
        .from(dailyOptionOI)
        .where(and(
          eq(dailyOptionOI.symbol, symbol),
          gte(dailyOptionOI.tradingDate, startDate.toISOString().split('T')[0]),
          lte(dailyOptionOI.tradingDate, endDate.toISOString().split('T')[0])
        ))
        .orderBy(asc(dailyOptionOI.tradingDate), asc(dailyOptionOI.strike));
    } else {
      // Use intraday data for higher frequency timeframes
      return await db.select()
        .from(intradayOptionOI)
        .where(and(
          eq(intradayOptionOI.symbol, symbol),
          gte(intradayOptionOI.timestamp, startDate),
          lte(intradayOptionOI.timestamp, endDate)
        ))
        .orderBy(asc(intradayOptionOI.timestamp), asc(intradayOptionOI.strike));
    }
  }

  private evaluateStrategyCondition(
    condition: any,
    marketData: any
  ): boolean {
    const { field, operator, value } = condition;
    let actualValue: number;

    // Map field names to market data properties
    switch (field) {
      case 'OI':
        actualValue = parseInt(marketData.openInterest?.toString() || '0');
        break;
      case 'OI_CHANGE':
        actualValue = parseInt(marketData.oiChange?.toString() || '0');
        break;
      case 'LTP':
        actualValue = parseFloat(marketData.lastPrice?.toString() || '0');
        break;
      case 'VOLUME':
        actualValue = parseInt(marketData.volume?.toString() || '0');
        break;
      case 'IV':
        actualValue = parseFloat(marketData.impliedVolatility?.toString() || '0');
        break;
      case 'DELTA':
        actualValue = parseFloat(marketData.delta?.toString() || '0');
        break;
      case 'GAMMA':
        actualValue = parseFloat(marketData.gamma?.toString() || '0');
        break;
      case 'THETA':
        actualValue = parseFloat(marketData.theta?.toString() || '0');
        break;
      case 'VEGA':
        actualValue = parseFloat(marketData.vega?.toString() || '0');
        break;
      default:
        return false;
    }

    // Evaluate condition based on operator
    switch (operator) {
      case '>':
        return actualValue > value;
      case '<':
        return actualValue < value;
      case '>=':
        return actualValue >= value;
      case '<=':
        return actualValue <= value;
      case '==':
        return Math.abs(actualValue - value) < 0.01; // Float comparison tolerance
      case '!=':
        return Math.abs(actualValue - value) >= 0.01;
      default:
        return false;
    }
  }

  private evaluateStrategy(
    strategyRules: any,
    marketDataSnapshot: any[]
  ): BacktestMatch[] {
    const matches: BacktestMatch[] = [];
    
    // Parse strategy rules
    const rules = strategyRules.conditions || strategyRules.rules?.conditions || [];
    const logic = strategyRules.logic || strategyRules.rules?.logic || 'AND';

    for (const dataPoint of marketDataSnapshot) {
      const conditionResults = rules.map((condition: any) => ({
        ...condition,
        actualValue: this.getActualValue(condition.field, dataPoint),
        matched: this.evaluateStrategyCondition(condition, dataPoint)
      }));

      // Evaluate based on logic operator
      const isMatch = logic === 'AND' 
        ? conditionResults.every((result: any) => result.matched)
        : conditionResults.some((result: any) => result.matched);

      if (isMatch) {
        matches.push({
          timestamp: new Date(dataPoint.timestamp || dataPoint.tradingDate),
          instrumentSymbol: dataPoint.symbol,
          matchedConditions: conditionResults,
          marketData: {
            strike: parseFloat(dataPoint.strike?.toString() || '0'),
            optionType: dataPoint.optionType,
            openInterest: parseInt(dataPoint.openInterest?.toString() || '0'),
            lastPrice: parseFloat(dataPoint.lastPrice?.toString() || '0'),
            volume: parseInt(dataPoint.volume?.toString() || '0')
          }
        });
      }
    }

    return matches;
  }

  private getActualValue(field: string, dataPoint: any): number {
    switch (field) {
      case 'OI':
        return parseInt(dataPoint.openInterest?.toString() || '0');
      case 'OI_CHANGE':
        return parseInt(dataPoint.oiChange?.toString() || '0');
      case 'LTP':
        return parseFloat(dataPoint.lastPrice?.toString() || '0');
      case 'VOLUME':
        return parseInt(dataPoint.volume?.toString() || '0');
      case 'IV':
        return parseFloat(dataPoint.impliedVolatility?.toString() || '0');
      case 'DELTA':
        return parseFloat(dataPoint.delta?.toString() || '0');
      case 'GAMMA':
        return parseFloat(dataPoint.gamma?.toString() || '0');
      case 'THETA':
        return parseFloat(dataPoint.theta?.toString() || '0');
      case 'VEGA':
        return parseFloat(dataPoint.vega?.toString() || '0');
      default:
        return 0;
    }
  }

  private calculatePriceMovements(
    matches: BacktestMatch[],
    allHistoricalData: any[]
  ): void {
    matches.forEach(match => {
      // Find subsequent price movements after match
      const matchTime = match.timestamp.getTime();
      const futureData = allHistoricalData.filter(data => {
        const dataTime = new Date(data.timestamp || data.tradingDate).getTime();
        return dataTime > matchTime && 
               parseFloat(data.strike?.toString() || '0') === match.marketData.strike &&
               data.optionType === match.marketData.optionType;
      }).slice(0, 10); // Look at next 10 data points

      if (futureData.length > 0) {
        const entryPrice = match.marketData.lastPrice;
        const exitPrice = parseFloat(futureData[futureData.length - 1].lastPrice?.toString() || '0');
        const movementPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
        const timeToMove = futureData.length; // Simplified time calculation

        match.priceMovement = {
          entryPrice,
          exitPrice,
          movementPercent,
          timeToMove
        };
      }
    });
  }

  private calculatePerformanceMetrics(matches: BacktestMatch[]): {
    totalROI: number;
    avgMovePostMatch: number;
    maxDrawdown: number;
    sharpeRatio: number;
    successfulMatches: number;
    performanceChart: Array<{ timestamp: Date; cumulativeReturn: number; drawdown: number; }>;
  } {
    let cumulativeReturn = 0;
    let maxReturn = 0;
    let maxDrawdown = 0;
    let successfulMatches = 0;
    const returns: number[] = [];
    const performanceChart: Array<{ timestamp: Date; cumulativeReturn: number; drawdown: number; }> = [];

    matches.forEach(match => {
      if (match.priceMovement) {
        const returnPercent = match.priceMovement.movementPercent;
        returns.push(returnPercent);
        cumulativeReturn += returnPercent;
        
        if (cumulativeReturn > maxReturn) {
          maxReturn = cumulativeReturn;
        }
        
        const drawdown = maxReturn - cumulativeReturn;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        if (returnPercent > 0) {
          successfulMatches++;
        }

        performanceChart.push({
          timestamp: match.timestamp,
          cumulativeReturn,
          drawdown
        });
      }
    });

    // Calculate Sharpe ratio (simplified)
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0 ? 
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    return {
      totalROI: cumulativeReturn,
      avgMovePostMatch: avgReturn,
      maxDrawdown,
      sharpeRatio,
      successfulMatches,
      performanceChart
    };
  }

  async runBacktest(request: BacktestRequest, userId: number): Promise<BacktestResults> {
    const startTime = Date.now();
    
    console.log(`🔄 Starting backtest for strategy ${request.strategyId}`);

    // Create initial backtest record
    const [backtestRecord] = await db.insert(strategyBacktestResults)
      .values({
        strategyId: request.strategyId,
        userId,
        backtestName: request.backtestName || `Backtest ${new Date().toISOString()}`,
        symbol: request.symbol,
        startDate: request.startDate,
        endDate: request.endDate,
        timeframe: request.timeframe,
        status: 'RUNNING',
        executionTime: 0
      })
      .returning();

    try {
      // Get strategy rules
      const [strategy] = await db.select()
        .from(userStrategies)
        .where(eq(userStrategies.id, request.strategyId));

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      // Get historical data
      const historicalData = await this.getHistoricalData(
        request.symbol,
        request.startDate,
        request.endDate,
        request.timeframe
      );

      console.log(`📊 Found ${historicalData.length} historical data points`);

      if (historicalData.length === 0) {
        throw new Error('No historical data found for the specified period');
      }

      // Evaluate strategy against historical data
      const matches = this.evaluateStrategy(strategy.rulesJson, historicalData);
      
      // Calculate price movements for matched conditions
      this.calculatePriceMovements(matches, historicalData);

      // Calculate performance metrics
      const metrics = this.calculatePerformanceMetrics(matches);

      const executionTime = Date.now() - startTime;

      // Update backtest record with results
      await db.update(strategyBacktestResults)
        .set({
          status: 'COMPLETED',
          totalEvaluations: historicalData.length,
          matchesFound: matches.length,
          successfulMatches: metrics.successfulMatches,
          successRate: matches.length > 0 ? ((metrics.successfulMatches / matches.length) * 100).toString() : "0",
          totalROI: metrics.totalROI.toString(),
          avgMovePostMatch: metrics.avgMovePostMatch.toString(),
          maxDrawdown: metrics.maxDrawdown.toString(),
          sharpeRatio: metrics.sharpeRatio.toString(),
          executionTime,
          dataPointsAnalyzed: historicalData.length,
          matchDetails: matches,
          performanceChart: metrics.performanceChart,
          completedAt: new Date()
        })
        .where(eq(strategyBacktestResults.id, backtestRecord.id));

      console.log(`✅ Backtest completed: ${matches.length} matches found from ${historicalData.length} evaluations`);

      return {
        backtestId: backtestRecord.id,
        totalEvaluations: historicalData.length,
        matchesFound: matches.length,
        successfulMatches: metrics.successfulMatches,
        successRate: matches.length > 0 ? (metrics.successfulMatches / matches.length) * 100 : 0,
        totalROI: metrics.totalROI,
        avgMovePostMatch: metrics.avgMovePostMatch,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        matches,
        performanceChart: metrics.performanceChart,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Update backtest record with error
      await db.update(strategyBacktestResults)
        .set({
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          executionTime
        })
        .where(eq(strategyBacktestResults.id, backtestRecord.id));

      throw error;
    }
  }

  async getBacktestResults(backtestId: number): Promise<StrategyBacktestResult | null> {
    const [result] = await db.select()
      .from(strategyBacktestResults)
      .where(eq(strategyBacktestResults.id, backtestId));

    return result || null;
  }

  async getUserBacktests(userId: number, limit: number = 50): Promise<StrategyBacktestResult[]> {
    return await db.select()
      .from(strategyBacktestResults)
      .where(eq(strategyBacktestResults.userId, userId))
      .orderBy(desc(strategyBacktestResults.createdAt))
      .limit(limit);
  }

  async getStrategyBacktests(strategyId: number): Promise<StrategyBacktestResult[]> {
    return await db.select()
      .from(strategyBacktestResults)
      .where(eq(strategyBacktestResults.strategyId, strategyId))
      .orderBy(desc(strategyBacktestResults.createdAt));
  }

  async deleteBacktest(backtestId: number, userId: number): Promise<boolean> {
    const result = await db.delete(strategyBacktestResults)
      .where(and(
        eq(strategyBacktestResults.id, backtestId),
        eq(strategyBacktestResults.userId, userId)
      ));

    return (result.rowCount ?? 0) > 0;
  }
}

export const backtestingEngine = new BacktestingEngine();