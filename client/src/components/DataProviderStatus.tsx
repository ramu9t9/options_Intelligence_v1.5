import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DataProviderStatus {
  name: string;
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
  lastUpdate: string;
  errorMessage?: string;
  isPrimary: boolean;
}

interface SystemStatus {
  primaryProvider: DataProviderStatus;
  fallbackProviders: DataProviderStatus[];
  activeProvider: string;
  totalSymbolsTracked: number;
  lastDataUpdate: string;
  systemStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
}

export function DataProviderStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/data-provider/status');
      const result = await response.json();
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch data provider status:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeProviders = async () => {
    setInitializing(true);
    try {
      const response = await fetch('/api/data-provider/initialize', {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to initialize providers:', error);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CONNECTING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      CONNECTED: 'default',
      CONNECTING: 'secondary',
      ERROR: 'destructive',
      DISCONNECTED: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getSystemStatusColor = (systemStatus: string) => {
    switch (systemStatus) {
      case 'OPERATIONAL':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'DEGRADED':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'DOWN':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading provider status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">Unable to load provider status</p>
            <Button onClick={initializeProviders} disabled={initializing}>
              {initializing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Initialize Providers
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Data Provider Status</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchStatus}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Status Overview */}
        <div className={`p-3 rounded-lg border ${getSystemStatusColor(status.systemStatus)}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">System Status</span>
            <Badge variant={status.systemStatus === 'OPERATIONAL' ? 'default' : 'destructive'}>
              {status.systemStatus}
            </Badge>
          </div>
          <div className="mt-2 text-sm">
            <p>Active Provider: {status.activeProvider}</p>
            <p>Symbols Tracked: {status.totalSymbolsTracked}</p>
            <p>Last Update: {new Date(status.lastDataUpdate).toLocaleString()}</p>
          </div>
        </div>

        {/* Primary Provider */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Primary Provider</h4>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(status.primaryProvider.status)}
              <div>
                <p className="font-medium">{status.primaryProvider.name}</p>
                <p className="text-sm text-gray-500">
                  Last: {new Date(status.primaryProvider.lastUpdate).toLocaleString()}
                </p>
                {status.primaryProvider.errorMessage && (
                  <p className="text-sm text-red-500">{status.primaryProvider.errorMessage}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">PRIMARY</Badge>
              {getStatusBadge(status.primaryProvider.status)}
            </div>
          </div>
        </div>

        {/* Fallback Providers */}
        {status.fallbackProviders.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Fallback Providers</h4>
            {status.fallbackProviders.map((provider, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(provider.status)}
                  <div>
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-gray-500">
                      Last: {new Date(provider.lastUpdate).toLocaleString()}
                    </p>
                    {provider.errorMessage && (
                      <p className="text-sm text-red-500">{provider.errorMessage}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">FALLBACK</Badge>
                  {getStatusBadge(provider.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Initialize Button */}
        {(status.systemStatus === 'DOWN' || status.primaryProvider.status === 'DISCONNECTED') && (
          <div className="pt-2">
            <Button 
              onClick={initializeProviders} 
              disabled={initializing}
              className="w-full"
            >
              {initializing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing Providers...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-initialize Providers
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}