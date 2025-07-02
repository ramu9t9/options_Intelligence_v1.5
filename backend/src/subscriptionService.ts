import { storage } from './storage';
import { EventEmitter } from 'events';

export interface SubscriptionLimits {
  maxInstruments: number;
  maxAlerts: number;
  realTimeData: boolean;
  apiRateLimit: number;
  patternDetectionTypes: string[];
  features: string[];
}

export interface UsageStats {
  instrumentsUsed: number;
  alertsCreated: number;
  apiCallsToday: number;
  patternsDetected: number;
  lastActivity: Date;
}

export class SubscriptionService extends EventEmitter {
  private userLimits = new Map<number, SubscriptionLimits>();
  private userUsage = new Map<number, UsageStats>();
  private dailyApiCalls = new Map<string, number>();

  async initialize(): Promise<void> {
    console.log('Initializing Subscription Service...');
    
    // Load subscription data for active users
    await this.loadUserSubscriptions();
    
    // Reset daily counters at midnight
    this.scheduleDailyReset();
    
    console.log('Subscription Service initialized');
  }

  private async loadUserSubscriptions(): Promise<void> {
    try {
      // Get all subscription plans
      const plans = await storage.getSubscriptionPlans();
      
      for (const plan of plans) {
        const limits: SubscriptionLimits = {
          maxInstruments: plan.maxInstruments,
          maxAlerts: plan.maxAlerts,
          realTimeData: plan.realTimeData,
          apiRateLimit: plan.apiRateLimit,
          patternDetectionTypes: plan.patternDetectionTypes,
          features: plan.features
        };
        
        // This would be expanded to load actual user subscriptions
        // For now, storing plan limits by plan ID
        this.userLimits.set(plan.id, limits);
      }
    } catch (error) {
      console.error('Error loading user subscriptions:', error);
    }
  }

  async getUserLimits(userId: number): Promise<SubscriptionLimits> {
    try {
      const subscription = await storage.getUserSubscription(userId);
      
      if (subscription && subscription.status === 'ACTIVE') {
        const plan = await storage.getSubscriptionPlan(subscription.planId);
        if (plan) {
          return {
            maxInstruments: plan.maxInstruments,
            maxAlerts: plan.maxAlerts,
            realTimeData: plan.realTimeData,
            apiRateLimit: plan.apiRateLimit,
            patternDetectionTypes: plan.patternDetectionTypes,
            features: plan.features
          };
        }
      }
      
      // Return free tier limits as default
      return this.getFreeTierLimits();
    } catch (error) {
      console.error('Error getting user limits:', error);
      return this.getFreeTierLimits();
    }
  }

  private getFreeTierLimits(): SubscriptionLimits {
    return {
      maxInstruments: 2,
      maxAlerts: 5,
      realTimeData: false,
      apiRateLimit: 100,
      patternDetectionTypes: ['CALL_LONG_BUILDUP', 'PUT_LONG_BUILDUP'],
      features: ['Basic patterns', 'Historical data']
    };
  }

  async getUserUsage(userId: number): Promise<UsageStats> {
    if (!this.userUsage.has(userId)) {
      // Initialize usage stats
      const stats: UsageStats = {
        instrumentsUsed: 0,
        alertsCreated: 0,
        apiCallsToday: 0,
        patternsDetected: 0,
        lastActivity: new Date()
      };
      
      // Load actual usage from database
      const alerts = await storage.getUserAlerts(userId);
      stats.alertsCreated = alerts.length;
      
      this.userUsage.set(userId, stats);
    }
    
    return this.userUsage.get(userId)!;
  }

