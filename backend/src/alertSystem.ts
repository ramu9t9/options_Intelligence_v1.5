import { EventEmitter } from 'events';
import { storage } from './storage';
import { PatternResult } from './patternDetector';

export interface AlertRule {
  id: string;
  userId: number;
  instrumentId: number;
  alertType: 'PRICE' | 'OI_CHANGE' | 'VOLUME_SPIKE' | 'PATTERN_DETECTED' | 'VOLATILITY';
  condition: 'ABOVE' | 'BELOW' | 'EQUALS' | 'PERCENTAGE_CHANGE';
  targetValue: number;
  isActive: boolean;
  channels: AlertChannel[];
  triggeredCount: number;
  lastTriggered?: Date;
  createdAt: Date;
}

export interface AlertChannel {
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK' | 'IN_APP';
  config: Record<string, any>;
  isEnabled: boolean;
}

export interface AlertNotification {
  id: string;
  alertRuleId: string;
  userId: number;
  title: string;
  message: string;
  data: Record<string, any>;
  channels: AlertChannel[];
  status: 'PENDING' | 'SENT' | 'FAILED';
  createdAt: Date;
  sentAt?: Date;
}

export class AlertSystem extends EventEmitter {
  private activeAlerts = new Map<string, AlertRule>();
  private notificationQueue: AlertNotification[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔔 Initializing Alert System...');
      
      // Load active alerts from database
      await this.loadActiveAlerts();
      
      // Start notification processing
      this.startNotificationProcessor();
      
      this.isInitialized = true;
      console.log('✅ Alert System initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Alert System:', error);
      throw error;
    }
  }

  private async loadActiveAlerts(): Promise<void> {
    try {
      // This would load from database - simplified for now
      const alerts: AlertRule[] = [];
      
      alerts.forEach(alert => {
        this.activeAlerts.set(alert.id, alert);
      });
      
      console.log(`📊 Loaded ${alerts.length} active alerts`);
    } catch (error) {
      console.error('Error loading active alerts:', error);
    }
  }

  async createAlert(alertRule: Omit<AlertRule, 'id' | 'triggeredCount' | 'createdAt'>): Promise<AlertRule> {
    const newAlert: AlertRule = {
      ...alertRule,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggeredCount: 0,
      createdAt: new Date()
    };

    // Store in database
    await storage.createUserAlert({
      userId: newAlert.userId,
      instrumentId: newAlert.instrumentId,
      alertType: newAlert.alertType,
      condition: `${newAlert.condition}:${newAlert.targetValue}`,
      targetValue: newAlert.targetValue.toString(),
      isActive: newAlert.isActive
    });

    this.activeAlerts.set(newAlert.id, newAlert);
    console.log(`🔔 Created new alert: ${newAlert.id}`);
    
    return newAlert;
  }

  async updateAlert(alertId: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const existingAlert = this.activeAlerts.get(alertId);
    if (!existingAlert) return null;

    const updatedAlert = { ...existingAlert, ...updates };
    this.activeAlerts.set(alertId, updatedAlert);
    
    console.log(`🔄 Updated alert: ${alertId}`);
    return updatedAlert;
  }

  async deleteAlert(alertId: string): Promise<boolean> {
    const deleted = this.activeAlerts.delete(alertId);
    if (deleted) {
      console.log(`🗑️ Deleted alert: ${alertId}`);
    }
    return deleted;
  }

  async checkPriceAlerts(instrumentId: number, currentPrice: number, previousPrice: number): Promise<void> {
    const relevantAlerts = Array.from(this.activeAlerts.values()).filter(
      alert => alert.instrumentId === instrumentId && 
               alert.alertType === 'PRICE' && 
               alert.isActive
    );

    for (const alert of relevantAlerts) {
      if (this.shouldTriggerPriceAlert(alert, currentPrice, previousPrice)) {
        await this.triggerAlert(alert, {
          currentPrice,
          previousPrice,
          instrument: instrumentId
        });
      }
    }
  }

  async checkPatternAlerts(patterns: PatternResult[]): Promise<void> {
    const patternAlerts = Array.from(this.activeAlerts.values()).filter(
      alert => alert.alertType === 'PATTERN_DETECTED' && alert.isActive
    );

    for (const pattern of patterns) {
      for (const alert of patternAlerts) {
        if (await this.shouldTriggerPatternAlert(alert, pattern)) {
          await this.triggerAlert(alert, {
            pattern: pattern.type,
            confidence: pattern.confidence,
            description: pattern.description,
            underlying: pattern.underlying
          });
        }
      }
    }
  }

  private shouldTriggerPriceAlert(alert: AlertRule, currentPrice: number, previousPrice: number): boolean {
    switch (alert.condition) {
      case 'ABOVE':
        return previousPrice <= alert.targetValue && currentPrice > alert.targetValue;
      case 'BELOW':
        return previousPrice >= alert.targetValue && currentPrice < alert.targetValue;
      case 'PERCENTAGE_CHANGE':
        const changePercent = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
        return changePercent >= alert.targetValue;
      default:
        return false;
    }
  }

  private async shouldTriggerPatternAlert(alert: AlertRule, pattern: PatternResult): Promise<boolean> {
    try {
      const instrument = await storage.getInstrument(alert.instrumentId);
      if (!instrument) return false;

      // Check if pattern matches the instrument
      if (instrument.symbol !== pattern.underlying) return false;

      // Check confidence threshold
      return pattern.confidence >= (alert.targetValue / 100);
    } catch (error) {
      console.error('Error checking pattern alert:', error);
      return false;
    }
  }

  private async triggerAlert(alert: AlertRule, data: Record<string, any>): Promise<void> {
    try {
      // Update alert statistics
      alert.triggeredCount++;
      alert.lastTriggered = new Date();

      // Create notification
      const notification: AlertNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alertRuleId: alert.id,
        userId: alert.userId,
        title: this.generateAlertTitle(alert, data),
        message: this.generateAlertMessage(alert, data),
        data,
        channels: alert.channels.filter(channel => channel.isEnabled),
        status: 'PENDING',
        createdAt: new Date()
      };

      this.notificationQueue.push(notification);
      this.emit('alertTriggered', { alert, notification, data });
      
      console.log(`🚨 Alert triggered: ${alert.id} for user ${alert.userId}`);
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  private generateAlertTitle(alert: AlertRule, data: Record<string, any>): string {
    switch (alert.alertType) {
      case 'PRICE':
        return `Price Alert: ${data.currentPrice}`;
      case 'PATTERN_DETECTED':
        return `Pattern Alert: ${data.pattern}`;
      case 'VOLUME_SPIKE':
        return `Volume Spike Alert`;
      case 'VOLATILITY':
        return `Volatility Alert`;
      default:
        return 'Market Alert';
    }
  }

  private generateAlertMessage(alert: AlertRule, data: Record<string, any>): string {
    switch (alert.alertType) {
      case 'PRICE':
        return `Price moved ${alert.condition.toLowerCase()} ${alert.targetValue}. Current: ${data.currentPrice}, Previous: ${data.previousPrice}`;
      case 'PATTERN_DETECTED':
        return `${data.pattern} pattern detected with ${(data.confidence * 100).toFixed(1)}% confidence. ${data.description}`;
      case 'VOLUME_SPIKE':
        return `Unusual volume activity detected. Volume increased by ${data.volumeIncrease}%`;
      case 'VOLATILITY':
        return `Volatility spike detected. Current volatility: ${data.volatility}%`;
      default:
        return 'Market condition alert triggered';
    }
  }

  private startNotificationProcessor(): void {
    this.processingInterval = setInterval(async () => {
      await this.processNotificationQueue();
    }, 5000); // Process every 5 seconds
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.notificationQueue.length === 0) return;

    const pendingNotifications = this.notificationQueue.filter(n => n.status === 'PENDING');
    
    for (const notification of pendingNotifications) {
      try {
        await this.sendNotification(notification);
        notification.status = 'SENT';
        notification.sentAt = new Date();
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error);
        notification.status = 'FAILED';
      }
    }

    // Clean up old notifications (keep last 1000)
    if (this.notificationQueue.length > 1000) {
      this.notificationQueue = this.notificationQueue.slice(-1000);
    }
  }

  private async sendNotification(notification: AlertNotification): Promise<void> {
    const promises = notification.channels.map(channel => 
      this.sendToChannel(notification, channel)
    );

    await Promise.allSettled(promises);
  }

  private async sendToChannel(notification: AlertNotification, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'EMAIL':
        await this.sendEmailNotification(notification, channel);
        break;
      case 'SMS':
        await this.sendSMSNotification(notification, channel);
        break;
      case 'PUSH':
        await this.sendPushNotification(notification, channel);
        break;
      case 'WEBHOOK':
        await this.sendWebhookNotification(notification, channel);
        break;
      case 'IN_APP':
        await this.sendInAppNotification(notification, channel);
        break;
      default:
        console.warn(`Unknown notification channel: ${channel.type}`);
    }
  }

  private async sendEmailNotification(notification: AlertNotification, channel: AlertChannel): Promise<void> {
    // Email implementation would go here
    // For now, just log
    console.log(`📧 Email notification sent: ${notification.title}`);
  }

  private async sendSMSNotification(notification: AlertNotification, channel: AlertChannel): Promise<void> {
    // SMS implementation would go here (Twilio, etc.)
    console.log(`📱 SMS notification sent: ${notification.title}`);
  }

  private async sendPushNotification(notification: AlertNotification, channel: AlertChannel): Promise<void> {
    // Push notification implementation would go here
    console.log(`🔔 Push notification sent: ${notification.title}`);
  }

  private async sendWebhookNotification(notification: AlertNotification, channel: AlertChannel): Promise<void> {
    try {
      // Webhook implementation
      console.log(`🔗 Webhook notification sent: ${notification.title}`);
    } catch (error) {
      console.error('Webhook notification failed:', error);
      throw error;
    }
  }

  private async sendInAppNotification(notification: AlertNotification, channel: AlertChannel): Promise<void> {
    // Broadcast to connected WebSocket clients
    this.emit('inAppNotification', {
      userId: notification.userId,
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: notification.createdAt
      }
    });
    
    console.log(`💬 In-app notification sent: ${notification.title}`);
  }

  getUserAlerts(userId: number): AlertRule[] {
    return Array.from(this.activeAlerts.values()).filter(
      alert => alert.userId === userId
    );
  }

  getUserNotifications(userId: number, limit: number = 50): AlertNotification[] {
    return this.notificationQueue
      .filter(notif => notif.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getSystemStats(): {
    activeAlerts: number;
    totalTriggered: number;
    pendingNotifications: number;
    successRate: number;
  } {
    const alerts = Array.from(this.activeAlerts.values());
    const totalTriggered = alerts.reduce((sum, alert) => sum + alert.triggeredCount, 0);
    const pendingNotifications = this.notificationQueue.filter(n => n.status === 'PENDING').length;
    const sentNotifications = this.notificationQueue.filter(n => n.status === 'SENT').length;
    const totalNotifications = this.notificationQueue.length;
    const successRate = totalNotifications > 0 ? (sentNotifications / totalNotifications) * 100 : 100;

    return {
      activeAlerts: alerts.length,
      totalTriggered,
      pendingNotifications,
      successRate
    };
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.activeAlerts.clear();
    this.notificationQueue = [];
    this.isInitialized = false;
    
    console.log('🔕 Alert System stopped');
  }
}

// Export singleton instance
export const alertSystem = new AlertSystem();