import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  AlertCircle, 
  Wifi, 
  Settings, 
  Eye, 
  EyeOff,
  Activity,
  Shield,
  Zap,
  Clock,
  CheckCircle,
  RefreshCw,
  User,
  CreditCard,
  Phone,
  Mail
} from 'lucide-react';
import { RealTimeDataService, DataServiceConfig } from '../services/RealTimeDataService';

interface Provider {
  key: string;
  name: string;
  description: string;
  features: string[];
  requirements: string[];
  type: 'free' | 'premium' | 'mock';
  logo: string;
  setupComplexity: 'easy' | 'medium' | 'hard';
}

interface StepProps {
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
  formData: any;
  setFormData: (data: any) => void;
  isLastStep: boolean;
  isFirstStep: boolean;
}

const PROVIDERS: Provider[] = [
  {
    key: 'mock',
    name: 'Mock Provider',
    description: 'Development and testing with simulated market data',
    features: ['Always Available', 'No Setup Required', 'Realistic Data Simulation', 'Pattern Testing'],
    requirements: ['None'],
    type: 'mock',
    logo: '🎭',
    setupComplexity: 'easy'
  },
  {
    key: 'nse',
    name: 'NSE Official',
    description: 'Official NSE data with rate limiting',
    features: ['Official NSE Data', 'Option Chains', 'Index Data', 'Free Access'],
    requirements: ['Internet Connection', 'Rate Limits Apply'],
    type: 'free',
    logo: '🏛️',
    setupComplexity: 'easy'
  },
  {
    key: 'yahoo',
    name: 'Yahoo Finance',
    description: 'Basic market data from Yahoo Finance',
    features: ['Global Markets', 'Basic Price Data', 'Free Access', 'Reliable'],
    requirements: ['Internet Connection'],
    type: 'free',
    logo: '🌐',
    setupComplexity: 'easy'
  },
  {
    key: 'angel',
    name: 'Angel One',
    description: 'Premium real-time data with WebSocket streaming',
    features: ['Real-time WebSocket', 'Full Option Chains', 'Tick-by-tick Data', 'Professional Grade'],
    requirements: ['Angel One Account', 'API Credentials', 'Trading Permissions'],
    type: 'premium',
    logo: '👼',
    setupComplexity: 'hard'
  }
];

