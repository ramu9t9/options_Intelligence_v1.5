/**
 * Priority-Based Alert Engine for Options Intelligence Platform
 * Phase 5: Advanced Alert Engine with Dynamic Scheduling and Retry Logic
 */

import { EventEmitter } from 'events';
import { db } from './db';
import { userAlerts, alertExecutionLog, instruments, optionData } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface AlertRule {
  id: number;
  userId: number;
  instrumentId: number;
  alertType: string;
  condition: string;
  targetValue: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  logicalOperator: 'AND' | 'OR';
  deliveryChannels: string[];
  retryAttempts: number;
  maxRetries: number;
  isActive: boolean;
  triggered: boolean;
  lastTriggered?: Date;
}

export interface AlertExecution {
  id: number;
  alertId: number;
  executedAt: Date;
  sentStatus: 'PENDING' | 'SENT' | 'FAILED' | 'RETRY';
  deliveryChannel: string;
  errorMessage?: string;
  responseTime?: number;
  retryCount: number;
  metadata?: any;
}

export interface MarketData {
  instrumentId: number;
  currentPrice: number;
  volume: number;
  openInterest: number;
  oiChange: number;
  timestamp: Date;
}

export interface AlertEvaluationResult {
  alertId: number;
  shouldTrigger: boolean;
  currentValue: number;
  condition: string;
  targetValue: number;
  confidence: number;
}

export class PriorityBasedAlertEngine extends EventEmitter {
  private highPriorityAlerts = new Map<number, AlertRule>();
  private mediumPriorityAlerts = new Map<number, AlertRule>();
  private lowPriorityAlerts = new Map<number, AlertRule>();
  
  private highPriorityInterval: NodeJS.Timeout | null = null; // 10 seconds
  private mediumPriorityInterval: NodeJS.Timeout | null = null; // 1 minute
  private lowPriorityInterval: NodeJS.Timeout | null = null; // 5 minutes
  
  private isInitialized = false;
  private executionQueue: AlertExecution[] = [];
  private retryQueue: AlertExecution[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔔 Initializing Priority-Based Alert Engine...');
    
    await this.loadActiveAlerts();
    this.startPrioritySchedulers();
    this.startRetryProcessor();
    
    this.isInitialized = true;
    console.log('✅ Priority-Based Alert Engine initialized');
    
    this.emit('engineInitialized', {
      highPriorityCount: this.highPriorityAlerts.size,
      mediumPriorityCount: this.mediumPriorityAlerts.size,
      lowPriorityCount: this.lowPriorityAlerts.size
    });
  }

  private async loadActiveAlerts(): Promise<void> {
    try {
      const alerts = await db.select().from(userAlerts).where(eq(userAlerts.isActive, true));
      
      this.highPriorityAlerts.clear();
      this.mediumPriorityAlerts.clear();
      this.lowPriorityAlerts.clear();

      for (const alert of alerts) {
        const alertRule: AlertRule = {
          id: alert.id,
          userId: alert.userId,
          instrumentId: alert.instrumentId,
          alertType: alert.alertType,
          condition: alert.condition,
          targetValue: parseFloat(alert.targetValue),
          priority: alert.priority as 'HIGH' | 'MEDIUM' | 'LOW',
          logicalOperator: (alert.logicalOperator as 'AND' | 'OR') || 'AND',
          deliveryChannels: alert.deliveryChannels || ['email'],
          retryAttempts: alert.retryAttempts || 0,
          maxRetries: alert.maxRetries || 3,
          isActive: alert.isActive,
          triggered: alert.triggered,
          lastTriggered: alert.lastTriggered || undefined
        };

        switch (alert.priority) {
          case 'HIGH':
            this.highPriorityAlerts.set(alert.id, alertRule);
            break;
          case 'MEDIUM':
            this.mediumPriorityAlerts.set(alert.id, alertRule);
            break;
          case 'LOW':
            this.lowPriorityAlerts.set(alert.id, alertRule);
            break;
        }
      }

      console.log(`📊 Loaded alerts: HIGH=${this.highPriorityAlerts.size}, MEDIUM=${this.mediumPriorityAlerts.size}, LOW=${this.lowPriorityAlerts.size}`);
    } catch (error) {
      console.error('❌ Error loading active alerts:', error);
    }
  }

