import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Star, 
  Zap, 
  Building, 
  Check, 
  X, 
  CreditCard, 
  Calendar,
  Users,
  TrendingUp,
  Shield,
  Smartphone,
  Mail,
  Bell,
  BarChart3,
  Settings,
  Headphones
} from 'lucide-react';

interface SubscriptionPlan {
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
  popular?: boolean;
  recommended?: boolean;
}

interface UserSubscription {
  id: number;
  planName: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
  trialEndsAt?: Date;
  currentPeriodEnd: Date;
  features: string[];
}

export function SubscriptionManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for demonstration
      const mockPlans: SubscriptionPlan[] = [
        {
          id: 1,
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
        {
          id: 2,
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
          maxInstruments: -1,
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
          apiRateLimit: 1000,
          popular: true,
          recommended: true
        },
        {
          id: 3,
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
        {
          id: 4,
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
      ];

      const mockCurrentSubscription: UserSubscription = {
        id: 1,
        planName: 'Free',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        features: mockPlans[0].features
      };

      setPlans(mockPlans);
      setCurrentSubscription(mockCurrentSubscription);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return <Star className="w-6 h-6 text-gray-500" />;
      case 'pro':
        return <Crown className="w-6 h-6 text-blue-500" />;
      case 'vip':
        return <Zap className="w-6 h-6 text-purple-500" />;
      case 'institutional':
        return <Building className="w-6 h-6 text-green-500" />;
      default:
        return <Star className="w-6 h-6 text-gray-500" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return 'gray';
      case 'pro':
        return 'blue';
      case 'vip':
        return 'purple';
      case 'institutional':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('instrument')) return <BarChart3 className="w-4 h-4" />;
    if (feature.includes('alert')) return <Bell className="w-4 h-4" />;
    if (feature.includes('pattern')) return <TrendingUp className="w-4 h-4" />;
    if (feature.includes('support')) return <Headphones className="w-4 h-4" />;
    if (feature.includes('API')) return <Settings className="w-4 h-4" />;
    if (feature.includes('SMS') || feature.includes('Email')) return <Mail className="w-4 h-4" />;
    if (feature.includes('security') || feature.includes('compliance')) return <Shield className="w-4 h-4" />;
    return <Check className="w-4 h-4" />;
  };

  const handleUpgrade = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      // Mock upgrade process
      console.log(`Upgrading to ${selectedPlan.name} plan`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update current subscription
      setCurrentSubscription({
        id: Date.now(),
        planName: selectedPlan.name,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        features: selectedPlan.features
      });

      setShowUpgradeModal(false);
      setSelectedPlan(null);
      
      // Show success message
      alert(`Successfully upgraded to ${selectedPlan.name} plan!`);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Failed to upgrade subscription. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Unlock the full potential of options trading with our advanced analytics platform.
            Start with a free plan or upgrade for premium features.
          </p>
        </div>

        {/* Current Subscription Status */}
        {currentSubscription && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getPlanIcon(currentSubscription.planName)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Current Plan: {currentSubscription.planName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Status: <span className={`font-medium ${
                      currentSubscription.status === 'ACTIVE' ? 'text-green-600' : 
                      currentSubscription.status === 'TRIAL' ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {currentSubscription.status}
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {currentSubscription.status === 'TRIAL' && currentSubscription.trialEndsAt
                      ? `Trial ends ${currentSubscription.trialEndsAt.toLocaleDateString()}`
                      : `Renews ${currentSubscription.currentPeriodEnd.toLocaleDateString()}`
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const color = getPlanColor(plan.name);
            const isCurrentPlan = currentSubscription?.planName === plan.name;
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all hover:shadow-lg ${
                  plan.popular 
                    ? `border-${color}-500 ring-2 ring-${color}-200 dark:ring-${color}-800`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${isCurrentPlan ? 'opacity-75' : ''}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 bg-${color}-500 text-white px-4 py-1 rounded-full text-sm font-medium`}>
                    Most Popular
                  </div>
                )}

                {/* Recommended Badge */}
                {plan.recommended && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white p-2 rounded-full">
                    <Star className="w-4 h-4" />
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                      {getPlanIcon(plan.name)}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                      ${plan.price}
                      <span className="text-lg font-normal text-gray-600 dark:text-gray-300">
                        /{plan.billingCycle.toLowerCase().slice(0, -2)}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`text-${color}-500 mt-0.5`}>
                          {getFeatureIcon(feature)}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Plan Limits */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {plan.maxInstruments === -1 ? '∞' : plan.maxInstruments}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Instruments</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {plan.maxAlerts === -1 ? '∞' : plan.maxAlerts}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Alerts</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {plan.realTimeData ? 'Yes' : 'No'}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">Real-time</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {plan.apiRateLimit.toLocaleString()}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">API calls</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={isCurrentPlan}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : plan.price === 0
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : `bg-${color}-600 hover:bg-${color}-700 text-white`
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.price === 0 ? 'Get Started' : 'Upgrade Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Contact */}
        <div className="mt-12 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <Building className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Need a Custom Solution?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              For large organizations, hedge funds, or custom requirements, we offer tailored solutions
              with dedicated support, custom integrations, and enterprise-grade security.
            </p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                {getPlanIcon(selectedPlan.name)}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Upgrade to {selectedPlan.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                ${selectedPlan.price}/{selectedPlan.billingCycle.toLowerCase().slice(0, -2)}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Payment Method
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  **** **** **** 4242 (Visa)
                </p>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Billing Cycle
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedPlan.billingCycle} billing starting today
                </p>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpgrade}
                className={`flex-1 py-2 px-4 bg-${getPlanColor(selectedPlan.name)}-600 hover:bg-${getPlanColor(selectedPlan.name)}-700 text-white rounded-lg transition-colors`}
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}