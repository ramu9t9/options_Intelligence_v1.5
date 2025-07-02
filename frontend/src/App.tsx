import React from 'react';
import { Switch, Route } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { MarketDataProvider } from './context/MarketDataContext';
import { Landing } from './pages/Landing';
import { AuthPage } from './pages/AuthPage';
import { SimpleDashboard } from './pages/SimpleDashboard';
import { FullOptionChain } from './pages/FullOptionChain';
import { PatternAnalysis } from './pages/PatternAnalysis';
import AdminDashboard from './pages/AdminDashboard';
import SimpleBrokerAdmin from './pages/SimpleBrokerAdmin';
import MultiSegmentDashboard from './pages/MultiSegmentDashboard';
import CommodityAnalytics from './pages/CommodityAnalytics';
import SimplifiedMultiSegment from './pages/SimplifiedMultiSegment';
import ModernMultiSegment from './pages/ModernMultiSegment';
import StrategyBuilder from './pages/StrategyBuilder';
import Backtesting from './pages/Backtesting';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const [user, setUser] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check authentication on app load
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-gray-900">
      <Switch>
        <MarketDataProvider>
          <Route path="/" component={isAuthenticated ? SimpleDashboard : ModernMultiSegment} />
          <Route path="/multi-segment" component={ModernMultiSegment} />
          <Route path="/commodity-analytics" component={CommodityAnalytics} />
          <Route path="/option-chain" component={FullOptionChain} />
          <Route path="/pattern-analysis" component={PatternAnalysis} />
          <Route path="/strategy-builder" component={StrategyBuilder} />
          <Route path="/backtesting" component={Backtesting} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/brokers" component={SimpleBrokerAdmin} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/landing" component={Landing} />
        </MarketDataProvider>
        <Route>
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-white">Page not found</div>
          </div>
        </Route>
      </Switch>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;