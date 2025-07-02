import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Settings,
  Database,
  Cpu,
  Network,
  Shield,
  BarChart3,
  Eye,
  CheckCircle,
  Wifi,
  WifiOff,
  Building,
  Power
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CredentialStatusPanel } from '@/components/CredentialStatusPanel';
import { UserActivityLog } from '@/components/UserActivityLog';
import { SystemMetrics } from '@/components/SystemMetrics';
import { ExportData } from '@/components/ExportData';
import toast from 'react-hot-toast';

interface AdminMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
    byPlan: Record<string, number>;
  };
  revenue: {
    monthly: number;
    daily: number;
    growth: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    apiCalls: number;
    errorRate: number;
    uptime: string;
  };
  performance: {
    avgResponseTime: number;
    dataProviderStatus: Array<{
      name: string;
      status: 'active' | 'inactive' | 'error';
      lastUpdate: string;
    }>;
    centralizedDataEfficiency: number;
  };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Broker management state
  const [selectedBroker, setSelectedBroker] = useState('angel-one');
  const [credentials, setCredentials] = useState({
    clientId: '',
    apiKey: '',
    apiSecret: '',
    pin: '',
    totp: ''
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
    userInfo?: any;
  }>({ status: null, message: '' });

  // Mock data for development - replace with real API calls when endpoints are ready
  const metrics: AdminMetrics = {
    users: {
      total: 1247,
      active: 892,
      newToday: 23,
      byPlan: {
        free: 589,
        pro: 412,
        vip: 186,
        institutional: 60
      }
    },
    revenue: {
      monthly: 127500,
      daily: 4250,
      growth: 12.5
    },
    system: {
      cpuUsage: 45,
      memoryUsage: 68,
      apiCalls: 15678,
      uptime: '99.9%',
      errorRate: 0.02
    },
    alerts: {
      total: 45,
      active: 12,
      resolved: 33
    }
  };

  const centralData = {
    performance: {
      responseTime: 120,
      throughput: 1250,
      errorRate: 0.02
    }
  };

  const isLoading = false;

  // Load existing broker credentials
  useEffect(() => {
    const loadBrokerCredentials = async () => {
      try {
        const response = await fetch(`/api/admin/broker-configs/${selectedBroker}`);
        if (response.ok) {
          const config = await response.json();
          if (config && config.credentials) {
            setCredentials({
              clientId: config.credentials.clientId || '',
              apiKey: config.credentials.apiKey || '',
              apiSecret: '***', // Don't show the actual secret for security
              pin: '***', // Don't show the actual PIN for security
              totp: config.credentials.totpKey || ''
            });
          }
        }
      } catch (error) {
        console.error('Failed to load broker credentials:', error);
      }
    };

    loadBrokerCredentials();
  }, [selectedBroker]);

  // Broker testing functionality
  const handleTestConnection = async () => {
    if (!credentials.clientId || !credentials.apiKey || !credentials.apiSecret || !credentials.pin) {
      setConnectionResult({
        status: 'error',
        message: 'Please fill in all required fields before testing connection.'
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionResult({ status: null, message: '' });

    try {
      const response = await fetch('/api/admin/test-broker-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broker: selectedBroker,
          credentials: credentials
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setConnectionResult({
          status: 'success',
          message: result.message,
          userInfo: result.userInfo
        });
        toast.success('Connection test successful!');
      } else {
        setConnectionResult({
          status: 'error',
          message: result.message || 'Connection test failed'
        });
        toast.error('Connection test failed');
      }
    } catch (error) {
      setConnectionResult({
        status: 'error',
        message: 'Network error: Unable to test connection'
      });
      toast.error('Network error occurred');
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-gray-300 mt-1">
              System monitoring, user management, and broker configuration
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
            <Activity className="h-3 w-3 mr-1" />
            System Online
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Total Users</h3>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{metrics?.users?.total || 0}</div>
              <p className="text-xs text-green-400">
                +{metrics?.users?.newToday || 0} today
              </p>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Monthly Revenue</h3>
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                ${metrics?.revenue?.monthly?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-green-400">
                +{metrics?.revenue?.growth || 0}% from last month
              </p>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">API Calls Today</h3>
              <Activity className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {metrics?.system?.apiCalls?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-white/60">
                Centralized efficiency: {centralData?.efficiency || 80}%
              </p>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">System Health</h3>
              <Shield className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {100 - (metrics?.system?.errorRate || 0)}%
              </div>
              <p className="text-xs text-white/60">
                Uptime: {metrics?.system?.uptime || '99.9%'}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-black/20 backdrop-blur-sm border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="data-providers">Data Providers</TabsTrigger>
            <TabsTrigger value="brokers">Broker Management</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="activity-logs">Activity Logs</TabsTrigger>
            <TabsTrigger value="system-metrics">System Metrics</TabsTrigger>
            <TabsTrigger value="export-data">Export Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-blue-400" />
                    System Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CPU Usage</span>
                      <span>{metrics?.system?.cpuUsage || 0}%</span>
                    </div>
                    <Progress value={metrics?.system?.cpuUsage || 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage</span>
                      <span>{metrics?.system?.memoryUsage || 0}%</span>
                    </div>
                    <Progress value={metrics?.system?.memoryUsage || 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Response Time</span>
                      <span>{metrics?.performance?.avgResponseTime || 0}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-green-400" />
                    Centralized Data Broadcasting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">
                      {centralData?.efficiency || 80}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Backend Load Reduction
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-blue-400">
                        {centralData?.connectedClients || 12}
                      </div>
                      <p className="text-xs text-muted-foreground">Connected Clients</p>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-purple-400">
                        {centralData?.broadcastsPerMinute || 20}
                      </div>
                      <p className="text-xs text-muted-foreground">Broadcasts/min</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-full justify-center bg-green-500/10 text-green-400">
                    In-Memory Centralized System Active
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="card-modern">
              <CardHeader>
                <CardTitle>Subscription Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(metrics?.users?.byPlan || {}).map(([plan, count]) => (
                    <div key={plan} className="text-center p-4 glass-effect rounded-lg">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">{plan}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-yellow-400" />
                  ChatGPT Knowledge Integration Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Trading Strategies Generated</span>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400">
                      {centralData?.strategiesGenerated || 156} today
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">OI Analysis Accuracy</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-400">
                      94.2%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pattern Detection Speed</span>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-400">
                      &lt;100ms
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-6">
            <CredentialStatusPanel />
          </TabsContent>

          <TabsContent value="data-providers" className="space-y-6">
            <Card className="card-modern">
              <CardHeader>
                <CardTitle>Data Provider Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.performance?.dataProviderStatus?.map((provider) => (
                    <div key={provider.name} className="flex items-center justify-between p-3 glass-effect rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          provider.status === 'active' ? 'bg-green-500' :
                          provider.status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-medium">{provider.name}</span>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={
                          provider.status === 'active' ? 'text-green-400 border-green-500/20' :
                          provider.status === 'inactive' ? 'text-gray-400 border-gray-500/20' :
                          'text-red-400 border-red-500/20'
                        }>
                          {provider.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {provider.lastUpdate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brokers" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Broker Configuration */}
              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-400" />
                    Broker Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="broker">Select Broker</Label>
                    <select 
                      id="broker"
                      value={selectedBroker}
                      onChange={(e) => setSelectedBroker(e.target.value)}
                      className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-white"
                    >
                      <option value="angel-one">Angel One</option>
                      <option value="dhan">Dhan</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client ID</Label>
                      <Input
                        id="clientId"
                        value={credentials.clientId}
                        onChange={(e) => setCredentials(prev => ({...prev, clientId: e.target.value}))}
                        placeholder="Enter client ID"
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        value={credentials.apiKey}
                        onChange={(e) => setCredentials(prev => ({...prev, apiKey: e.target.value}))}
                        placeholder="Enter API key"
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiSecret">API Secret</Label>
                      <Input
                        id="apiSecret"
                        type="password"
                        value={credentials.apiSecret}
                        onChange={(e) => setCredentials(prev => ({...prev, apiSecret: e.target.value}))}
                        placeholder="Enter API secret"
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pin">PIN</Label>
                      <Input
                        id="pin"
                        type="password"
                        value={credentials.pin}
                        onChange={(e) => setCredentials(prev => ({...prev, pin: e.target.value}))}
                        placeholder="Enter PIN"
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totp">TOTP Secret (Optional)</Label>
                      <Input
                        id="totp"
                        value={credentials.totp}
                        onChange={(e) => setCredentials(prev => ({...prev, totp: e.target.value}))}
                        placeholder="Enter TOTP secret"
                        className="bg-black/20 border-white/10 text-white"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isTestingConnection ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Testing Connection...
                      </div>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Connection Status */}
              <Card className="bg-black/20 backdrop-blur-sm border border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Power className="h-5 w-5 text-green-400" />
                    Connection Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {connectionResult.status && (
                    <div className={`p-4 rounded-md ${
                      connectionResult.status === 'success' 
                        ? 'bg-green-500/10 border border-green-500/20' 
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                        {connectionResult.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        )}
                        <span className={connectionResult.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                          {connectionResult.status === 'success' ? 'Connection Successful' : 'Connection Failed'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-2">
                        {connectionResult.message}
                      </p>
                      {connectionResult.userInfo && (
                        <div className="mt-3 p-3 bg-black/20 rounded border border-white/10">
                          <p className="text-sm font-medium text-white">User Profile:</p>
                          <p className="text-sm text-gray-300">{connectionResult.userInfo.clientname || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Angel One Status</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                        <Wifi className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Dhan Status</span>
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Standby
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Data Feed</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                        <Activity className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full border-white/20 text-gray-300 hover:bg-white/10">
                        Restart Data Feed
                      </Button>
                      <Button variant="outline" size="sm" className="w-full border-white/20 text-gray-300 hover:bg-white/10">
                        Switch to Backup Provider
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity-logs" className="space-y-6">
            <UserActivityLog />
          </TabsContent>

          <TabsContent value="system-metrics" className="space-y-6">
            <SystemMetrics />
          </TabsContent>

          <TabsContent value="export-data" className="space-y-6">
            <ExportData />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}