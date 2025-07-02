import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { MarketDataProvider } from './context/MarketDataContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ToastProvider } from './components/ToastProvider';
import { TooltipProviderComponent } from './components/TooltipProvider';
import { OfflineStatus } from './components/OfflineStatus';
import { PageTransition } from './components/PageTransition';
import { Layout } from './components/layout/Layout';
import { Landing } from './pages/Landing';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { OptionChain } from './pages/OptionChain';
import { PatternAnalysis } from './pages/PatternAnalysis';
import AdminDashboard from './pages/AdminDashboard';
import SimpleBrokerAdmin from './pages/SimpleBrokerAdmin';
import MultiSegmentDashboard from './pages/MultiSegmentDashboard';
import CommodityAnalytics from './pages/CommodityAnalytics';
import SimplifiedMultiSegment from './pages/SimplifiedMultiSegment';
import ModernMultiSegment from './pages/ModernMultiSegment';
import { StrategyBuilder } from './pages/StrategyBuilder';
import Backtesting from './pages/Backtesting';
import BrokerSetup from './pages/BrokerSetup';
import Settings from './pages/Settings';
import AiAssistant from './pages/AiAssistant';
import BacktestResults from './pages/BacktestResults';
import MarketReports from './pages/MarketReports';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on app load
  useEffect(() => {
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
      // For development: Auto-authenticate with demo user
      setUser({ 
        id: 1, 
        username: 'demo', 
        email: 'demo@options.com',
        role: 'user',
        subscriptionTier: 'VIP'
      });
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
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProviderComponent>
          <MarketDataProvider>
            <BrowserRouter>
              <div className="min-h-screen bg-background text-foreground">
                <OfflineStatus />
                <AnimatePresence mode="wait" initial={false}>
                  <Routes>
                    {isAuthenticated ? (
                    <>
                      <Route path="/" element={<Layout><PageTransition><Dashboard /></PageTransition></Layout>} />
                      <Route path="/multi-segment" element={<Layout><PageTransition><ModernMultiSegment /></PageTransition></Layout>} />
                      <Route path="/commodity-analytics" element={<Layout><PageTransition><CommodityAnalytics /></PageTransition></Layout>} />
                      <Route path="/option-chain" element={<Layout><PageTransition><OptionChain /></PageTransition></Layout>} />
                      <Route path="/pattern-analysis" element={<Layout><PageTransition><PatternAnalysis /></PageTransition></Layout>} />
                      <Route path="/strategy-builder" element={<Layout><PageTransition><StrategyBuilder /></PageTransition></Layout>} />
                      <Route path="/backtesting" element={<Layout><PageTransition><Backtesting /></PageTransition></Layout>} />
                      <Route path="/ai-assistant" element={<Layout><PageTransition><AiAssistant /></PageTransition></Layout>} />
                      <Route path="/backtest-results" element={<Layout><PageTransition><BacktestResults /></PageTransition></Layout>} />
                      <Route path="/market-reports" element={<Layout><PageTransition><MarketReports /></PageTransition></Layout>} />
                      <Route path="/broker-setup" element={<Layout><PageTransition><BrokerSetup /></PageTransition></Layout>} />
                      <Route path="/settings" element={<Layout><PageTransition><Settings /></PageTransition></Layout>} />
                      <Route path="/admin" element={<Layout><PageTransition><AdminDashboard /></PageTransition></Layout>} />
                      <Route path="/admin/brokers" element={<Layout><PageTransition><SimpleBrokerAdmin /></PageTransition></Layout>} />
                    </>
                  ) : (
                    <>
                      <Route path="/" element={<PageTransition><AuthPage /></PageTransition>} />
                      <Route path="/demo" element={<Layout><PageTransition><ModernMultiSegment /></PageTransition></Layout>} />
                      <Route path="/landing" element={<PageTransition><Landing /></PageTransition>} />
                      <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
                    </>
                  )}
                  <Route path="*" element={
                    <PageTransition>
                      <div className="min-h-screen bg-background flex items-center justify-center">
                        <div className="text-foreground">Page not found</div>
                      </div>
                    </PageTransition>
                  } />
                  </Routes>
                </AnimatePresence>
                <Toaster />
                <ToastProvider />
              </div>
            </BrowserRouter>
          </MarketDataProvider>
        </TooltipProviderComponent>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;