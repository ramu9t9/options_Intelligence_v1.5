import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, AlertTriangle, CheckCircle, WifiOff, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DataProvider {
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastResponse: number;
  errorCount: number;
  priority: number;
}

interface DataProviderStatus {
  currentProvider: string;
  providers: DataProvider[];
  fallbackEnabled: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export function DataProviderSwitcher() {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: providerStatus, isLoading } = useQuery<DataProviderStatus>({
    queryKey: ['/api/admin/data-providers/status'],
    refetchInterval: 5000,
    retry: 2
  });

  const switchProviderMutation = useMutation({
    mutationFn: async (providerName: string) => {
      const response = await fetch('/api/admin/switch-data-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sourceName: providerName })
      });
      if (!response.ok) throw new Error('Failed to switch provider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/data-providers/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/market-data'] });
    }
  });

  const testProviderMutation = useMutation({
    mutationFn: async (providerName: string) => {
      const response = await fetch('/api/admin/test-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ providerName })
      });
      if (!response.ok) throw new Error('Provider test failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/data-providers/status'] });
    }
  });

  useEffect(() => {
    if (providerStatus?.currentProvider && !selectedProvider) {
      setSelectedProvider(providerStatus.currentProvider);
    }
  }, [providerStatus?.currentProvider, selectedProvider]);

  const handleProviderSwitch = () => {
    if (selectedProvider && selectedProvider !== providerStatus?.currentProvider) {
      switchProviderMutation.mutate(selectedProvider);
    }
  };

  const handleTestProvider = (providerName: string) => {
    testProviderMutation.mutate(providerName);
  };

  const getStatusIcon = (status: DataProvider['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'inactive':
        return <WifiOff className="w-4 h-4 text-gray-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: DataProvider['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const getConnectionQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-orange-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Data Provider Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Data Provider Management
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Connection Quality:</span>
            <Badge 
              variant="outline" 
              className={getConnectionQualityColor(providerStatus?.connectionQuality || 'disconnected')}
            >
              {providerStatus?.connectionQuality?.toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Fallback:</span>
            <Badge variant={providerStatus?.fallbackEnabled ? 'default' : 'secondary'}>
              {providerStatus?.fallbackEnabled ? 'ENABLED' : 'DISABLED'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Switch Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Select Primary Provider
              </label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose data provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerStatus?.providers?.map((provider) => (
                    <SelectItem key={provider.name} value={provider.name}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(provider.status)}
                        <span>{provider.name}</span>
                        {provider.name === providerStatus.currentProvider && (
                          <Badge variant="outline" className="ml-2">CURRENT</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleProviderSwitch}
              disabled={
                !selectedProvider || 
                selectedProvider === providerStatus?.currentProvider ||
                switchProviderMutation.isPending
              }
              className="mt-6"
            >
              {switchProviderMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                'Switch Provider'
              )}
            </Button>
          </div>
        </div>

        {/* Provider Status Grid */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Provider Status</h4>
          <div className="grid gap-3">
            {providerStatus?.providers?.map((provider) => (
              <div
                key={provider.name}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(provider.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{provider.name}</span>
                      {provider.name === providerStatus.currentProvider && (
                        <Badge variant="default" className="text-xs">ACTIVE</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Response: {provider.lastResponse}ms</span>
                      <span>Errors: {provider.errorCount}</span>
                      <span>Priority: {provider.priority}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(provider.status)}>
                    {provider.status.toUpperCase()}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestProvider(provider.name)}
                    disabled={testProviderMutation.isPending}
                  >
                    {testProviderMutation.isPending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fallback Configuration */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Automatic Failover</h4>
          <p className="text-sm text-muted-foreground mb-3">
            When the primary provider fails, the system automatically switches to the next available provider based on priority rankings.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm">Fallback System Status:</span>
            <Badge variant={providerStatus?.fallbackEnabled ? 'default' : 'destructive'}>
              {providerStatus?.fallbackEnabled ? 'OPERATIONAL' : 'DISABLED'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}