  private startPrioritySchedulers(): void {
    // HIGH Priority: Check every 10 seconds
    this.highPriorityInterval = setInterval(async () => {
      await this.evaluateAlerts(Array.from(this.highPriorityAlerts.values()), 'HIGH');
    }, 10 * 1000);

    // MEDIUM Priority: Check every 1 minute
    this.mediumPriorityInterval = setInterval(async () => {
      await this.evaluateAlerts(Array.from(this.mediumPriorityAlerts.values()), 'MEDIUM');
    }, 60 * 1000);

    // LOW Priority: Check every 5 minutes
    this.lowPriorityInterval = setInterval(async () => {
      await this.evaluateAlerts(Array.from(this.lowPriorityAlerts.values()), 'LOW');
    }, 5 * 60 * 1000);

    console.log('🔄 Priority-based schedulers started (HIGH: 10s, MEDIUM: 1min, LOW: 5min)');
  }

  private async evaluateAlerts(alerts: AlertRule[], priority: string): Promise<void> {
    if (alerts.length === 0) return;

    console.log(`🔍 Evaluating ${alerts.length} ${priority} priority alerts...`);
    
    for (const alert of alerts) {
      try {
        const marketData = await this.getCurrentMarketData(alert.instrumentId);
        if (!marketData) continue;

        const evaluationResult = await this.evaluateAlertCondition(alert, marketData);
        
        if (evaluationResult.shouldTrigger && !alert.triggered) {
          await this.triggerAlert(alert, evaluationResult, marketData);
        }

        // Log the evaluation
        await this.logAlertEvaluation(alert, evaluationResult, marketData);
        
      } catch (error) {
        console.error(`❌ Error evaluating alert ${alert.id}:`, error);
      }
    }
  }

  private async getCurrentMarketData(instrumentId: number): Promise<MarketData | null> {
    try {
      // Get latest option data for the instrument
      const [latestData] = await db
        .select()
        .from(optionData)
        .where(eq(optionData.instrumentId, instrumentId))
        .orderBy(optionData.timestamp)
        .limit(1);

      if (!latestData) return null;

      return {
        instrumentId,
        currentPrice: parseFloat(latestData.lastTradedPrice),
        volume: latestData.volume,
        openInterest: latestData.openInterest,
        oiChange: latestData.oiChange,
        timestamp: latestData.timestamp
      };
    } catch (error) {
      console.error(`❌ Error fetching market data for instrument ${instrumentId}:`, error);
      return null;
    }
  }

  private async evaluateAlertCondition(alert: AlertRule, marketData: MarketData): Promise<AlertEvaluationResult> {
    const currentValue = this.extractCurrentValue(alert.alertType, marketData);
    const shouldTrigger = this.checkCondition(alert.condition, currentValue, alert.targetValue);

    return {
      alertId: alert.id,
      shouldTrigger,
      currentValue,
      condition: alert.condition,
      targetValue: alert.targetValue,
      confidence: shouldTrigger ? 0.95 : 0.0 // High confidence for exact matches
    };
  }

  private extractCurrentValue(alertType: string, marketData: MarketData): number {
    switch (alertType.toLowerCase()) {
      case 'price':
      case 'ltp':
        return marketData.currentPrice;
      case 'volume':
        return marketData.volume;
      case 'oi':
      case 'open_interest':
        return marketData.openInterest;
      case 'oi_change':
        return marketData.oiChange;
      default:
        return marketData.currentPrice;
    }
  }

