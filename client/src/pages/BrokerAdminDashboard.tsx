import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Settings, User, Phone, Mail, Building, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

interface BrokerProfile {
  clientId: string;
  clientName?: string;
  email?: string;
  mobile?: string;
  status: string;
  provider?: string;
  segment?: string[];
  exchangeSegments?: string[];
}

interface Broker {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  connectionDetails: any;
  requiredFields: string[];
  profile: BrokerProfile | null;
}

interface BrokerCredentials {
  [key: string]: string;
}

interface CredentialState {
  value: string;
  isPlaceholder: boolean;
  originalValue?: string;
}

interface CredentialStorage {
  [key: string]: CredentialState;
}

export default function BrokerAdminDashboard() {
  const [selectedBroker, setSelectedBroker] = useState<string>('');
  const [credentials, setCredentials] = useState<CredentialStorage>({});
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBrokers();
    const interval = setInterval(fetchBrokers, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load stored credentials when broker is selected
  useEffect(() => {
    if (selectedBroker) {
      loadStoredCredentials(selectedBroker);
    }
  }, [selectedBroker]);

  const fetchBrokers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/brokers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBrokers(data.brokers || []);
      }
    } catch (error) {
      console.error('Error fetching brokers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: {
        value,
        isPlaceholder: false,
        originalValue: prev[field]?.originalValue
      }
    }));
  };

  const loadStoredCredentials = async (brokerId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/brokers/${brokerId}/credentials`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newCredentials: CredentialStorage = {};
        
        if (data.credentials) {
          Object.keys(data.credentials).forEach(key => {
            const value = data.credentials[key];
            newCredentials[key] = {
              value: value && value.includes('*') ? value : value, // Show masked value if it contains *
              isPlaceholder: value && value.includes('*'), // Mark as placeholder if masked
              originalValue: value && value.includes('*') ? undefined : value // Store original if not masked
            };
          });
        }
        
        setCredentials(newCredentials);
      }
    } catch (error) {
      console.error('Error loading stored credentials:', error);
    }
  };

  const handleConfigureBroker = async (brokerId: string) => {
    setIsConfiguring(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      
      // Convert CredentialStorage to BrokerCredentials for API
      const apiCredentials: BrokerCredentials = {};
      Object.keys(credentials).forEach(key => {
        const credState = credentials[key];
        if (credState) {
          // If it's a placeholder and user didn't modify it, use original value
          if (credState.isPlaceholder && credState.originalValue) {
            apiCredentials[key] = credState.originalValue;
          } else {
            // Use the current value (either new input or original)
            apiCredentials[key] = credState.value;
          }
        }
      });
      
      const response = await fetch(`/api/admin/brokers/${brokerId}/configure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiCredentials)
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setCredentials({});
        await fetchBrokers();
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error) {
      setMessage('❌ Configuration failed');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleTestConnection = async (brokerId: string) => {
    setIsTesting(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/brokers/${brokerId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setMessage(`${data.status === 'connected' ? '✅' : '❌'} ${data.message}`);
      await fetchBrokers();
    } catch (error) {
      setMessage('❌ Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfiguration = async (brokerId: string) => {
    setIsConfiguring(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/save-broker-config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brokerType: brokerId,
          credentials: Object.fromEntries(
            Object.entries(credentials).map(([key, value]) => [
              key, 
              typeof value === 'object' ? value.value : value
            ])
          )
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Configuration saved successfully!');
        await fetchBrokers();
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error) {
      setMessage('❌ Save configuration failed');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleSetPrimaryProvider = async (brokerId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/set-primary-provider`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ providerId: brokerId })
      });

      const result = await response.json();
      if (response.ok) {
        setMessage(`✅ Successfully set ${brokerId} as primary provider`);
        fetchBrokers(); // Refresh broker status
      } else {
        setMessage(`❌ ${result.message || 'Failed to set primary provider'}`);
      }
    } catch (error) {
      setMessage('❌ Error setting primary provider');
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'connected' ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const renderProfileDetails = (profile: BrokerProfile | null, brokerName: string) => {
    if (!profile) {
      return (
        <div className="text-center py-8">
          <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400">No profile data available</p>
          <p className="text-sm text-gray-500">Connect {brokerName} to view profile details</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
              <User className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Client ID</p>
                <p className="font-medium text-white">{profile.clientId}</p>
              </div>
            </div>
            
            {profile.clientName && (
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <Building className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-400">Client Name</p>
                  <p className="font-medium text-white">{profile.clientName}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {profile.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <Mail className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="font-medium text-white">{profile.email}</p>
                </div>
              </div>
            )}
            
            {profile.mobile && (
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <Phone className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-400">Mobile</p>
                  <p className="font-medium text-white">{profile.mobile}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Account Status</h4>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs ${
              profile.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {profile.status}
            </span>
            {profile.segment && profile.segment.length > 0 && (
              <div className="flex gap-1">
                {profile.segment.map((seg, idx) => (
                  <span key={idx} className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400">
                    {seg}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {profile.exchangeSegments && profile.exchangeSegments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Exchange Segments</h4>
            <div className="flex flex-wrap gap-2">
              {profile.exchangeSegments.map((exchange, idx) => (
                <span key={idx} className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">
                  {exchange}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-gray-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <button className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <h1 className="text-3xl font-bold">Broker Configuration</h1>
          </div>
          <p className="text-gray-400">Configure and manage broker API connections for centralized data feed</p>
          
          {message && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {brokers.map((broker) => (
            <div 
              key={broker.id} 
              className={`bg-gray-800 rounded-lg shadow-lg cursor-pointer transition-all ${
                selectedBroker === broker.id ? 'ring-2 ring-blue-500 bg-gray-700' : 'hover:bg-gray-750'
              }`}
              onClick={() => setSelectedBroker(broker.id)}
            >
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-blue-400" />
                    <h3 className="text-xl font-semibold">{broker.name}</h3>
                    {selectedBroker === broker.id && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(broker.status)}
                    <span className={`px-2 py-1 rounded text-xs ${
                      broker.status === 'connected' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {broker.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-4">Profile Information</h4>
                  {renderProfileDetails(broker.profile, broker.name)}
                </div>

                {selectedBroker === broker.id && (
                  <div className="border-t border-gray-700 pt-6">
                    <h4 className="text-lg font-medium mb-4">Configuration</h4>
                    <div className="space-y-4">
                      {broker.requiredFields.map((field) => (
                        <div key={field} className="space-y-2">
                          <label className="text-sm font-medium text-gray-300">
                            {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                            {['pin', 'totp'].includes(field) ? ' (Optional)' : ' *'}
                          </label>
                          <input
                            type={field.includes('secret') || field.includes('token') || field === 'pin' ? 'password' : 'text'}
                            value={credentials[field]?.value || ''}
                            onChange={(e) => handleCredentialChange(field, e.target.value)}
                            placeholder={credentials[field]?.isPlaceholder ? `Current: ${credentials[field]?.value}` : `Enter ${field}`}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                      
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => handleConfigureBroker(broker.id)}
                          disabled={isConfiguring}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isConfiguring ? 'Configuring...' : 'Configure & Connect'}
                        </button>
                        
                        {broker.status === 'connected' && (
                          <>
                            <button
                              onClick={() => handleTestConnection(broker.id)}
                              disabled={isTesting}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isTesting ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button
                              onClick={() => handleSaveConfiguration(broker.id)}
                              disabled={isConfiguring}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Save Configuration
                            </button>
                            <button
                              onClick={() => handleSetPrimaryProvider(broker.id)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              Set as Primary
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg shadow-lg mt-8">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-xl font-semibold">Centralized Data Feed Status</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {brokers.filter(b => b.status === 'connected').length}
                </div>
                <div className="text-sm text-gray-400">Connected Brokers</div>
              </div>
              
              <div className="text-center p-4 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-green-400 mb-1">Active</div>
                <div className="text-sm text-gray-400">Data Feed Status</div>
              </div>
              
              <div className="text-center p-4 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-purple-400 mb-1">Live</div>
                <div className="text-sm text-gray-400">Market Data Mode</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}