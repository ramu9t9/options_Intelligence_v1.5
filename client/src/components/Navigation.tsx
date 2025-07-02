import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';

interface NavigationProps {
  user?: any;
  onLogout?: () => void;
}

export function Navigation({ user, onLogout }: NavigationProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Main trading dashboard'
    },
    {
      path: '/multi-segment',
      label: 'Multi-Segment',
      icon: Zap,
      description: 'Equity, Commodity & Currency markets'
    },
    {
      path: '/option-chain',
      label: 'Option Chain',
      icon: TrendingUp,
      description: 'Real-time option chain analysis'
    },
    {
      path: '/pattern-analysis',
      label: 'Patterns',
      icon: BarChart3,
      description: 'AI-powered pattern detection'
    },
    {
      path: '/admin',
      label: 'Admin',
      icon: Settings,
      description: 'System administration'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location === '/';
    }
    return location.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (onLogout) {
      onLogout();
    }
    window.location.reload();
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-gray-800 lg:border-r lg:border-gray-700">
        <div className="flex items-center h-16 px-6 bg-gray-900">
          <div className="flex items-center space-x-2">
            <Zap className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold text-white">Options Intelligence</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 px-3 py-6 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link key={item.path} href={item.path}>
                  <div
                    className={clsx(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        active ? 'text-white' : 'text-gray-400 group-hover:text-white'
                      )}
                    />
                    <div className="flex-1">
                      <div>{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* User Info & Logout */}
          <div className="flex-shrink-0 p-4 border-t border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  {user?.username || 'User'}
                </p>
                <p className="text-xs text-gray-400">
                  {user?.role || 'Trader'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between h-16 px-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Zap className="w-6 h-6 text-blue-500" />
            <span className="text-lg font-bold text-white">Options Intelligence</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-gray-800 pt-16">
            <div className="px-4 py-6 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      className={clsx(
                        'flex items-center px-3 py-3 text-base font-medium rounded-md',
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="mr-3 h-6 w-6 flex-shrink-0" />
                      <div>
                        <div>{item.label}</div>
                        <div className="text-sm opacity-75">{item.description}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">
                      {user?.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {user?.role || 'Trader'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}