import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, AlertCircle, RefreshCw, Users, Database } from 'lucide-react';

export function CentralizedDataInfo() {
  const [dataServiceStatus, setDataServiceStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDataServiceStatus();
    const interval = setInterval(fetchDataServiceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDataServiceStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch data service status');
      }
      
      const data = await response.json();
      setDataServiceStatus(data.centralized_data_service);
    } catch (error) {
      setError('Failed to fetch data service status');
      console.error('Error fetching data service status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !dataServiceStatus) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !dataServiceStatus) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Centralized Data Service Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error || 'Unable to fetch data service status'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-blue-800 dark:text-blue-200">
              Centralized Data Feed Status
            </h3>
            {dataServiceStatus.isRunning ? (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                Active
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded-full">
                Inactive
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Provider: {dataServiceStatus.activeProvider || 'None'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Subscribers: {dataServiceStatus.subscriberCount}
              </span>
            </div>
          </div>
          
          <div className="mt-3 flex items-center space-x-2">
            {dataServiceStatus.isAngelOneActive ? (
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            )}
            <span className={`text-sm ${
              dataServiceStatus.isAngelOneActive 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              Angel One API {dataServiceStatus.isAngelOneActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
            The centralized data feed provides real-time market data to all users through a single connection.
          </p>
        </div>
      </div>
    </div>
  );
}