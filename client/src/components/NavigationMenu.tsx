import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Settings, 
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: BarChart3,
    description: 'Live market overview and analytics'
  },
  {
    path: '/multi-segment',
    label: 'Multi-Segment',
    icon: TrendingUp,
    description: 'Equity, commodity and currency analysis'
  },
  {
    path: '/pattern-analysis',
    label: 'Pattern Analysis',
    icon: TrendingUp,
    description: 'Advanced pattern detection and insights'
  },
  {
    path: '/strategy-builder',
    label: 'Strategy Builder',
    icon: Target,
    description: 'Create and test custom trading strategies'
  },
  {
    path: '/admin',
    label: 'Admin Panel',
    icon: Settings,
    description: 'System management and configuration'
  }
];

export function NavigationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="sm"
          variant="outline"
          className="bg-slate-900/90 border-slate-600 text-white hover:bg-slate-800"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation Menu */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:relative md:w-64 md:bg-transparent md:border-r-0
      `}>
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Options Intelligence</h2>
            <p className="text-sm text-slate-400">Advanced Trading Platform</p>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Card className={`
                    cursor-pointer transition-all duration-200 hover:scale-[1.02]
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/50' 
                      : 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700'
                    }
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                          <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
                            {item.label}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      </div>
                      <p className="text-xs text-slate-500 pl-8">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">U</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Trader</p>
                <p className="text-xs text-slate-400">Pro Subscription</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}