  private checkCondition(condition: string, currentValue: number, targetValue: number): boolean {
    switch (condition.toLowerCase()) {
      case 'above':
      case '>':
      case '>=':
        return currentValue >= targetValue;
      case 'below':
      case '<':
      case '<=':
        return currentValue <= targetValue;
      case 'equals':
      case '=':
      case '==':
        return Math.abs(currentValue - targetValue) < 0.01; // Small tolerance for decimal comparison
      case 'not_equals':
      case '!=':
        return Math.abs(currentValue - targetValue) >= 0.01;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: AlertRule, evaluation: AlertEvaluationResult, marketData: MarketData): Promise<void> {
    console.log(`🚨 Triggering alert ${alert.id} for user ${alert.userId}`);
    
    // Mark alert as triggered
    await db
      .update(userAlerts)
      .set({ 
        triggered: true, 
        lastTriggered: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userAlerts.id, alert.id));

    // Update local cache
    const alertMap = this.getAlertMapByPriority(alert.priority);
    if (alertMap.has(alert.id)) {
      const updatedAlert = alertMap.get(alert.id)!;
      updatedAlert.triggered = true;
      updatedAlert.lastTriggered = new Date();
      alertMap.set(alert.id, updatedAlert);
    }

    // Queue alert for delivery across all channels
    for (const channel of alert.deliveryChannels) {
      const execution: AlertExecution = {
        id: 0, // Will be set by database
        alertId: alert.id,
        executedAt: new Date(),
        sentStatus: 'PENDING',
        deliveryChannel: channel,
        retryCount: 0,
        metadata: {
          evaluation,
          marketData,
          alert: {
            type: alert.alertType,
            condition: alert.condition,
            targetValue: alert.targetValue,
            currentValue: evaluation.currentValue
          }
        }
      };

      this.executionQueue.push(execution);
    }

    // Process the execution queue
    await this.processExecutionQueue();

    this.emit('alertTriggered', {
      alertId: alert.id,
      userId: alert.userId,
      evaluation,
      marketData,
      channels: alert.deliveryChannels
    });
  }

  private getAlertMapByPriority(priority: string): Map<number, AlertRule> {
    switch (priority) {
      case 'HIGH':
        return this.highPriorityAlerts;
      case 'MEDIUM':
        return this.mediumPriorityAlerts;
      case 'LOW':
        return this.lowPriorityAlerts;
      default:
        return this.mediumPriorityAlerts;
    }
  }

  private async processExecutionQueue(): Promise<void> {
    while (this.executionQueue.length > 0) {
      const execution = this.executionQueue.shift()!;
      await this.executeAlertDelivery(execution);
    }
  }

  private async executeAlertDelivery(execution: AlertExecution): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.sendAlertToChannel(execution);
      
      const responseTime = Date.now() - startTime;
      execution.sentStatus = 'SENT';
      execution.responseTime = responseTime;
      
      console.log(`✅ Alert ${execution.alertId} sent via ${execution.deliveryChannel} (${responseTime}ms)`);
      
    } catch (error) {
      execution.sentStatus = 'FAILED';
      execution.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      execution.responseTime = Date.now() - startTime;
      
      console.error(`❌ Failed to send alert ${execution.alertId} via ${execution.deliveryChannel}:`, error);
      
      // Add to retry queue if under retry limit
      if (execution.retryCount < 3) {
        execution.retryCount++;
        execution.sentStatus = 'RETRY';
        this.retryQueue.push(execution);
      }
    }