  async checkInstrumentLimit(userId: number, requestedInstruments: string[]): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    message?: string;
  }> {
    const limits = await this.getUserLimits(userId);
    const usage = await this.getUserUsage(userId);
    
    const newTotal = requestedInstruments.length;
    
    if (newTotal > limits.maxInstruments) {
      return {
        allowed: false,
        limit: limits.maxInstruments,
        current: usage.instrumentsUsed,
        message: `Instrument limit exceeded. Your plan allows ${limits.maxInstruments} instruments.`
      };
    }
    
    return {
      allowed: true,
      limit: limits.maxInstruments,
      current: newTotal
    };
  }

  async checkAlertLimit(userId: number): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    message?: string;
  }> {
    const limits = await this.getUserLimits(userId);
    const usage = await this.getUserUsage(userId);
    
    if (usage.alertsCreated >= limits.maxAlerts) {
      return {
        allowed: false,
        limit: limits.maxAlerts,
        current: usage.alertsCreated,
        message: `Alert limit reached. Your plan allows ${limits.maxAlerts} alerts.`
      };
    }
    
    return {
      allowed: true,
      limit: limits.maxAlerts,
      current: usage.alertsCreated
    };
  }

  async checkApiRateLimit(userId: number): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    resetTime?: Date;
  }> {
    const limits = await this.getUserLimits(userId);
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}:${today}`;
    
    const currentCalls = this.dailyApiCalls.get(key) || 0;
    
    if (currentCalls >= limits.apiRateLimit) {
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0);
      
      return {
        allowed: false,
        limit: limits.apiRateLimit,
        current: currentCalls,
        resetTime
      };
    }
    
    return {
      allowed: true,
      limit: limits.apiRateLimit,
      current: currentCalls
    };
  }

  async incrementApiCall(userId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}:${today}`;
    
    const current = this.dailyApiCalls.get(key) || 0;
    this.dailyApiCalls.set(key, current + 1);
    
    // Update user usage
    const usage = await this.getUserUsage(userId);
    usage.apiCallsToday = current + 1;
    usage.lastActivity = new Date();
  }

  async incrementAlert(userId: number): Promise<void> {
    const usage = await this.getUserUsage(userId);
    usage.alertsCreated++;
    usage.lastActivity = new Date();
  }

  async hasFeatureAccess(userId: number, feature: string): Promise<boolean> {
    const limits = await this.getUserLimits(userId);
    return limits.features.includes(feature);
  }

  async hasPatternAccess(userId: number, patternType: string): Promise<boolean> {
    const limits = await this.getUserLimits(userId);
    return limits.patternDetectionTypes.includes(patternType);
  }

  async hasRealTimeDataAccess(userId: number): Promise<boolean> {
    const limits = await this.getUserLimits(userId);
    return limits.realTimeData;
  }

  async createSubscription(userId: number, planId: number, trialDays?: number): Promise<boolean> {
    try {
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      const now = new Date();
      const subscription = await storage.createUserSubscription({
        userId,
        planId,
        status: trialDays ? 'TRIAL' : 'ACTIVE',
        trialEndsAt: trialDays ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : undefined,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      // Update cached limits
      const limits: SubscriptionLimits = {
        maxInstruments: plan.maxInstruments,
        maxAlerts: plan.maxAlerts,
        realTimeData: plan.realTimeData,
        apiRateLimit: plan.apiRateLimit,
        patternDetectionTypes: plan.patternDetectionTypes,
        features: plan.features
      };
      
      this.userLimits.set(userId, limits);
      
      // Emit subscription event
      this.emit('subscriptionCreated', { userId, planId, subscription });
      
      console.log(`Subscription created for user ${userId}, plan ${planId}`);
      return true;
    } catch (error) {
      console.error('Error creating subscription:', error);
      return false;
    }
  }

  async upgradeSubscription(userId: number, newPlanId: number): Promise<boolean> {
    try {
      const currentSubscription = await storage.getUserSubscription(userId);
      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }

      const newPlan = await storage.getSubscriptionPlan(newPlanId);
      if (!newPlan) {
        throw new Error('Invalid plan');
      }

      // Update subscription
      const updatedSubscription = await storage.updateUserSubscription(currentSubscription.id, {
        planId: newPlanId,
        updatedAt: new Date()
      });

      // Update cached limits
      const limits: SubscriptionLimits = {
        maxInstruments: newPlan.maxInstruments,
        maxAlerts: newPlan.maxAlerts,
        realTimeData: newPlan.realTimeData,
        apiRateLimit: newPlan.apiRateLimit,
        patternDetectionTypes: newPlan.patternDetectionTypes,
        features: newPlan.features
      };
      
      this.userLimits.set(userId, limits);
      
      this.emit('subscriptionUpgraded', { userId, oldPlanId: currentSubscription.planId, newPlanId });
      
      console.log(`Subscription upgraded for user ${userId} to plan ${newPlanId}`);
      return true;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return false;
    }
  }

  async cancelSubscription(userId: number, immediately: boolean = false): Promise<boolean> {
    try {
      const subscription = await storage.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const cancelDate = immediately ? new Date() : subscription.currentPeriodEnd;
      
      await storage.updateUserSubscription(subscription.id, {
        status: 'CANCELLED',
        cancelledAt: cancelDate
      });

      // Reset to free tier if immediate cancellation
      if (immediately) {
        this.userLimits.set(userId, this.getFreeTierLimits());
      }

      this.emit('subscriptionCancelled', { userId, immediately });
      
      console.log(`Subscription cancelled for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyCounts();
      
      // Schedule daily resets
      setInterval(() => {
        this.resetDailyCounts();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  private resetDailyCounts(): void {
    this.dailyApiCalls.clear();
    
    // Reset daily usage stats
    Array.from(this.userUsage.entries()).forEach(([userId, usage]) => {
      usage.apiCallsToday = 0;
    });
    
    console.log('Daily usage counters reset');
  }

  async getSubscriptionAnalytics(): Promise<{
    totalSubscriptions: number;
    subscriptionsByPlan: Record<string, number>;
    revenue: {
      monthly: number;
      annual: number;
    };
    churnRate: number;
    conversionRate: number;
  }> {
    try {
      const plans = await storage.getSubscriptionPlans();
      const analytics = {
        totalSubscriptions: 0,
        subscriptionsByPlan: {} as Record<string, number>,
        revenue: { monthly: 0, annual: 0 },
        churnRate: 0,
        conversionRate: 0
      };

      for (const plan of plans) {
        analytics.subscriptionsByPlan[plan.name] = 0;
        
        if (plan.billingCycle === 'MONTHLY') {
          analytics.revenue.monthly += parseFloat(plan.price);
        } else if (plan.billingCycle === 'YEARLY') {
          analytics.revenue.annual += parseFloat(plan.price);
        }
      }

      return analytics;
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
      return {
        totalSubscriptions: 0,
        subscriptionsByPlan: {},
        revenue: { monthly: 0, annual: 0 },
        churnRate: 0,
        conversionRate: 0
      };
    }
  }

  getServiceStats(): {
    activeUsers: number;
    totalApiCalls: number;
    subscriptionPlans: number;
  } {
    return {
      activeUsers: this.userUsage.size,
      totalApiCalls: Array.from(this.dailyApiCalls.values()).reduce((sum, calls) => sum + calls, 0),
      subscriptionPlans: this.userLimits.size
    };
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();