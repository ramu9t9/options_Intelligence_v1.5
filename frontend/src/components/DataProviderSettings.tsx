import React, { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff, Activity, Zap } from 'lucide-react';
import { RealTimeDataService, DataServiceConfig } from '../services/RealTimeDataService';
import { useRealTimeData } from '../hooks/useRealTimeData';

interface DataProviderSettingsProps {
  onConfigChange?: (config: DataServiceConfig) => void;
}

export function DataProviderSettings({ onConfigChange }: DataProviderSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<DataServiceConfig>({
    primaryProvider: 'mock',
    fallbackProviders: ['yahoo', 'nse'],
    updateInterval: 5000,
    retryAttempts: 3,
    enableFallback: false
  });
  const [angelCredentials, setAngelCredentials] = useState({
    apiKey: '',
    clientId: '',
    clientSecret: ''
  });
  const [showCredentials, setShowCredentials] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    isConnected,
    activeProvider,
    subscribedSymbols,
    error,
    lastUpdate,
    startService,
    stopService,
    switchProvider,
    retryConnection
  } = useRealTimeData({ autoStart: true, config });

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem('marketDataConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error('Error loading saved config:', error);
      }
    }

    const savedCredentials = localStorage.getItem('angelCredentials');
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials);
        setAngelCredentials(parsed);
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    }
  }, []);

  const handleConfigChange = (updates: Partial<DataServiceConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // Save to localStorage
    localStorage.setItem('marketDataConfig', JSON.stringify(newConfig));
    
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  const handleCredentialsChange = (updates: Partial<typeof angelCredentials>) => {
    const newCredentials = { ...angelCredentials, ...updates };
    setAngelCredentials(newCredentials);
    
    // Save to localStorage (encrypted in production)
    localStorage.setItem('angelCredentials', JSON.stringify(newCredentials));

    // Update the main config with Angel One credentials
    const hasValidCredentials = newCredentials.apiKey && newCredentials.clientId && newCredentials.clientSecret;
    const configUpdate: Partial<DataServiceConfig> = hasValidCredentials 
      ? { angelOne: newCredentials }
      : { angelOne: undefined };
    
    handleConfigChange(configUpdate);
  };

  const handleStartService = async () => {
    setIsConnecting(true);
    try {
      await startService();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStopService = async () => {
    await stopService();
  };

  const handleSwitchProvider = async (providerName: 'angel' | 'nse' | 'yahoo' | 'mock') => {
    setIsConnecting(true);
    try {
      await switchProvider(providerName);
      handleConfigChange({ primaryProvider: providerName });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetryConnection = async () => {
    setIsConnecting(true);
    try {
      await retryConnection();
    } finally {
      setIsConnecting(false);
    }
  };

  const getProviderStatus = (providerName: string) => {
    if (activeProvider === providerName && isConnected) {
      return 'connected';
    } else if (activeProvider === providerName && !isConnected) {
      return 'connecting';
    }
    return 'disconnected';
  };

  const getProviderIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getProviderDescription = (provider: string) => {
    switch (provider) {
      case 'angel':
        return 'Real-time WebSocket • Premium • Requires Credentials';
      case 'nse':
        return 'Official NSE API • Free • Rate Limited';
      case 'yahoo':
        return 'Yahoo Finance • Free • Basic Data';
      case 'mock':
        return 'Mock Data • Development • Always Available';
      default:
        return 'Unknown Provider';
    }
  };

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        aria-label="Data Provider Settings"
      >
        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        
        {/* Status Indicator */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'
        }`}></div>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Data Provider Settings
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Service Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Status
              </h4>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {isConnected ? 'Connected' : error ? 'Error' : 'Disconnected'}
                  </span>
                  {activeProvider && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                      {activeProvider}
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {!isConnected ? (
                    <button
                      onClick={handleStartService}
                      disabled={isConnecting}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isConnecting ? 'Starting...' : 'Start'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleRetryConnection}
                        disabled={isConnecting}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={handleStopService}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </span>
                  </div>
                </div>
              )}

              {/* Last Update Info */}
              {lastUpdate && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        {lastUpdate.symbol}: ₹{lastUpdate.price.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {new Date(lastUpdate.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Data Providers */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Providers
              </h4>
              <div className="space-y-2">
                {/* Mock Provider */}
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getProviderIcon(getProviderStatus('Mock Provider'))}
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        Mock Provider
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getProviderDescription('mock')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwitchProvider('mock')}
                    disabled={isConnecting}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {config.primaryProvider === 'mock' ? 'Active' : 'Switch'}
                  </button>
                </div>

                {/* NSE Provider */}
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getProviderIcon(getProviderStatus('NSE'))}
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        NSE Official
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getProviderDescription('nse')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwitchProvider('nse')}
                    disabled={isConnecting}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {config.primaryProvider === 'nse' ? 'Active' : 'Switch'}
                  </button>
                </div>

                {/* Yahoo Finance Provider */}
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getProviderIcon(getProviderStatus('Yahoo Finance'))}
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        Yahoo Finance
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getProviderDescription('yahoo')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwitchProvider('yahoo')}
                    disabled={isConnecting}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {config.primaryProvider === 'yahoo' ? 'Active' : 'Switch'}
                  </button>
                </div>

                {/* Angel One Provider */}
                <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getProviderIcon(getProviderStatus('Angel One'))}
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        Angel One
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getProviderDescription('angel')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwitchProvider('angel')}
                    disabled={!angelCredentials.apiKey || isConnecting}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {config.primaryProvider === 'angel' ? 'Active' : 'Switch'}
                  </button>
                </div>
              </div>
            </div>

            {/* Angel One Credentials */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Angel One Credentials
                </h4>
                <button
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {showCredentials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="space-y-2">
                <input
                  type={showCredentials ? 'text' : 'password'}
                  placeholder="API Key"
                  value={angelCredentials.apiKey}
                  onChange={(e) => handleCredentialsChange({ apiKey: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type={showCredentials ? 'text' : 'password'}
                  placeholder="Client ID"
                  value={angelCredentials.clientId}
                  onChange={(e) => handleCredentialsChange({ clientId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type={showCredentials ? 'text' : 'password'}
                  placeholder="Client Secret"
                  value={angelCredentials.clientSecret}
                  onChange={(e) => handleCredentialsChange({ clientSecret: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
                    <p className="font-medium">Angel One Setup:</p>
                    <p>1. Create account at angelone.in</p>
                    <p>2. Generate API credentials from developer portal</p>
                    <p>3. Enable API trading permissions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Configuration
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Update Interval
                  </label>
                  <select
                    value={config.updateInterval / 1000}
                    onChange={(e) => handleConfigChange({ updateInterval: parseInt(e.target.value) * 1000 })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={1}>1 second</option>
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableFallback"
                    checked={config.enableFallback}
                    onChange={(e) => handleConfigChange({ enableFallback: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="enableFallback" className="text-xs text-gray-600 dark:text-gray-400">
                    Enable automatic fallback to backup providers
                  </label>
                </div>
              </div>
            </div>

            {/* Subscribed Symbols */}
            {subscribedSymbols.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Active Subscriptions ({subscribedSymbols.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {subscribedSymbols.map(symbol => (
                    <span
                      key={symbol}
                      className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                    >
                      {symbol}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Performance
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="font-medium text-gray-700 dark:text-gray-300">Update Rate</div>
                  <div className="text-green-600 dark:text-green-400">
                    {config.updateInterval / 1000}s
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="font-medium text-gray-700 dark:text-gray-300">Provider</div>
                  <div className="text-blue-600 dark:text-blue-400">
                    {activeProvider || 'None'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}