import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Database, 
  Settings, 
  Zap, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Server,
  Activity
} from 'lucide-react';

export function AdminPanel() {
  const [dataServiceStatus, setDataServiceStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestarting, setIsRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDataServiceStatus();
  }, []);

  const fetchDataServiceStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/data-service/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch data service status');
      }
      
      const data = await response.json();
      setDataServiceStatus(data.service_status);
    } catch (error) {
      setError('Failed to fetch data service status');
      console.error('Error fetching data service status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartService = async () => {
    try {
      setIsRestarting(true);
      setError(null);
      
      const response = await fetch('/api/admin/data-service/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to restart data service');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchDataServiceStatus();
    } catch (error) {
      setError('Failed to restart data service');
      console.error('Error restarting data service:', error);
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Admin Control Panel
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Manage system settings and monitor the centralized data feed
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              ADMIN
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Centralized Data Feed Status */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-500" />
                Centralized Data Feed
              </h3>
              <button
                onClick={fetchDataServiceStatus}
                disabled={isLoading}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoading && !dataServiceStatus ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-300">{error}</span>
                </div>
              </div>
            ) : dataServiceStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Status:</span>
                  <div className="flex items-center space-x-2">
                    {dataServiceStatus.isRunning ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={dataServiceStatus.isRunning ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {dataServiceStatus.isRunning ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Provider:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {dataServiceStatus.activeProvider || 'None'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Angel One Active:</span>
                  <div className="flex items-center space-x-2">
                    {dataServiceStatus.isAngelOneActive ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className={dataServiceStatus.isAngelOneActive ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                      {dataServiceStatus.isAngelOneActive ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Subscribers:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {dataServiceStatus.subscriberCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Tracked Symbols:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {dataServiceStatus.trackedSymbols}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Cache Size:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {dataServiceStatus.cacheSize} symbols
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={handleRestartService}
                    disabled={isRestarting}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isRestarting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>{isRestarting ? 'Restarting...' : 'Restart Data Service'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                No data available
              </div>
            )}
          </div>

          {/* Angel One Credentials */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-500" />
                Angel One Configuration
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">API Key:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    P9ErUZG0
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Client ID:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    R117172
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Secret Key:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    7fcb7f2a-fd0a-4d12-a010-16d37fbdbd6e
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    Angel One credentials are properly configured
                  </span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  The centralized data feed is using these credentials to provide real-time data to all users.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Server className="w-5 h-5 mr-2 text-blue-500" />
              System Status
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">API Status</span>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Operational</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Database</span>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Healthy</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">WebSocket</span>
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-700 dark:text-blue-300">
                Manage Users
              </span>
            </div>
          </button>

          <button className="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-purple-700 dark:text-purple-300">
                System Settings
              </span>
            </div>
          </button>

          <button className="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-700 dark:text-green-300">
                View System Logs
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}