import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Server,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  UserCheck,
  CreditCard,
  Bell,
  Shield,
  Database,
  Wifi,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react';

interface AdminStats {
  users: {
    total: number;
    active: number;
    trial: number;
    premium: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    totalRevenue: number;
    conversionRate: number;
  };
  system: {
    uptime: number;
    apiLatency: number;
    errorRate: number;
    activeConnections: number;
  };
  subscriptions: {
    free: number;
    pro: number;
    vip: number;
    institutional: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'signup' | 'upgrade' | 'downgrade' | 'cancellation' | 'error';
  user: string;
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for demonstration
      const mockStats: AdminStats = {
        users: {
          total: 2847,
          active: 1923,
          trial: 456,
          premium: 1467
        },
        revenue: {
          mrr: 89750,
          arr: 1077000,
          totalRevenue: 234567,
          conversionRate: 23.4
        },
        system: {
          uptime: 99.97,
          apiLatency: 87,
          errorRate: 0.03,
          activeConnections: 1923
        },
        subscriptions: {
          free: 924,
          pro: 1456,
          vip: 389,
          institutional: 78
        }
      };

      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'upgrade',
          user: 'john.doe@example.com',
          description: 'Upgraded from Pro to VIP plan',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          severity: 'low'
        },
        {
          id: '2',
          type: 'signup',
          user: 'jane.smith@example.com',
          description: 'New user registration with Pro trial',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          severity: 'low'
        },
        {
          id: '3',
          type: 'error',
          user: 'system',
          description: 'Angel One API rate limit exceeded',
          timestamp: new Date(Date.now() - 23 * 60 * 1000),
          severity: 'medium'
        },
        {
          id: '4',
          type: 'cancellation',
          user: 'bob.wilson@example.com',
          description: 'Cancelled VIP subscription',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          severity: 'medium'
        },
        {
          id: '5',
          type: 'upgrade',
          user: 'alice.brown@example.com',
          description: 'Upgraded from Free to Pro plan',
          timestamp: new Date(Date.now() - 67 * 60 * 1000),
          severity: 'low'
        }
      ];

      setStats(mockStats);
      setRecentActivity(mockActivity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'signup':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'upgrade':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'downgrade':
        return <TrendingUp className="w-4 h-4 text-yellow-500 rotate-180" />;
      case 'cancellation':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Options Intelligence Platform Management
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats ? formatNumber(stats.users.total) : '---'}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  +12.5% from last month
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Monthly Recurring Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Recurring Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats ? formatCurrency(stats.revenue.mrr) : '---'}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  +18.2% from last month
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* System Uptime */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">System Uptime</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats ? `${stats.system.uptime}%` : '---'}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  99.9% SLA target
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Server className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Active Connections */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Connections</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats ? formatNumber(stats.system.activeConnections) : '---'}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Real-time users
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Wifi className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subscription Distribution */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Subscription Distribution
                </h3>
                <BarChart3 className="w-5 h-5 text-gray-500" />
              </div>
              
              {stats && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Free</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(stats.subscriptions.free)}
                      </span>
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gray-400 h-2 rounded-full"
                          style={{ width: `${(stats.subscriptions.free / stats.users.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pro</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(stats.subscriptions.pro)}
                      </span>
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(stats.subscriptions.pro / stats.users.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">VIP</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(stats.subscriptions.vip)}
                      </span>
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(stats.subscriptions.vip / stats.users.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Institutional</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatNumber(stats.subscriptions.institutional)}
                      </span>
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(stats.subscriptions.institutional / stats.users.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* System Health */}
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  System Health
                </h3>
                <Activity className="w-5 h-5 text-gray-500" />
              </div>
              
              {stats && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">API Latency</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {stats.system.apiLatency}ms
                      </span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Error Rate</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {stats.system.errorRate}%
                      </span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Healthy
                      </span>
                      <Database className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Data Feed</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Connected
                      </span>
                      <Zap className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">Manage Users</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">Billing & Payments</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">System Settings</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-medium">Send Notifications</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
                <button className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  <Eye className="w-4 h-4" />
                  <span>View All</span>
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-4 border-l-4 ${getSeverityColor(activity.severity)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.user}
                        </p>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {activity.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}