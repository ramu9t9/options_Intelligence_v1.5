import { useQuery } from '@tanstack/react-query';
import { Cpu, MemoryStick, Database, Activity, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function SystemMetrics() {
  // Mock data for development - replace with real API calls when endpoints are ready
  const metrics = {
    system: {
      cpuUsage: 45,
      memoryUsage: 68,
      diskUsage: 32,
      uptime: '99.9%'
    },
    database: {
      connections: 25,
      queriesPerSecond: 150
    },
    performance: {
      responseTime: 120,
      throughput: 1250,
      dataProviders: [
        { name: 'Angel One', status: 'active', responseTime: 89 },
        { name: 'NSE', status: 'standby', responseTime: 0 },
        { name: 'Yahoo Finance', status: 'standby', responseTime: 0 }
      ]
    }
  };

  const healthData = {
    status: 'healthy',
    uptime: '99.9%'
  };

  const getHealthStatus = (percentage: number) => {
    if (percentage >= 90) return { color: 'text-green-400', label: 'Excellent' };
    if (percentage >= 70) return { color: 'text-yellow-400', label: 'Good' };
    if (percentage >= 50) return { color: 'text-orange-400', label: 'Warning' };
    return { color: 'text-red-400', label: 'Critical' };
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center">
        <Activity className="h-5 w-5 mr-2 text-blue-400" />
        System Performance Metrics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-blue-400" />
              <h4 className="text-sm font-medium">CPU Usage</h4>
            </div>
            <Badge className={`text-xs ${getHealthStatus(100 - (metrics?.system?.cpuUsage || 0)).color}`}>
              {getHealthStatus(100 - (metrics?.system?.cpuUsage || 0)).label}
            </Badge>
          </div>
          <div className="text-2xl font-bold mb-1">
            {metrics?.system?.cpuUsage || 0}%
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics?.system?.cpuUsage || 0}%` }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <MemoryStick className="h-5 w-5 text-purple-400" />
              <h4 className="text-sm font-medium">Memory</h4>
            </div>
            <Badge className={`text-xs ${getHealthStatus(100 - (metrics?.system?.memoryUsage || 0)).color}`}>
              {getHealthStatus(100 - (metrics?.system?.memoryUsage || 0)).label}
            </Badge>
          </div>
          <div className="text-2xl font-bold mb-1">
            {metrics?.system?.memoryUsage || 0}%
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics?.system?.memoryUsage || 0}%` }}
            />
          </div>
        </div>

        {/* Database Performance */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-green-400" />
              <h4 className="text-sm font-medium">Database</h4>
            </div>
            <Badge className="bg-green-600/70 text-white text-xs">
              {healthData?.database?.status || 'CONNECTED'}
            </Badge>
          </div>
          <div className="text-2xl font-bold mb-1">
            {healthData?.database?.responseTime || 25}ms
          </div>
          <p className="text-xs text-gray-400">
            Avg response time
          </p>
        </div>

        {/* System Uptime */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-400" />
              <h4 className="text-sm font-medium">Uptime</h4>
            </div>
            <Badge className="bg-green-600/70 text-white text-xs">
              99.9%
            </Badge>
          </div>
          <div className="text-2xl font-bold mb-1">
            {metrics?.system?.uptime || '24h 15m'}
          </div>
          <p className="text-xs text-gray-400">
            Current session
          </p>
        </div>
      </div>

      {/* Performance Overview Chart */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
            Performance Overview
          </h4>
          <Badge className="bg-blue-600/70 text-white text-xs">
            Last 24 Hours
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {metrics?.performance?.avgResponseTime || 145}ms
            </div>
            <div className="text-xs text-gray-400">Avg Response</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              {100 - (metrics?.system?.errorRate || 0.5)}%
            </div>
            <div className="text-xs text-gray-400">Success Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {metrics?.system?.apiCalls?.toLocaleString() || '1,247'}
            </div>
            <div className="text-xs text-gray-400">API Calls</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {metrics?.performance?.centralizedDataEfficiency || 85}%
            </div>
            <div className="text-xs text-gray-400">Data Efficiency</div>
          </div>
        </div>
      </div>

      {/* Data Provider Status */}
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white shadow-sm">
        <h4 className="text-lg font-semibold mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-400" />
          Data Provider Status
        </h4>
        
        <div className="space-y-3">
          {(metrics?.performance?.dataProviderStatus || [
            { name: 'Angel One', status: 'active', lastUpdate: '2025-01-01 12:23:45' },
            { name: 'Dhan', status: 'inactive', lastUpdate: '2025-01-01 10:15:20' },
            { name: 'NSE (Fallback)', status: 'active', lastUpdate: '2025-01-01 12:23:30' }
          ]).map((provider, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  provider.status === 'active' ? 'bg-green-400' : 
                  provider.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                }`} />
                <span className="font-medium">{provider.name}</span>
              </div>
              <div className="text-right">
                <Badge className={`text-xs ${
                  provider.status === 'active' ? 'bg-green-600/70' :
                  provider.status === 'error' ? 'bg-red-600/70' : 'bg-gray-600/70'
                } text-white`}>
                  {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                </Badge>
                <div className="text-xs text-gray-400 mt-1">
                  Last: {provider.lastUpdate}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}