/**
 * Phase 3: Rule Evaluation Engine
 * Evaluates strategies against real-time and historical market data
 */

import logger from './logger';
import { db } from './db';
import { strategyExecutionLogs, userStrategies } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface StrategyRule {
  field: 'OI' | 'OI_CHANGE' | 'LTP' | 'VOLUME' | 'PCR' | 'IV' | 'DELTA' | 'GAMMA' | 'THETA' | 'VEGA';
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  instrument?: string;
}

export interface StrategyConditions {
  conditions: StrategyRule[];
  logic: 'AND' | 'OR';
}

export interface MarketDataSnapshot {
  symbol: string;
  strike?: number;
  optionType?: 'CE' | 'PE';
  openInterest: number;
  oiChange: number;
  lastPrice: number;
  volume: number;
  pcr?: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  timestamp: Date;
}

export interface StrategyEvaluationResult {
  strategyId: number;
  userId: number;
  matched: boolean;
  matchedRules: StrategyRule[];
  failedRules: StrategyRule[];
  marketData: MarketDataSnapshot[];
  executionTime: Date;
  confidence: number;
}

export class RuleEvaluationEngine {
  private log = logger.child({ module: 'RuleEvaluationEngine' });

  /**
   * Evaluate a strategy against market data
   */
  async evaluateStrategy(
    strategyId: number,
    userId: number,
    marketData: MarketDataSnapshot[],
    triggerType: 'manual' | 'auto' = 'manual'
  ): Promise<StrategyEvaluationResult> {
    const startTime = Date.now();

    try {
      // Get strategy from database
      const [strategy] = await db
        .select()
        .from(userStrategies)
        .where(eq(userStrategies.id, strategyId));

      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }

      if (strategy.userId !== userId) {
        throw new Error(`Strategy ${strategyId} does not belong to user ${userId}`);
      }

      // Parse strategy rules from JSON
      const conditions = JSON.parse(strategy.rulesJson) as StrategyConditions;
      if (!conditions || !conditions.conditions || conditions.conditions.length === 0) {
        throw new Error(`Strategy ${strategyId} has no valid conditions`);
      }

      this.log.info('Evaluating strategy', {
        strategyId,
        userId,
        strategyName: strategy.name,
        conditionsCount: conditions.conditions.length,
        logic: conditions.logic,
        triggerType
      });

      // Evaluate each rule against market data
      const ruleResults = await this.evaluateRules(conditions.conditions, marketData);
      
      // Apply logic operator (AND/OR)
      const matched = this.applyLogicOperator(ruleResults, conditions.logic);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(ruleResults);

      // Prepare result
      const result: StrategyEvaluationResult = {
        strategyId,
        userId,
        matched,
        matchedRules: ruleResults.filter(r => r.matched).map(r => r.rule),
        failedRules: ruleResults.filter(r => !r.matched).map(r => r.rule),
        marketData,
        executionTime: new Date(),
        confidence
      };

      // Log execution
      await this.logExecution(result, triggerType, Date.now() - startTime);

      // Update strategy execution count
      await this.updateStrategyStats(strategyId);

      this.log.info('Strategy evaluation completed', {
        strategyId,
        matched,
        confidence,
        executionTimeMs: Date.now() - startTime,
        matchedRulesCount: result.matchedRules.length,
        totalRulesCount: conditions.conditions.length
      });

      return result;

    } catch (error) {
      this.log.error('Strategy evaluation failed', error, {
        strategyId,
        userId,
        executionTimeMs: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Evaluate individual rules against market data
   */
  private async evaluateRules(
    rules: StrategyRule[],
    marketData: MarketDataSnapshot[]
  ): Promise<Array<{ rule: StrategyRule; matched: boolean; actualValue: number; marketData: MarketDataSnapshot }>> {
    const results = [];

    for (const rule of rules) {
      let ruleMatched = false;
      let bestMatch: { actualValue: number; marketData: MarketDataSnapshot } | null = null;

      // Check rule against each market data point
      for (const dataPoint of marketData) {
        // Skip if instrument filter doesn't match
        if (rule.instrument && dataPoint.symbol !== rule.instrument) {
          continue;
        }

        const actualValue = this.extractFieldValue(rule.field, dataPoint);
        const conditionMet = this.evaluateCondition(rule.operator, actualValue, rule.value);

        if (conditionMet) {
          ruleMatched = true;
          bestMatch = { actualValue, marketData: dataPoint };
          break; // First match is sufficient for OR logic, continue for completeness
        }

        // Keep track of closest match for logging
        if (!bestMatch) {
          bestMatch = { actualValue, marketData: dataPoint };
        }
      }

      results.push({
        rule,
        matched: ruleMatched,
        actualValue: bestMatch?.actualValue || 0,
        marketData: bestMatch?.marketData || marketData[0]
      });
    }

    return results;
  }

  /**
   * Extract field value from market data
   */
  private extractFieldValue(field: StrategyRule['field'], data: MarketDataSnapshot): number {
    switch (field) {
      case 'OI':
        return data.openInterest;
      case 'OI_CHANGE':
        return data.oiChange;
      case 'LTP':
        return data.lastPrice;
      case 'VOLUME':
        return data.volume;
      case 'PCR':
        return data.pcr || 0;
      case 'IV':
        return data.iv || 0;
      case 'DELTA':
        return data.delta || 0;
      case 'GAMMA':
        return data.gamma || 0;
      case 'THETA':
        return data.theta || 0;
      case 'VEGA':
        return data.vega || 0;
      default:
        throw new Error(`Unknown field: ${field}`);
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(operator: StrategyRule['operator'], actualValue: number, expectedValue: number): boolean {
    switch (operator) {
      case '>':
        return actualValue > expectedValue;
      case '<':
        return actualValue < expectedValue;
      case '>=':
        return actualValue >= expectedValue;
      case '<=':
        return actualValue <= expectedValue;
      case '==':
        return Math.abs(actualValue - expectedValue) < 0.001; // Handle floating point precision
      case '!=':
        return Math.abs(actualValue - expectedValue) >= 0.001;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Apply AND/OR logic to rule results
   */
  private applyLogicOperator(
    results: Array<{ rule: StrategyRule; matched: boolean }>,
    logic: 'AND' | 'OR'
  ): boolean {
    if (results.length === 0) return false;

    if (logic === 'AND') {
      return results.every(result => result.matched);
    } else {
      return results.some(result => result.matched);
    }
  }

  /**
   * Calculate confidence score based on rule matches
   */
  private calculateConfidence(results: Array<{ rule: StrategyRule; matched: boolean }>): number {
    if (results.length === 0) return 0;

    const matchedCount = results.filter(r => r.matched).length;
    return Math.round((matchedCount / results.length) * 100);
  }

  /**
   * Log strategy execution to database
   */
  private async logExecution(
    result: StrategyEvaluationResult,
    triggerType: 'manual' | 'auto',
    executionTimeMs: number
  ): Promise<void> {
    try {
      await db.insert(strategyExecutionLogs).values({
        strategyId: result.strategyId,
        userId: result.userId,
        executionType: triggerType === 'manual' ? 'MANUAL' : 'SCHEDULED',
        status: 'COMPLETED',
        resultsJson: JSON.stringify(result),
        matchedInstruments: result.marketData.map(d => d.symbol),
        executionTime: executionTimeMs,
        errorMessage: result.matched ? undefined : 'No matches found'
      });

      this.log.info('Strategy execution logged', {
        strategyId: result.strategyId,
        matched: result.matched,
        confidence: result.confidence,
        executionTimeMs
      });

    } catch (error) {
      this.log.error('Failed to log strategy execution', error, {
        strategyId: result.strategyId,
        userId: result.userId
      });
    }
  }

  /**
   * Update strategy execution statistics
   */
  private async updateStrategyStats(strategyId: number): Promise<void> {
    try {
      await db
        .update(userStrategies)
        .set({
          totalExecutions: db.raw('total_executions + 1'),
          lastExecuted: new Date()
        })
        .where(eq(userStrategies.id, strategyId));

    } catch (error) {
      this.log.error('Failed to update strategy stats', error, { strategyId });
    }
  }

  /**
   * Batch evaluate multiple strategies
   */
  async batchEvaluateStrategies(
    strategies: Array<{ id: number; userId: number }>,
    marketData: MarketDataSnapshot[]
  ): Promise<StrategyEvaluationResult[]> {
    const results = [];

    for (const strategy of strategies) {
      try {
        const result = await this.evaluateStrategy(
          strategy.id,
          strategy.userId,
          marketData,
          'auto'
        );
        results.push(result);
      } catch (error) {
        this.log.error('Batch evaluation failed for strategy', error, {
          strategyId: strategy.id,
          userId: strategy.userId
        });
      }
    }

    this.log.info('Batch strategy evaluation completed', {
      totalStrategies: strategies.length,
      successfulEvaluations: results.length,
      matchedStrategies: results.filter(r => r.matched).length
    });

    return results;
  }
}

export const ruleEvaluationEngine = new RuleEvaluationEngine();