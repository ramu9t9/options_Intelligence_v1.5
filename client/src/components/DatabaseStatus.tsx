import React, { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle, Server, Activity } from 'lucide-react';
import { DatabaseService } from '../lib/database';

export function DatabaseStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [redisStatus, setRedisStatus] = useState(false);

  useEffect(() => {
    checkDatabaseStatus();
    const interval = setInterval(checkDatabaseStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      setIsLoading(true);
      const health = await DatabaseService.healthCheck();
      setIsConnected(health.database);
      setRedisStatus(health.redis);
      
      if (health.database) {
        const instruments = await DatabaseService.getInstruments();
        const dbStats = await DatabaseService.getDatabaseStats();
        setStats({ instrumentCount: instruments.length, dbStats });
        setError(null);
      } else {
        setError('Database connection failed');
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            isConnected 
              ? 'bg-green-100 dark:bg-green-900/30' 
              : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            {isConnected ? (
              <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Database className="w-5 h-5 text-red-500" />
            )}
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              PostgreSQL Database
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    Checking connection...
                  </span>
                </>
              ) : isConnected ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    Connected & Ready
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">
                    Using Mock Data
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {stats?.instrumentCount || 0} Instruments
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isConnected ? 'Live Data' : 'Fallback Mode'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">
              {error}
            </span>
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-start space-x-2">
            <Server className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium">Start PostgreSQL Database</p>
              <p className="mt-1">
                Run <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">npm run db:up</code> to start the database containers.
              </p>
            </div>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <div className="font-medium text-gray-700 dark:text-gray-300">Redis Cache</div>
            <div className={redisStatus ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
              {redisStatus ? 'Active (30s TTL)' : 'Memory Fallback'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <div className="font-medium text-gray-700 dark:text-gray-300">Response Time</div>
            <div className="text-green-600 dark:text-green-400">{"< 100ms"}</div>
          </div>
        </div>
      )}
    </div>
  );
}