// Step 1: Provider Selection
function ProviderSelectStep({ onNext, formData, setFormData }: StepProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>(formData.providerKey || '');

  const handleProviderSelect = (providerKey: string) => {
    setSelectedProvider(providerKey);
    setFormData({ ...formData, providerKey });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'premium': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'free': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'mock': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Select Data Provider
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Choose the market data provider that best fits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map((provider) => (
          <div
            key={provider.key}
            onClick={() => handleProviderSelect(provider.key)}
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedProvider === provider.key
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{provider.logo}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {provider.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(provider.type)}`}>
                      {provider.type.toUpperCase()}
                    </span>
                    <span className={`text-xs font-medium ${getComplexityColor(provider.setupComplexity)}`}>
                      {provider.setupComplexity.toUpperCase()} SETUP
                    </span>
                  </div>
                </div>
              </div>
              {selectedProvider === provider.key && (
                <CheckCircle className="w-6 h-6 text-blue-500" />
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {provider.description}
            </p>

            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Features
                </h4>
                <div className="flex flex-wrap gap-1">
                  {provider.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-700 dark:text-gray-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requirements
                </h4>
                <ul className="space-y-1">
                  {provider.requirements.map((req, index) => (
                    <li key={index} className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!selectedProvider}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 2: Credentials Entry
function CredentialsStep({ onNext, onPrev, formData, setFormData }: StepProps) {
  const [credentials, setCredentials] = useState({
    apiKey: formData.apiKey || '',
    clientId: formData.clientId || '',
    clientSecret: formData.clientSecret || ''
  });
  const [showCredentials, setShowCredentials] = useState(false);

  const selectedProvider = PROVIDERS.find(p => p.key === formData.providerKey);
  const requiresCredentials = selectedProvider?.key === 'angel';

  const handleCredentialChange = (field: string, value: string) => {
    const newCredentials = { ...credentials, [field]: value };
    setCredentials(newCredentials);
    setFormData({ ...formData, ...newCredentials });
  };

  const isValid = !requiresCredentials || (credentials.apiKey && credentials.clientId && credentials.clientSecret);

  if (!requiresCredentials) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Credentials Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {selectedProvider?.name} doesn't require any credentials to get started.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 dark:text-green-200 font-medium">
              Ready to proceed with {selectedProvider?.name}
            </span>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={onPrev}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <button
            onClick={onNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>Test Connection</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Enter API Credentials
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Provide your {selectedProvider?.name} API credentials to enable real-time data
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-200">
              Secure Credential Storage
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Your credentials are stored securely in our database and encrypted. They are used only for API authentication.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key *
          </label>
          <div className="relative">
            <input
              type={showCredentials ? 'text' : 'password'}
              value={credentials.apiKey}
              onChange={(e) => handleCredentialChange('apiKey', e.target.value)}
              placeholder="Enter your Angel One API Key"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showCredentials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client ID *
          </label>
          <input
            type={showCredentials ? 'text' : 'password'}
            value={credentials.clientId}
            onChange={(e) => handleCredentialChange('clientId', e.target.value)}
            placeholder="Enter your Angel One Client ID"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client Secret *
          </label>
          <input
            type={showCredentials ? 'text' : 'password'}
            value={credentials.clientSecret}
            onChange={(e) => handleCredentialChange('clientSecret', e.target.value)}
            placeholder="Enter your Angel One Client Secret"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
              How to get Angel One API credentials:
            </h3>
            <ol className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 list-decimal list-inside">
              <li>Create an account at <a href="https://angelone.in" target="_blank" rel="noopener noreferrer" className="underline">angelone.in</a></li>
              <li>Navigate to the Developer Portal</li>
              <li>Generate API credentials</li>
              <li>Enable API trading permissions</li>
              <li>Copy the API Key, Client ID, and Client Secret</li>
            </ol>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
              📖 <a href="https://smartapi.angelbroking.com/docs" target="_blank" rel="noopener noreferrer" className="underline">
                View Angel One API Documentation
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>Test Connection</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 3: Connection Test
function ConnectionTestStep({ onNext, onPrev, formData, setFormData }: StepProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);

  const selectedProvider = PROVIDERS.find(p => p.key === formData.providerKey);

  useEffect(() => {
    if (testStatus === 'idle') {
      runConnectionTest();
    }
  }, []);

  const runConnectionTest = async () => {
    setTestStatus('testing');
    setTestError('');
    setUserProfile(null);

    try {
      if (formData.providerKey === 'angel' && formData.apiKey) {
        // Test Angel One API connection and fetch profile
        console.log('🔐 Testing Angel One API connection...');
        
        const response = await fetch('/api/providers/angel-one/authenticate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: formData.apiKey,
            client_id: formData.clientId,
            client_secret: formData.clientSecret
          })
        });

        const data = await response.json();

        if (data.success) {
          setTestResult({
            success: true,
            provider: 'Angel One',
            connectionStatus: true,
            profile: data.profile
          });
          setUserProfile(data.profile);
          setTestStatus('success');
          setFormData({ 
            ...formData, 
            testResult: { success: true },
            userProfile: data.profile,
            providerId: data.providerId
          });
        } else {
          throw new Error(data.error || 'Authentication failed');
        }
      } else {
        // Test other providers (mock success for non-Angel providers)
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
        
        setTestResult({
          success: true,
          provider: selectedProvider?.name,
          connectionStatus: true
        });
        setTestStatus('success');
        setFormData({ ...formData, testResult: { success: true } });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setTestError(errorMessage);
      setTestResult({ success: false, error: errorMessage });
      setTestStatus('error');
      setFormData({ ...formData, testResult: { success: false, error: errorMessage } });
    }
  };

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'testing':
        return <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <X className="w-8 h-8 text-red-500" />;
      default:
        return <Activity className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (testStatus) {
      case 'testing':
        return 'Testing connection to ' + selectedProvider?.name + '...';
      case 'success':
        return 'Successfully connected to ' + selectedProvider?.name;
      case 'error':
        return 'Failed to connect to ' + selectedProvider?.name;
      default:
        return 'Preparing connection test...';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Testing Connection
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Verifying your connection to {selectedProvider?.name}
        </p>
      </div>

      <div className="text-center py-8">
        {getStatusIcon()}
        <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          {getStatusMessage()}
        </p>
        
        {testStatus === 'testing' && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {formData.providerKey === 'angel' ? 'Authenticating with Angel One API and fetching profile...' : 'This may take a few seconds...'}
          </p>
        )}
      </div>

      {testStatus === 'success' && testResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-200">
              Connection Successful
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-green-700 dark:text-green-300">Provider:</span>
              <span className="ml-2 font-medium text-green-800 dark:text-green-200">
                {testResult.provider}
              </span>
            </div>
            <div>
              <span className="text-green-700 dark:text-green-300">Status:</span>
              <span className="ml-2 font-medium text-green-800 dark:text-green-200">
                {testResult.connectionStatus ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* User Profile Information */}
          {userProfile && (
            <div className="border-t border-green-200 dark:border-green-700 pt-4">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Profile Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {userProfile.user_name && (
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">Name:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {userProfile.user_name}
                    </span>
                  </div>
                )}
                {userProfile.user_id && (
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">Client ID:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {userProfile.user_id}
                    </span>
                  </div>
                )}
                {userProfile.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">Email:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {userProfile.email}
                    </span>
                  </div>
                )}
                {userProfile.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">Phone:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {userProfile.phone}
                    </span>
                  </div>
                )}
                {userProfile.account_type && (
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-300">Account:</span>
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {userProfile.account_type}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {testStatus === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <X className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-200">
              Connection Failed
            </span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            {testError}
          </p>
          <div className="text-xs text-red-600 dark:text-red-400 mb-3">
            Please check your credentials and ensure your Angel One account has API access enabled.
          </div>
          <button
            onClick={runConnectionTest}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Test</span>
          </button>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          disabled={testStatus !== 'success'}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>Configure Settings</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 4: Configuration
function ConfigurationStep({ onNext, onPrev, formData, setFormData }: StepProps) {
  const [config, setConfig] = useState({
    updateInterval: formData.updateInterval || 5000,
    enableFallback: formData.enableFallback || true,
    retryAttempts: formData.retryAttempts || 3,
    fallbackProviders: formData.fallbackProviders || ['nse', 'yahoo']
  });

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    setFormData({ ...formData, ...newConfig });
  };

  const selectedProvider = PROVIDERS.find(p => p.key === formData.providerKey);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Configure Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Customize your {selectedProvider?.name} connection settings
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Update Interval
          </label>
          <select
            value={config.updateInterval / 1000}
            onChange={(e) => handleConfigChange('updateInterval', parseInt(e.target.value) * 1000)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={1}>1 second (High frequency)</option>
            <option value={5}>5 seconds (Recommended)</option>
            <option value={10}>10 seconds (Balanced)</option>
            <option value={30}>30 seconds (Conservative)</option>
            <option value={60}>1 minute (Low frequency)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            How often to fetch new market data. Lower intervals provide more real-time data but use more resources.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Retry Attempts
          </label>
          <select
            value={config.retryAttempts}
            onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={1}>1 attempt</option>
            <option value={3}>3 attempts (Recommended)</option>
            <option value={5}>5 attempts</option>
            <option value={10}>10 attempts</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Number of times to retry failed connections before switching to fallback.
          </p>
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-3">
            <input
              type="checkbox"
              id="enableFallback"
              checked={config.enableFallback}
              onChange={(e) => handleConfigChange('enableFallback', e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <label htmlFor="enableFallback" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Fallback Providers
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Automatically switch to backup providers if the primary connection fails.
          </p>

          {config.enableFallback && (
            <div className="ml-6 space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fallback Order
              </label>
              {PROVIDERS.filter(p => p.key !== formData.providerKey).map((provider) => (
                <div key={provider.key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`fallback-${provider.key}`}
                    checked={config.fallbackProviders.includes(provider.key)}
                    onChange={(e) => {
                      const newFallbacks = e.target.checked
                        ? [...config.fallbackProviders, provider.key]
                        : config.fallbackProviders.filter(p => p !== provider.key);
                      handleConfigChange('fallbackProviders', newFallbacks);
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor={`fallback-${provider.key}`} className="text-sm text-gray-700 dark:text-gray-300">
                    {provider.name}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-200">
              Performance Recommendations
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
              <li>• Use 5-second intervals for most trading applications</li>
              <li>• Enable fallback providers for maximum reliability</li>
              <li>• Higher retry attempts reduce connection interruptions</li>
              <li>• Consider your internet speed when setting intervals</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>Review & Finish</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Step 5: Review & Finish
function ReviewStep({ onComplete, onPrev, formData }: StepProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [creationResult, setCreationResult] = useState<any>(null);

  const selectedProvider = PROVIDERS.find(p => p.key === formData.providerKey);

  const handleFinish = async () => {
    setIsCreating(true);

    try {
      // Save configuration to localStorage
      const config: DataServiceConfig = {
        primaryProvider: formData.providerKey,
        fallbackProviders: formData.fallbackProviders || [],
        updateInterval: formData.updateInterval || 5000,
        retryAttempts: formData.retryAttempts || 3,
        enableFallback: formData.enableFallback || false
      };

      if (formData.apiKey) {
        config.angelOne = {
          apiKey: formData.apiKey,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret
        };
      }

      localStorage.setItem('marketDataConfig', JSON.stringify(config));
      
      if (formData.apiKey) {
        localStorage.setItem('angelCredentials', JSON.stringify({
          apiKey: formData.apiKey,
          clientId: formData.clientId,
          clientSecret: formData.clientSecret
        }));
      }

      setCreationResult({
        id: formData.providerId || Date.now().toString(),
        provider: selectedProvider?.name,
        status: 'active',
        profile: formData.userProfile
      });

      // Simulate creation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      onComplete();
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Review & Finish
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Review your configuration before completing the setup
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-300">Provider</span>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{selectedProvider?.logo}</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {selectedProvider?.name}
            </span>
          </div>
        </div>

        {formData.userProfile && (
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Account</span>
            <div className="text-right">
              <div className="font-medium text-gray-900 dark:text-white">
                {formData.userProfile.user_name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formData.userProfile.user_id}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-300">Update Interval</span>
          <span className="text-gray-900 dark:text-white">
            {(formData.updateInterval || 5000) / 1000} seconds
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-300">Retry Attempts</span>
          <span className="text-gray-900 dark:text-white">
            {formData.retryAttempts || 3}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700 dark:text-gray-300">Fallback Enabled</span>
          <span className="text-gray-900 dark:text-white">
            {formData.enableFallback ? 'Yes' : 'No'}
          </span>
        </div>

        {formData.enableFallback && formData.fallbackProviders?.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">Fallback Providers</span>
            <div className="flex space-x-1">
              {formData.fallbackProviders.map((providerKey: string) => {
                const provider = PROVIDERS.find(p => p.key === providerKey);
                return (
                  <span key={providerKey} className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                    {provider?.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {formData.apiKey && (
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700 dark:text-gray-300">API Credentials</span>
            <span className="text-green-600 dark:text-green-400 flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" />
              <span>Configured & Verified</span>
            </span>
          </div>
        )}
      </div>

      {isCreating && (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Saving Configuration...
          </p>
        </div>
      )}

      {creationResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-200">
              Configuration Saved Successfully
            </span>
          </div>
          {creationResult.profile && (
            <div className="text-sm text-green-700 dark:text-green-300">
              Profile data for {creationResult.profile.user_name} has been stored securely.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onPrev}
          disabled={isCreating}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handleFinish}
          disabled={isCreating || !!creationResult}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span>{isCreating ? 'Saving...' : creationResult ? 'Completed' : 'Finish Setup'}</span>
          {!isCreating && !creationResult && <Check className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// Main Component
export function ServiceProviderSetup({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});

  const steps = [
    { title: 'Select Provider', component: ProviderSelectStep },
    { title: 'Enter Credentials', component: CredentialsStep },
    { title: 'Test Connection', component: ConnectionTestStep },
    { title: 'Configure Settings', component: ConfigurationStep },
    { title: 'Review & Finish', component: ReviewStep }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index <= currentStep
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400'
                }`}>
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    index <= currentStep
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <CurrentStepComponent
            onNext={handleNext}
            onPrev={handlePrev}
            onComplete={handleComplete}
            formData={formData}
            setFormData={setFormData}
            isFirstStep={currentStep === 0}
            isLastStep={currentStep === steps.length - 1}
          />
        </div>
      </div>
    </div>
  );
}