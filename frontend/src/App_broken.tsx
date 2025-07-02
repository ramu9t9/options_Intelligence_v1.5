import React from 'react';
import { Switch, Route, Link, useLocation } from 'wouter';
import { Landing } from './pages/Landing';
import { AuthenticationForm } from './components/AuthenticationForm';
import BrokerAdminDashboard from './pages/BrokerAdminDashboard';

function App() {
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [optionData, setOptionData] = React.useState<any[]>([]);
  const [spotPrice, setSpotPrice] = React.useState(22150);
  const [isConnected, setIsConnected] = React.useState(false);
  const [showAlertModal, setShowAlertModal] = React.useState(false);
  const [alertType, setAlertType] = React.useState<'PRICE' | 'PATTERN'>('PRICE');
  const [alertForm, setAlertForm] = React.useState({
    instrument: 'NIFTY',
    condition: 'ABOVE',
    targetValue: '',
    channels: ['IN_APP']
  });
  const [aiInsights, setAiInsights] = React.useState<any[]>([]);
  const [aiRecommendations, setAiRecommendations] = React.useState<any[]>([]);
  const [marketSentiment, setMarketSentiment] = React.useState<any>(null);
  const [showAiPanel, setShowAiPanel] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Dark mode effect
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleAuth = async (formData: any) => {
    setIsLoading(true);
    setError('');
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.token);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize WebSocket connection for real-time data
  React.useEffect(() => {
    if (isAuthenticated) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setIsConnected(true);
          console.log('Connected to real-time data feed');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'market-data') {
              setSpotPrice(data.niftyPrice || 22150);
              setOptionData(data.niftyData || generateMockOptionData());
            }
          } catch (error) {
            console.error('Error parsing WebSocket data:', error);
          }
        };
        
        ws.onclose = () => {
          setIsConnected(false);
          console.log('Disconnected from real-time data feed');
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
        
        return () => {
          ws.close();
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        // Fallback to mock data
        setOptionData(generateMockOptionData());
      }
    }
  }, [isAuthenticated]);

  // Check for existing authentication on app load
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token with backend
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
      });
    }
  }, []);

  // Generate mock option data
  const generateMockOptionData = () => {
    return [22000, 22050, 22100, 22150, 22200, 22250].map(strike => ({
      strike,
      callOI: Math.floor(Math.random() * 50000) + 20000,
      callLTP: Math.max(5, 200 - (strike - spotPrice) * 0.8 + Math.random() * 30),
      putOI: Math.floor(Math.random() * 45000) + 15000,
      putLTP: Math.max(5, (strike - spotPrice) * 0.8 + 60 + Math.random() * 25)
    }));
  };

  // Fetch AI insights and recommendations
  React.useEffect(() => {
    const fetchAiData = async () => {
      if (!isAuthenticated) return;

      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch AI insights
        const insightsResponse = await fetch('/api/ai/insights?symbol=NIFTY', { headers });
        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          setAiInsights(insightsData.insights || []);
        }

        // Fetch recommendations
        const recommendationsResponse = await fetch('/api/ai/recommendations?symbol=NIFTY', { headers });
        if (recommendationsResponse.ok) {
          const recommendationsData = await recommendationsResponse.json();
          setAiRecommendations(recommendationsData.recommendations || []);
        }

        // Fetch market sentiment
        const sentimentResponse = await fetch('/api/ai/sentiment', { headers });
        if (sentimentResponse.ok) {
          const sentimentData = await sentimentResponse.json();
          setMarketSentiment(sentimentData.sentiment);
        }
      } catch (error) {
        console.error('Failed to fetch AI data:', error);
      }
    };

    fetchAiData();
    const interval = setInterval(fetchAiData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Switch>
          <Route path="/auth">
            <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
              <AuthenticationForm
                mode={authMode}
                onSubmit={handleAuth}
                onModeChange={setAuthMode}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </Route>
          <Route>
            <Landing />
          </Route>
        </Switch>
      </div>
    );
  }

  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Switch>
        <Route path="/admin/brokers">
          <BrokerAdminDashboard />
        </Route>
        <Route>
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Options Intelligence
                  </h1>
                  <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    <span className="text-sm font-medium">{isConnected ? 'Live Data' : 'Disconnected'}</span>
                  </div>
                </div>
            
            <div className="flex items-center space-x-4">
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <Link href="/admin/brokers">
                  <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    Broker Config
                  </button>
                </Link>
              )}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Welcome, {user?.firstName || 'Trader'}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  setIsAuthenticated(false);
                  setUser(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Instruments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">6</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Live Signals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 font-bold">🔔</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">87%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Option Chain */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    NIFTY Option Chain
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Spot:</span>
                    <span className="font-bold text-gray-900 dark:text-white">₹{spotPrice.toLocaleString()}</span>
                    <span className="text-green-600 text-sm">+{((spotPrice - 22000) / 22000 * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Call OI</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">LTP</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-900 dark:text-white uppercase bg-blue-50 dark:bg-blue-900/20">Strike</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">LTP</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Put OI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(optionData.length > 0 ? optionData : generateMockOptionData()).map((option, index) => (
                        <tr key={option.strike} className={Math.abs(option.strike - spotPrice) < 50 ? 'bg-blue-50 dark:bg-blue-900/10' : ''}>
                          <td className="px-3 py-2 text-sm font-medium">{option.callOI.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm">₹{option.callLTP.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                            {option.strike}
                          </td>
                          <td className="px-3 py-2 text-sm">₹{option.putLTP.toFixed(2)}</td>
                          <td className="px-3 py-2 text-sm font-medium">{option.putOI.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Live Signals */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Signals</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">📈</span>
                    <span className="text-sm font-medium">Call Buildup</span>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">89%</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-600">📉</span>
                    <span className="text-sm font-medium">Put Unwinding</span>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">76%</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600">⚡</span>
                    <span className="text-sm font-medium">Gamma Squeeze</span>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">92%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-3">
                <button 
                  onClick={() => setShowAlertModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Create Alert
                </button>
                <button 
                  onClick={() => setShowAiPanel(true)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  AI Insights
                </button>
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                  Export Data
                </button>
                <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                  Settings
                </button>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription</h3>
              </div>
              <div className="p-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Plan</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {user?.role === 'USER' ? 'Free Tier' : user?.role}
                  </div>
                  <div className="text-xs text-gray-500 mb-4">
                    2/2 instruments used<br/>
                    3/5 alerts used
                  </div>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Status */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Platform Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Database:</span>
              <div className="font-medium text-green-600">Connected</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Market Data:</span>
              <div className="font-medium text-green-600">Active</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Alerts:</span>
              <div className="font-medium text-green-600">Running</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Security:</span>
              <div className="font-medium text-green-600">Protected</div>
            </div>
          </div>
        </div>

        {/* Alert Creation Modal */}
        {showAlertModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Create Alert
                  </h3>
                  <button
                    onClick={() => setShowAlertModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Alert Type
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setAlertType('PRICE')}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        alertType === 'PRICE'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Price Alert
                    </button>
                    <button
                      onClick={() => setAlertType('PATTERN')}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        alertType === 'PATTERN'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Pattern Alert
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Instrument
                  </label>
                  <select
                    value={alertForm.instrument}
                    onChange={(e) => setAlertForm({...alertForm, instrument: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="NIFTY">NIFTY</option>
                    <option value="BANKNIFTY">BANKNIFTY</option>
                    <option value="FINNIFTY">FINNIFTY</option>
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                  </select>
                </div>

                {alertType === 'PRICE' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Condition
                      </label>
                      <select
                        value={alertForm.condition}
                        onChange={(e) => setAlertForm({...alertForm, condition: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="ABOVE">Price moves above</option>
                        <option value="BELOW">Price moves below</option>
                        <option value="PERCENTAGE_CHANGE">Percentage change</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Value
                      </label>
                      <input
                        type="number"
                        value={alertForm.targetValue}
                        onChange={(e) => setAlertForm({...alertForm, targetValue: e.target.value})}
                        placeholder={alertForm.condition === 'PERCENTAGE_CHANGE' ? '2.5' : spotPrice.toString()}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {alertForm.condition === 'PERCENTAGE_CHANGE' 
                          ? 'Enter percentage (e.g., 2.5 for 2.5%)'
                          : `Current price: ₹${spotPrice.toLocaleString()}`
                        }
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pattern Type
                    </label>
                    <select
                      value={alertForm.condition}
                      onChange={(e) => setAlertForm({...alertForm, condition: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="CALL_LONG_BUILDUP">Call Long Buildup</option>
                      <option value="PUT_LONG_BUILDUP">Put Long Buildup</option>
                      <option value="GAMMA_SQUEEZE">Gamma Squeeze</option>
                      <option value="MAX_PAIN">Max Pain Analysis</option>
                      <option value="VOLATILITY_SPIKE">Volatility Spike</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notification Channels
                  </label>
                  <div className="space-y-2">
                    {[
                      { id: 'IN_APP', label: 'In-App Notification', available: true },
                      { id: 'EMAIL', label: 'Email', available: user?.role !== 'USER' },
                      { id: 'SMS', label: 'SMS', available: user?.role === 'VIP' || user?.role === 'INSTITUTIONAL' },
                      { id: 'WEBHOOK', label: 'Webhook', available: user?.role === 'INSTITUTIONAL' }
                    ].map((channel) => (
                      <label key={channel.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={alertForm.channels.includes(channel.id)}
                          disabled={!channel.available}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAlertForm({...alertForm, channels: [...alertForm.channels, channel.id]});
                            } else {
                              setAlertForm({...alertForm, channels: alertForm.channels.filter(c => c !== channel.id)});
                            }
                          }}
                          className="rounded"
                        />
                        <span className={`text-sm ${channel.available ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                          {channel.label}
                          {!channel.available && ' (Premium only)'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex space-x-3">
                <button
                  onClick={() => setShowAlertModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/alerts', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                          alertType,
                          instrumentId: 1, // Default to NIFTY
                          condition: alertForm.condition,
                          targetValue: parseFloat(alertForm.targetValue) || spotPrice,
                          channels: alertForm.channels.map(c => ({ type: c, isEnabled: true, config: {} }))
                        })
                      });
                      
                      if (response.ok) {
                        setShowAlertModal(false);
                        setAlertForm({ instrument: 'NIFTY', condition: 'ABOVE', targetValue: '', channels: ['IN_APP'] });
                      }
                    } catch (error) {
                      console.error('Failed to create alert:', error);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights Panel */}
        {showAiPanel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      AI Trading Insights
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      AI-powered market analysis and trading recommendations
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Market Sentiment */}
                {marketSentiment && (
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Market Sentiment Analysis
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Overall Sentiment</div>
                        <div className={`text-xl font-bold ${
                          marketSentiment.overall > 0.2 ? 'text-green-600' :
                          marketSentiment.overall < -0.2 ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {marketSentiment.overall > 0.2 ? 'BULLISH' :
                           marketSentiment.overall < -0.2 ? 'BEARISH' : 'NEUTRAL'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Score: {(marketSentiment.overall * 100).toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Put/Call Ratio</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {marketSentiment.putCallRatio.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {marketSentiment.putCallRatio > 1.2 ? 'Bearish' : 
                           marketSentiment.putCallRatio < 0.8 ? 'Bullish' : 'Neutral'}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Volatility Index</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {marketSentiment.volatilityIndex.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {marketSentiment.volatilityIndex > 25 ? 'High' : 
                           marketSentiment.volatilityIndex < 15 ? 'Low' : 'Normal'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Live Market Insights ({aiInsights.length})
                  </h4>
                  <div className="space-y-4">
                    {aiInsights.slice(0, 5).map((insight, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              insight.type === 'BULLISH' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              insight.type === 'BEARISH' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              insight.type === 'VOLATILITY' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {insight.type}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              insight.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                              insight.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              insight.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {insight.severity}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {(insight.confidence * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                        
                        <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {insight.title}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {insight.description}
                        </p>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Recommendation: {insight.recommendation.action}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {insight.recommendation.strategy}
                          </div>
                          {insight.recommendation.targetPrice && (
                            <div className="text-xs text-gray-500 mt-1">
                              Target: ₹{insight.recommendation.targetPrice.toLocaleString()} | 
                              Stop Loss: ₹{insight.recommendation.stopLoss?.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {aiInsights.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-2">🤖</div>
                        <p>AI is analyzing market conditions...</p>
                        <p className="text-sm">New insights will appear shortly</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trading Recommendations */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    AI Trading Recommendations ({aiRecommendations.length})
                  </h4>
                  <div className="space-y-4">
                    {aiRecommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded text-xs font-medium">
                              {rec.action}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {rec.underlying}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {(rec.confidence * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                        
                        <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {rec.strategy}
                        </h5>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div className="mb-1">Expected Return: {(rec.riskReward.expectedReturn * 100).toFixed(1)}%</div>
                          <div className="mb-1">Max Risk: {(rec.riskReward.maxRisk * 100).toFixed(1)}%</div>
                          <div>Success Probability: {(rec.riskReward.probability * 100).toFixed(0)}%</div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 rounded p-3 mb-3">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reasoning:
                          </div>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {rec.reasoning.map((reason: string, idx: number) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-2">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-gray-100 dark:bg-gray-700 rounded p-3">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Execution Plan:
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Strikes: {rec.execution.strikes.join(', ')} | 
                            Order: {rec.execution.orderType} | 
                            Qty: {rec.execution.quantities.join('-')}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {aiRecommendations.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <div className="text-4xl mb-2">📊</div>
                        <p>AI is generating recommendations...</p>
                        <p className="text-sm">Check back in a few moments</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    AI analysis updates every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
                  </div>
                  <button
                    onClick={() => setShowAiPanel(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        </Route>
      </Switch>
    </div>
  );
}

export default App;