import { DatabaseService } from '../lib/database';

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
  features: string[];
  maxInstruments: number;
  maxAlerts: number;
  realTimeData: boolean;
  patternDetectionTypes: string[];
  apiRateLimit: number;
}

export interface UserSubscription {
  id: number;
  userId: number;
  planId: number;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  paymentMethodId?: string;
}

export interface FeaturePermission {
  featureKey: string;
  isEnabled: boolean;
  usageLimit?: number;
}

export class SubscriptionService {
  private static instance: SubscriptionService;

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  // Predefined subscription plans
  private readonly PLANS: Record<string, Omit<SubscriptionPlan, 'id'>> = {
    FREE: {
      name: 'Free',
      price: 0,
      billingCycle: 'MONTHLY',
      features: [
        '2 instruments monitoring',
        'Basic pattern detection',
        '5 daily alerts',
        'Standard support'
      ],
      maxInstruments: 2,
      maxAlerts: 5,
      realTimeData: false,
      patternDetectionTypes: ['CALL_LONG_BUILDUP', 'PUT_LONG_BUILDUP'],
      apiRateLimit: 100
    },

    PRO: {
      name: 'Pro',
      price: 49,
      billingCycle: 'MONTHLY',
      features: [
        'All instruments monitoring',
        'Advanced pattern detection',
        '100 real-time alerts',
        'Backtesting engine',
        'Custom scanners',
        'Email & SMS alerts',
        'Priority support'
      ],
      maxInstruments: -1, // Unlimited
      maxAlerts: 100,
      realTimeData: true,
      patternDetectionTypes: [
        'CALL_LONG_BUILDUP',
        'PUT_LONG_BUILDUP',
        'CALL_SHORT_COVER',
        'PUT_SHORT_COVER',
        'MAX_PAIN',
        'GAMMA_SQUEEZE'
      ],
      apiRateLimit: 1000
    },

    VIP: {
      name: 'VIP',
      price: 149,
      billingCycle: 'MONTHLY',
      features: [
        'Everything in Pro',
        'Unlimited alerts',
        'API access',
        'Advanced analytics',
        'Portfolio integration',
        'White-label options',
        'Dedicated support',
        'Custom integrations'
      ],
      maxInstruments: -1,
      maxAlerts: -1,
      realTimeData: true,
      patternDetectionTypes: [
        'CALL_LONG_BUILDUP',
        'PUT_LONG_BUILDUP',
        'CALL_SHORT_COVER',
        'PUT_SHORT_COVER',
        'MAX_PAIN',
        'GAMMA_SQUEEZE',
        'VOLATILITY_SPIKE',
        'UNUSUAL_ACTIVITY',
        'SUPPORT_RESISTANCE',
        'MOMENTUM_SHIFT'
      ],
      apiRateLimit: 10000
    },

    INSTITUTIONAL: {
      name: 'Institutional',
      price: 499,
      billingCycle: 'MONTHLY',
      features: [
        'Everything in VIP',
        'Multi-tenant support',
        'Custom branding',
        'SLA guarantees',
        'Dedicated infrastructure',
        'Custom data feeds',
        'Advanced compliance',
        '24/7 support'
      ],
      maxInstruments: -1,
      maxAlerts: -1,
      realTimeData: true,
      patternDetectionTypes: [
        'CALL_LONG_BUILDUP',
        'PUT_LONG_BUILDUP',
        'CALL_SHORT_COVER',
        'PUT_SHORT_COVER',
        'MAX_PAIN',
        'GAMMA_SQUEEZE',
        'VOLATILITY_SPIKE',
        'UNUSUAL_ACTIVITY',
        'SUPPORT_RESISTANCE',
        'MOMENTUM_SHIFT'
      ],
      apiRateLimit: 100000
    }
  };

