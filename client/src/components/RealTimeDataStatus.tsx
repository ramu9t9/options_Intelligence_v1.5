import React from 'react';
import { Wifi, WifiOff, Activity, AlertCircle, CheckCircle, Clock, Zap, RefreshCw } from 'lucide-react';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { formatDistanceToNow } from 'date-fns';
import { CentralizedDataInfo } from './CentralizedDataInfo';

export function RealTimeDataStatus() {
  const {
    isConnected,
    activeProvider,
    subscribedSymbols,
    error,
    lastUpdate,
    startService,
    stopService,
    retryConnection,
    isInitializing
  } = useRealTimeData({ autoStart: true });

  const getStatusColor = () => {
    if (error) return 'text-red-600 dark:text-red-400';
    if (isConnected) return 'text-green-600 dark:text-green-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getStatusIcon = () => {
    if (isInitializing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (error) return <AlertCircle className="w-4 h-4" />;
    if (isConnected) return <CheckCircle className="w-4 h-4" />;
    return <Activity className="w-4 h-4 animate-pulse" />;
  };

  const getStatusText = () => {
    if (isInitializing) return 'Initializing...';
    if (error) return 'Connection Error';
    if (isConnected && activeProvider) return `Connected via ${activeProvider}`;
    if (activeProvider) return `Connecting to ${activeProvider}...`;
    return 'Disconnected';
  };

  const getStatusBadgeColor = () => {
    if (error) return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
    if (isConnected) return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
  };

  return (
    <div className="space-y-4">
      {/* Centralized Data Feed Info */}
      <CentralizedDataInfo />
      
      {/* WebSocket Connection Status */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              isConnected 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : error
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Real-Time Data Feed
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
                {activeProvider && (
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                    {activeProvider}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {subscribedSymbols.length} Active
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {isConnected ? 'Live Updates' : 'No Data'}
            </div>
          </div>
        </div>

        {/* Enhanced Status Information */}
        <div className={`mt-3 p-3 border rounded-md ${getStatusBadgeColor()}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className={`w-4 h-4 ${getStatusColor()}`} />
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {isConnected ? 'Data Streaming Active' : error ? 'Service Unavailable' : 'Connecting...'}
              </span>
            </div>
            
            {lastUpdate && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Last: {formatDistanceToNow(new Date(lastUpdate.timestamp), { addSuffix: true })}
              </div>
            )}
          </div>

          {/* Provider Performance Info */}
          {isConnected && activeProvider && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-gray-700 dark:text-gray-300">Provider</div>
                <div className={getStatusColor()}>{activeProvider}</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700 dark:text-gray-300">Symbols</div>
                <div className={getStatusColor()}>{subscribedSymbols.length}</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-700 dark:text-gray-300">Status</div>
                <div className="text-green-600 dark:text-green-400">Live</div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-300">
                {error}
              </span>
            </div>
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              The system will automatically try fallback providers or you can retry manually.
            </div>
          </div>
        )}

        {/* Last Update Info */}
        {lastUpdate && !error && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Latest: {lastUpdate.symbol} @ ₹{lastUpdate.price.toFixed(2)}
                </span>
                {lastUpdate.change !== 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    lastUpdate.change > 0 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {lastUpdate.change > 0 ? '+' : ''}{lastUpdate.change.toFixed(2)} ({lastUpdate.changePercent.toFixed(2)}%)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(lastUpdate.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 flex space-x-2">
          {!isConnected ? (
            <button
              onClick={startService}
              disabled={isInitializing}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isInitializing ? 'Starting...' : 'Start Data Feed'}
            </button>
          ) : (
            <>
              <button
                onClick={retryConnection}
                disabled={isInitializing}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${isInitializing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={stopService}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Stop Feed
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}