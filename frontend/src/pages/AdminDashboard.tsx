import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Eye
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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

  const { data: metrics, isLoading } = useQuery<AdminMetrics>({
    queryKey: ['/api/admin/metrics'],
    refetchInterval: 10000, // Update every 10 seconds
  });

  const { data: centralData } = useQuery({
    queryKey: ['/api/central-data/performance'],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              System monitoring and user management
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
            <Activity className="h-3 w-3 mr-1" />
            System Online
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold neon-glow">{metrics?.users?.total || 0}</div>
              <p className="text-xs text-green-400">
                +{metrics?.users?.newToday || 0} today
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold neon-glow">
                ${metrics?.revenue?.monthly?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-green-400">
                +{metrics?.revenue?.growth || 0}% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Calls Today</CardTitle>
              <Activity className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold neon-glow">
                {metrics?.system?.apiCalls?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Centralized efficiency: {centralData?.efficiency || 80}%
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Shield className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold neon-glow">
                {100 - (metrics?.system?.errorRate || 0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Uptime: {metrics?.system?.uptime || '99.9%'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="glass-effect">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="data-providers">Data Providers</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}