  async initializeSubscriptionPlans(): Promise<void> {
    try {
      // Create subscription plans table if not exists
      await DatabaseService.query(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          billing_cycle ENUM('MONTHLY', 'YEARLY') NOT NULL,
          features JSON NOT NULL,
          max_instruments INT DEFAULT 2,
          max_alerts INT DEFAULT 5,
          real_time_data BOOLEAN DEFAULT FALSE,
          pattern_detection_types JSON,
          api_rate_limit INT DEFAULT 100,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create user subscriptions table
      await DatabaseService.query(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          plan_id INT NOT NULL,
          status ENUM('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL') NOT NULL DEFAULT 'TRIAL',
          trial_ends_at TIMESTAMP NULL,
          current_period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          current_period_end TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 30 DAY),
          payment_method_id VARCHAR(255),
          stripe_subscription_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_subscription (user_id),
          INDEX idx_plan_subscription (plan_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Create feature permissions table
      await DatabaseService.query(`
        CREATE TABLE IF NOT EXISTS feature_permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plan_id INT NOT NULL,
          feature_key VARCHAR(100) NOT NULL,
          is_enabled BOOLEAN DEFAULT TRUE,
          usage_limit INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_plan_feature (plan_id, feature_key),
          UNIQUE KEY unique_plan_feature (plan_id, feature_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Insert default plans if they don't exist
      await this.insertDefaultPlans();

      console.log('✅ Subscription system initialized');
    } catch (error) {
      console.error('❌ Error initializing subscription system:', error);
    }
  }

  private async insertDefaultPlans(): Promise<void> {
    for (const [planKey, planData] of Object.entries(this.PLANS)) {
      try {
        const existingPlan = await DatabaseService.query(
          'SELECT id FROM subscription_plans WHERE name = ?',
          [planData.name]
        );

        if (existingPlan.rows.length === 0) {
          const result = await DatabaseService.query(`
            INSERT INTO subscription_plans 
            (name, price, billing_cycle, features, max_instruments, max_alerts, 
             real_time_data, pattern_detection_types, api_rate_limit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            planData.name,
            planData.price,
            planData.billingCycle,
            JSON.stringify(planData.features),
            planData.maxInstruments,
            planData.maxAlerts,
            planData.realTimeData,
            JSON.stringify(planData.patternDetectionTypes),
            planData.apiRateLimit
          ]);

          console.log(`✅ Created subscription plan: ${planData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error creating plan ${planData.name}:`, error);
      }
    }
  }

  async getUserSubscription(userId: number): Promise<UserSubscription | null> {
    try {
      const result = await DatabaseService.query(`
        SELECT us.*, sp.name as plan_name, sp.features, sp.max_instruments, 
               sp.max_alerts, sp.real_time_data, sp.pattern_detection_types, sp.api_rate_limit
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? AND us.status IN ('ACTIVE', 'TRIAL')
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [userId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          id: row.id,
          userId: row.user_id,
          planId: row.plan_id,
          status: row.status,
          trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : undefined,
          currentPeriodStart: new Date(row.current_period_start),
          currentPeriodEnd: new Date(row.current_period_end),
          paymentMethodId: row.payment_method_id
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  async checkFeatureAccess(userId: number, featureKey: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        // No subscription = free tier access only
        return this.checkFreeFeatureAccess(featureKey);
      }

      // Check if subscription is active
      if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
        return this.checkFreeFeatureAccess(featureKey);
      }

      // Check trial expiration
      if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
        if (new Date() > subscription.trialEndsAt) {
          return this.checkFreeFeatureAccess(featureKey);
        }
      }

      // Get plan permissions
      const planPermissions = await this.getPlanPermissions(subscription.planId);
      const permission = planPermissions.find(p => p.featureKey === featureKey);

      return permission ? permission.isEnabled : false;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  private checkFreeFeatureAccess(featureKey: string): boolean {
    const freeFeatures = [
      'basic_patterns',
      'limited_instruments',
      'daily_alerts',
      'standard_support'
    ];
    
    return freeFeatures.includes(featureKey);
  }

  async getPlanPermissions(planId: number): Promise<FeaturePermission[]> {
    try {
      const result = await DatabaseService.query(`
        SELECT feature_key, is_enabled, usage_limit
        FROM feature_permissions
        WHERE plan_id = ?
      `, [planId]);

      return result.rows.map(row => ({
        featureKey: row.feature_key,
        isEnabled: row.is_enabled,
        usageLimit: row.usage_limit
      }));
    } catch (error) {
      console.error('Error fetching plan permissions:', error);
      return [];
    }
  }

  async createTrialSubscription(userId: number, planName: string = 'PRO'): Promise<boolean> {
    try {
      // Get plan ID
      const planResult = await DatabaseService.query(
        'SELECT id FROM subscription_plans WHERE name = ?',
        [planName]
      );

      if (planResult.rows.length === 0) {
        throw new Error(`Plan ${planName} not found`);
      }

      const planId = planResult.rows[0].id;
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

      await DatabaseService.query(`
        INSERT INTO user_subscriptions 
        (user_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
        VALUES (?, ?, 'TRIAL', ?, CURRENT_TIMESTAMP, ?)
      `, [userId, planId, trialEndsAt, trialEndsAt]);

      console.log(`✅ Created trial subscription for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error creating trial subscription:', error);
      return false;
    }
  }

  async upgradeSubscription(userId: number, newPlanName: string, paymentMethodId?: string): Promise<boolean> {
    try {
      // Get new plan
      const planResult = await DatabaseService.query(
        'SELECT id FROM subscription_plans WHERE name = ?',
        [newPlanName]
      );

      if (planResult.rows.length === 0) {
        throw new Error(`Plan ${newPlanName} not found`);
      }

      const newPlanId = planResult.rows[0].id;
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 1 month

      // Cancel existing subscription
      await DatabaseService.query(`
        UPDATE user_subscriptions 
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND status IN ('ACTIVE', 'TRIAL')
      `, [userId]);

      // Create new subscription
      await DatabaseService.query(`
        INSERT INTO user_subscriptions 
        (user_id, plan_id, status, current_period_start, current_period_end, payment_method_id)
        VALUES (?, ?, 'ACTIVE', CURRENT_TIMESTAMP, ?)
      `, [newPlanId, currentPeriodEnd, paymentMethodId]);

      console.log(`✅ Upgraded user ${userId} to ${newPlanName}`);
      return true;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return false;
    }
  }

  async cancelSubscription(userId: number): Promise<boolean> {
    try {
      await DatabaseService.query(`
        UPDATE user_subscriptions 
        SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND status IN ('ACTIVE', 'TRIAL')
      `, [userId]);

      console.log(`✅ Cancelled subscription for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const result = await DatabaseService.query(`
        SELECT id, name, price, billing_cycle, features, max_instruments, 
               max_alerts, real_time_data, pattern_detection_types, api_rate_limit
        FROM subscription_plans
        WHERE is_active = TRUE
        ORDER BY price ASC
      `);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        price: row.price,
        billingCycle: row.billing_cycle,
        features: JSON.parse(row.features),
        maxInstruments: row.max_instruments,
        maxAlerts: row.max_alerts,
        realTimeData: row.real_time_data,
        patternDetectionTypes: JSON.parse(row.pattern_detection_types),
        apiRateLimit: row.api_rate_limit
      }));
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      return [];
    }
  }

  async getSubscriptionStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    revenue: number;
  }> {
    try {
      const statsResult = await DatabaseService.query(`
        SELECT 
          COUNT(*) as total_subscriptions,
          SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_subscriptions,
          SUM(CASE WHEN status = 'TRIAL' THEN 1 ELSE 0 END) as trial_subscriptions
        FROM user_subscriptions
      `);

      const revenueResult = await DatabaseService.query(`
        SELECT SUM(sp.price) as total_revenue
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'ACTIVE'
      `);

      const stats = statsResult.rows[0];
      const revenue = revenueResult.rows[0];

      return {
        totalSubscriptions: stats.total_subscriptions || 0,
        activeSubscriptions: stats.active_subscriptions || 0,
        trialSubscriptions: stats.trial_subscriptions || 0,
        revenue: revenue.total_revenue || 0
      };
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        trialSubscriptions: 0,
        revenue: 0
      };
    }
  }
}