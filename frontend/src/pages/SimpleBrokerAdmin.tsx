import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, CheckCircle, AlertCircle, User, Building, Power, Activity, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import toast, { Toaster } from 'react-hot-toast';

export default function SimpleBrokerAdmin() {
  // Admin dashboard is accessible without authentication for testing
  const [selectedBroker, setSelectedBroker] = useState('angel-one');
  const [credentials, setCredentials] = useState({
    clientId: '',
    apiKey: '',
    apiSecret: '',
    pin: '',
    totp: ''
  });
  const [savedConfigs, setSavedConfigs] = useState<{
    [key: string]: {
      clientId: string;
      connectionStatus: string;
      lastConnected: Date | null;
      userProfile: string | null;
      isActive: boolean;
    }
  }>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
    userInfo?: any;
  }>({ status: null, message: '' });
  const [dataFeedStatus, setDataFeedStatus] = useState<{
    activeProvider: string | null;
    isFeeding: boolean;
    lastUpdate: Date | null;
    feedStats: {
      instrumentsCount: number;
      updatesPerSecond: number;
      uptime: string;
    };
  }>({
    activeProvider: null,
    isFeeding: false,
    lastUpdate: null,
    feedStats: {
      instrumentsCount: 0,
      updatesPerSecond: 0,
      uptime: '0m'
    }
  });

  const handleTestConnection = async () => {
    if (!credentials.clientId || !credentials.apiKey || !credentials.apiSecret || !credentials.pin) {
      setConnectionResult({
        status: 'error',
        message: 'Please fill in all required fields before testing connection.'
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionResult({ status: null, message: '' });

    try {
      const response = await fetch('/api/admin/test-broker-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broker: selectedBroker,
          credentials: credentials
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setConnectionResult({
          status: 'success',
          message: result.message,
          userInfo: result.userInfo
        });
      } else {
        setConnectionResult({
          status: 'error',
          message: result.message || 'Connection test failed'
        });
      }
    } catch (error) {
      setConnectionResult({
        status: 'error',
        message: 'Network error: Unable to test connection'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleConnect = async (brokerId: string) => {
    alert(`Connecting to ${brokerId}... This will validate credentials and establish connection.`);
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/save-broker-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broker: selectedBroker,
          credentials: credentials
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Broker credentials saved successfully!', {
          duration: 4000,
          position: 'top-right',
        });
        // Reset connection result after save
        setConnectionResult({ status: null, message: '' });
      } else {
        toast.error(result.message || 'Failed to save broker configuration', {
          duration: 4000,
          position: 'top-right',
        });
      }
    } catch (error) {
      toast.error('Network error: Unable to save configuration', {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  const handleActivateDataFeed = async (brokerType: string) => {
    try {
      const response = await fetch('/api/admin/activate-data-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          broker: brokerType
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`${brokerType} data feed activated successfully!`, {
          duration: 4000,
          position: 'top-right',
        });
        fetchDataFeedStatus();
      } else {
        toast.error(result.message || 'Failed to activate data feed', {
          duration: 4000,
          position: 'top-right',
        });
      }
    } catch (error) {
      toast.error('Network error: Unable to activate data feed', {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  const handleDeactivateDataFeed = async () => {
    try {
      const response = await fetch('/api/admin/deactivate-data-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Data feed deactivated successfully!', {
          duration: 4000,
          position: 'top-right',
        });
        fetchDataFeedStatus();
      } else {
        toast.error(result.message || 'Failed to deactivate data feed', {
          duration: 4000,
          position: 'top-right',
        });
      }
    } catch (error) {
      toast.error('Network error: Unable to deactivate data feed', {
        duration: 4000,
        position: 'top-right',
      });
    }
  };

  const fetchDataFeedStatus = async () => {
    try {
      const response = await fetch('/api/admin/data-feed-status');
      const result = await response.json();

      if (response.ok && result.success) {
        setDataFeedStatus(result.status);
      }
    } catch (error) {
      console.error('Error fetching data feed status:', error);
    }
  };

  const fetchSavedConfigurations = async () => {
    try {
      const response = await fetch('/api/admin/broker-configs');
      const result = await response.json();

      if (response.ok && result.success) {
        const configsMap: { [key: string]: any } = {};
        result.configs.forEach((config: any) => {
          configsMap[config.brokerType] = {
            clientId: config.clientId,
            connectionStatus: config.connectionStatus,
            lastConnected: config.lastConnected ? new Date(config.lastConnected) : null,
            userProfile: config.userProfile,
            isActive: config.isActive
          };
        });
        setSavedConfigs(configsMap);

        // Load credentials for the currently selected broker
        await loadBrokerCredentials(selectedBroker);
      }
    } catch (error) {
      console.error('Error fetching saved configurations:', error);
    }
  };

  const loadBrokerCredentials = async (brokerType: string) => {
    try {
      // Load full configuration details for verification
      const response = await fetch(`/api/admin/broker-config-full/${brokerType}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.config) {
          // Show masked credentials to verify they're saved
          setCredentials({
            clientId: result.config.clientId || '',
            apiKey: result.config.fieldsConfigured.apiKey ? result.config.apiKey : '',
            apiSecret: result.config.fieldsConfigured.apiSecret ? result.config.apiSecret : '',
            pin: result.config.fieldsConfigured.pin ? result.config.pin : '',
            totp: result.config.fieldsConfigured.totp ? result.config.totp : ''
          });
          
          // Update connection result if we have user profile data
          if (result.config.userProfile) {
            try {
              const userProfile = JSON.parse(result.config.userProfile);
              setConnectionResult({
                status: result.config.connectionStatus === 'CONNECTED' ? 'success' : 'error',
                message: result.config.connectionStatus === 'CONNECTED' 
                  ? `Connected successfully to ${brokerType}`
                  : `Last connection: ${result.config.lastConnected ? new Date(result.config.lastConnected).toLocaleString() : 'Never'}`,
                userInfo: userProfile
              });
            } catch (e) {
              console.error('Error parsing user profile:', e);
            }
          } else if (result.config.fieldsConfigured.clientId) {
            // Show that credentials are saved even without connection
            setConnectionResult({
              status: null,
              message: `Credentials saved. Fields configured: ${Object.entries(result.config.fieldsConfigured)
                .filter(([_, value]) => value)
                .map(([key, _]) => key)
                .join(', ')}`
            });
          }
        }
      } else {
        // Fallback to basic config if full config not found
        const basicResponse = await fetch(`/api/admin/broker-config/${brokerType}`);
        if (basicResponse.ok) {
          const basicResult = await basicResponse.json();
          if (basicResult.success && basicResult.config) {
            setCredentials(prev => ({
              ...prev,
              clientId: basicResult.config.clientId || ''
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading broker credentials:', error);
    }
  };

  useEffect(() => {
    fetchDataFeedStatus();
    fetchSavedConfigurations();
    const interval = setInterval(fetchDataFeedStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load credentials when broker selection changes
    if (savedConfigs[selectedBroker]) {
      loadBrokerCredentials(selectedBroker);
    } else {
      // Clear form if no saved config
      setCredentials({
        clientId: '',
        apiKey: '',
        apiSecret: '',
        pin: '',
        totp: ''
      });
      setConnectionResult({ status: null, message: '' });
    }
  }, [selectedBroker, savedConfigs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/'}
                className="p-2 text-white hover:bg-white/10 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-white">Broker Admin Dashboard</h1>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-sm">
                ADMIN
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Broker Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Broker List */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Available Brokers</h2>
            
            {/* Angel One */}
            <div 
              onClick={() => setSelectedBroker('angel-one')}
              className={`bg-black/20 backdrop-blur-sm border rounded-lg p-4 cursor-pointer transition-all ${
                selectedBroker === 'angel-one' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Angel One</h3>
                    <p className="text-sm text-gray-400">Smart API Integration</p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>

            {/* Dhan */}
            <div 
              onClick={() => setSelectedBroker('dhan')}
              className={`bg-black/20 backdrop-blur-sm border rounded-lg p-4 cursor-pointer transition-all ${
                selectedBroker === 'dhan' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="w-8 h-8 text-purple-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Dhan</h3>
                    <p className="text-sm text-gray-400">Forever Free API</p>
                  </div>
                </div>
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-2">
            <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {selectedBroker === 'angel-one' ? 'Angel One Configuration' : 'Dhan Configuration'}
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={credentials.clientId}
                    onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter client ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials({...credentials, apiKey: e.target.value})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter API key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={credentials.apiSecret}
                    onChange={(e) => setCredentials({...credentials, apiSecret: e.target.value})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter API secret"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PIN
                  </label>
                  <input
                    type="password"
                    value={credentials.pin}
                    onChange={(e) => setCredentials({...credentials, pin: e.target.value})}
                    className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
                    placeholder="Enter PIN"
                  />
                </div>

                {selectedBroker === 'angel-one' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      TOTP Key (Optional)
                    </label>
                    <input
                      type="text"
                      value={credentials.totp}
                      onChange={(e) => setCredentials({...credentials, totp: e.target.value})}
                      className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
                      placeholder="Enter TOTP key for 2FA"
                    />
                  </div>
                )}

                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white px-6 py-2 rounded flex items-center space-x-2"
                  >
                    {isTestingConnection ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Testing...</span>
                      </>
                    ) : (
                      <span>Test Connection</span>
                    )}
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                  >
                    Save Configuration
                  </button>
                  <button
                    onClick={() => setCredentials({clientId: '', apiKey: '', apiSecret: '', pin: '', totp: ''})}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded"
                  >
                    Clear
                  </button>
                </div>

                {/* Connection Test Result */}
                {connectionResult.status && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    connectionResult.status === 'success' 
                      ? 'bg-green-900/20 border-green-500/30 text-green-400' 
                      : 'bg-red-900/20 border-red-500/30 text-red-400'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {connectionResult.status === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertCircle className="w-5 h-5" />
                      )}
                      <span className="font-medium">
                        {connectionResult.status === 'success' ? 'Connection Successful' : 'Connection Failed'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{connectionResult.message}</p>
                    {connectionResult.userInfo && (
                      <div className="mt-3 p-3 bg-black/20 rounded border border-white/10">
                        <h4 className="text-sm font-medium text-white mb-2">User Information:</h4>
                        <div className="text-xs space-y-1">
                          {connectionResult.userInfo.clientName && (
                            <div><span className="text-gray-400">Name:</span> {connectionResult.userInfo.clientName}</div>
                          )}
                          {connectionResult.userInfo.userId && (
                            <div><span className="text-gray-400">User ID:</span> {connectionResult.userInfo.userId}</div>
                          )}
                          {connectionResult.userInfo.email && (
                            <div><span className="text-gray-400">Email:</span> {connectionResult.userInfo.email}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Data Feed Status Panel */}
            <div className="mt-6 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Data Feed Status</h3>
                {dataFeedStatus.isFeeding && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm">Live Feed Active</span>
                  </div>
                )}
              </div>

              {dataFeedStatus.activeProvider ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Wifi className="w-6 h-6 text-green-400" />
                      <div>
                        <div className="text-green-400 font-medium">
                          {dataFeedStatus.activeProvider === 'angel-one' ? 'Angel One' : 'Dhan'} Data Feed
                        </div>
                        <div className="text-sm text-gray-400">
                          {dataFeedStatus.feedStats.instrumentsCount} instruments • {dataFeedStatus.feedStats.updatesPerSecond} updates/sec
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleDeactivateDataFeed}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center space-x-2"
                    >
                      <Power className="w-4 h-4" />
                      <span>Deactivate</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                      <div className="text-blue-400 text-lg font-bold">{dataFeedStatus.feedStats.instrumentsCount}</div>
                      <div className="text-gray-400 text-xs">Instruments</div>
                    </div>
                    <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                      <div className="text-green-400 text-lg font-bold">{dataFeedStatus.feedStats.updatesPerSecond}</div>
                      <div className="text-gray-400 text-xs">Updates/Sec</div>
                    </div>
                    <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                      <div className="text-purple-400 text-lg font-bold">{dataFeedStatus.feedStats.uptime}</div>
                      <div className="text-gray-400 text-xs">Uptime</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <div className="text-gray-400 mb-4">No active data feed</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleActivateDataFeed('angel-one')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center space-x-2"
                    >
                      <Activity className="w-4 h-4" />
                      <span>Activate Angel One Feed</span>
                    </button>
                    <button
                      onClick={() => handleActivateDataFeed('dhan')}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center justify-center space-x-2"
                    >
                      <Activity className="w-4 h-4" />
                      <span>Activate Dhan Feed</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Connection Status Panel */}
            <div className="mt-6 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Connection Status</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Angel One</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">
                      Connected
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Profile: Verified
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Dhan</span>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs">
                      Not Configured
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Profile: Pending
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Panel */}
        <div className="mt-8 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Centralized Data Feed Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
              <div className="text-green-400 font-medium">Single Admin Connection</div>
              <div className="text-gray-400">Only admin needs broker API credentials</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <Settings className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-blue-400 font-medium">Centralized Management</div>
              <div className="text-gray-400">Configure all brokers from one dashboard</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <User className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-purple-400 font-medium">User-Friendly Access</div>
              <div className="text-gray-400">Users access data without API setup</div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}