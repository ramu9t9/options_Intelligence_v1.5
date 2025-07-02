/**
 * Credential Status Panel
 * Shows persistent broker credential status and allows refresh
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface CredentialStatus {
  broker: string;
  status: string;
  message: string;
}

interface PersistenceStatus {
  initialized: boolean;
  autoLoadActive: boolean;
}

export const CredentialStatusPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query credential status
  const { data: credentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ['/api/admin/credentials/status'],
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: false
  });

  // Query persistence service status
  const { data: persistenceData } = useQuery({
    queryKey: ['/api/admin/credentials/persistence-status'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false
  });

  // Refresh credentials mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/credentials/refresh', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/credentials/status'] });
      setTimeout(() => setIsRefreshing(false), 2000);
    },
    onError: () => {
      setIsRefreshing(false);
    }
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'disconnected':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'not-configured':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-400';
      case 'disconnected':
      case 'error':
        return 'text-red-400';
      case 'not-configured':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const credentials: CredentialStatus[] = credentialsData?.credentials || [];
  const persistence: PersistenceStatus = persistenceData?.status || { initialized: false, autoLoadActive: false };

  if (credentialsLoading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {persistence.autoLoadActive ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <h3 className="text-lg font-semibold text-white">Credential Status</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || refreshMutation.isPending}
          className={`p-2 rounded-lg transition-colors ${
            isRefreshing || refreshMutation.isPending
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          title="Refresh credentials"
        >
          <RefreshCw 
            className={`w-4 h-4 ${
              isRefreshing || refreshMutation.isPending ? 'animate-spin' : ''
            }`} 
          />
        </button>
      </div>

      {/* Persistence Service Status */}
      <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-600/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Persistence Service:</span>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${
              persistence.initialized ? 'text-green-400' : 'text-red-400'
            }`}>
              {persistence.initialized ? 'Active' : 'Inactive'}
            </span>
            {persistence.autoLoadActive && (
              <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                Auto-Load ON
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Credential Status List */}
      <div className="space-y-3">
        {credentials.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No broker credentials configured</p>
          </div>
        ) : (
          credentials.map((cred) => (
            <div
              key={cred.broker}
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-600/30"
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(cred.status)}
                <div>
                  <h4 className="text-sm font-medium text-white capitalize">
                    {cred.broker.replace('-', ' ')}
                  </h4>
                  <p className="text-xs text-gray-400">{cred.message}</p>
                </div>
              </div>
              <div className={`text-sm font-medium capitalize ${getStatusColor(cred.status)}`}>
                {cred.status}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Messages */}
      {refreshMutation.isError && (
        <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
          Failed to refresh credentials. Please try again.
        </div>
      )}

      {refreshMutation.isSuccess && !isRefreshing && (
        <div className="mt-3 p-2 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-sm">
          Credentials refreshed successfully!
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Status updates automatically every 10 seconds
      </div>
    </div>
  );
};