    // Log the execution result
    await this.logExecution(execution);
  }

  private async sendAlertToChannel(execution: AlertExecution): Promise<void> {
    const { alertId, deliveryChannel, metadata } = execution;
    
    switch (deliveryChannel.toLowerCase()) {
      case 'email':
        await this.sendEmailAlert(execution);
        break;
      case 'webhook':
        await this.sendWebhookAlert(execution);
        break;
      case 'push':
        await this.sendPushAlert(execution);
        break;
      case 'in_app':
        await this.sendInAppAlert(execution);
        break;
      default:
        throw new Error(`Unsupported delivery channel: ${deliveryChannel}`);
    }
  }

  private async sendEmailAlert(execution: AlertExecution): Promise<void> {
    // Simulate email sending with realistic delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    const { alert, evaluation, marketData } = execution.metadata;
    console.log(`📧 Email Alert: ${alert.type} ${alert.condition} ${alert.targetValue} (Current: ${evaluation.currentValue})`);
  }

  private async sendWebhookAlert(execution: AlertExecution): Promise<void> {
    // Simulate webhook call with realistic delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    const { alert, evaluation, marketData } = execution.metadata;
    console.log(`🔗 Webhook Alert: ${alert.type} ${alert.condition} ${alert.targetValue} (Current: ${evaluation.currentValue})`);
  }

  private async sendPushAlert(execution: AlertExecution): Promise<void> {
    // Simulate push notification with realistic delay
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
    
    const { alert, evaluation, marketData } = execution.metadata;
    console.log(`📱 Push Alert: ${alert.type} ${alert.condition} ${alert.targetValue} (Current: ${evaluation.currentValue})`);
  }

  private async sendInAppAlert(execution: AlertExecution): Promise<void> {
    // In-app notifications are instant
    const { alert, evaluation, marketData } = execution.metadata;
    console.log(`📲 In-App Alert: ${alert.type} ${alert.condition} ${alert.targetValue} (Current: ${evaluation.currentValue})`);
  }

  private async logExecution(execution: AlertExecution): Promise<void> {
    try {
      await db.insert(alertExecutionLog).values({
        alertId: execution.alertId,
        executedAt: execution.executedAt,
        sentStatus: execution.sentStatus,
        deliveryChannel: execution.deliveryChannel,
        errorMessage: execution.errorMessage || null,
        responseTime: execution.responseTime || null,
        retryCount: execution.retryCount,
        metadata: execution.metadata
      });
    } catch (error) {
      console.error('❌ Error logging alert execution:', error);
    }
  }

  private async logAlertEvaluation(alert: AlertRule, evaluation: AlertEvaluationResult, marketData: MarketData): Promise<void> {
    // This could be extended to log all evaluations for analytics
    if (evaluation.shouldTrigger) {
      console.log(`📊 Alert ${alert.id} evaluation: TRIGGERED (${evaluation.currentValue} ${alert.condition} ${alert.targetValue})`);
    }
  }

  private startRetryProcessor(): void {
    // Process retry queue every 30 seconds
    setInterval(async () => {
      if (this.retryQueue.length > 0) {
        console.log(`🔄 Processing ${this.retryQueue.length} alert retries...`);
        
        const retriesToProcess = [...this.retryQueue];
        this.retryQueue.length = 0;

        for (const execution of retriesToProcess) {
          await this.executeAlertDelivery(execution);
        }
      }
    }, 30 * 1000);
  }

  async addAlert(alertData: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const [newAlert] = await db.insert(userAlerts).values({
      userId: alertData.userId,
      instrumentId: alertData.instrumentId,
      alertType: alertData.alertType,
      condition: alertData.condition,
      targetValue: alertData.targetValue.toString(),
      priority: alertData.priority,
      logicalOperator: alertData.logicalOperator,
      deliveryChannels: alertData.deliveryChannels,
      retryAttempts: alertData.retryAttempts,
      maxRetries: alertData.maxRetries,
      isActive: alertData.isActive,
      triggered: alertData.triggered
    }).returning();

    const alertRule: AlertRule = {
      id: newAlert.id,
      userId: newAlert.userId,
      instrumentId: newAlert.instrumentId,
      alertType: newAlert.alertType,
      condition: newAlert.condition,
      targetValue: parseFloat(newAlert.targetValue),
      priority: newAlert.priority as 'HIGH' | 'MEDIUM' | 'LOW',
      logicalOperator: (newAlert.logicalOperator as 'AND' | 'OR') || 'AND',
      deliveryChannels: newAlert.deliveryChannels || ['email'],
      retryAttempts: newAlert.retryAttempts || 0,
      maxRetries: newAlert.maxRetries || 3,
      isActive: newAlert.isActive,
      triggered: newAlert.triggered,
      lastTriggered: newAlert.lastTriggered || undefined
    };

    // Add to appropriate priority queue
    const alertMap = this.getAlertMapByPriority(alertRule.priority);
    alertMap.set(alertRule.id, alertRule);

    console.log(`✅ Added ${alertRule.priority} priority alert ${alertRule.id}`);
    
    return alertRule;
  }

  async removeAlert(alertId: number): Promise<boolean> {
    try {
      await db.update(userAlerts).set({ isActive: false }).where(eq(userAlerts.id, alertId));

      // Remove from all priority queues
      this.highPriorityAlerts.delete(alertId);
      this.mediumPriorityAlerts.delete(alertId);
      this.lowPriorityAlerts.delete(alertId);

      console.log(`🗑️ Removed alert ${alertId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error removing alert ${alertId}:`, error);
      return false;
    }
  }

  getSystemStats(): {
    totalAlerts: number;
    alertsByPriority: Record<string, number>;
    executionQueueSize: number;
    retryQueueSize: number;
    isRunning: boolean;
  } {
    return {
      totalAlerts: this.highPriorityAlerts.size + this.mediumPriorityAlerts.size + this.lowPriorityAlerts.size,
      alertsByPriority: {
        HIGH: this.highPriorityAlerts.size,
        MEDIUM: this.mediumPriorityAlerts.size,
        LOW: this.lowPriorityAlerts.size
      },
      executionQueueSize: this.executionQueue.length,
      retryQueueSize: this.retryQueue.length,
      isRunning: this.isInitialized
    };
  }

  stop(): void {
    if (this.highPriorityInterval) {
      clearInterval(this.highPriorityInterval);
      this.highPriorityInterval = null;
    }
    if (this.mediumPriorityInterval) {
      clearInterval(this.mediumPriorityInterval);
      this.mediumPriorityInterval = null;
    }
    if (this.lowPriorityInterval) {
      clearInterval(this.lowPriorityInterval);
      this.lowPriorityInterval = null;
    }

    this.isInitialized = false;
    console.log('⏹️ Priority-Based Alert Engine stopped');
  }
}

// Export singleton instance
export const priorityBasedAlertEngine = new PriorityBasedAlertEngine();