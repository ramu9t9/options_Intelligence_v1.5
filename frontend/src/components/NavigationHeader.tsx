import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Home, LogOut, ArrowLeft, Settings, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
}

export function NavigationHeader({ title, subtitle }: NavigationHeaderProps) {
  const [location] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    window.location.href = '/auth';
  };

  const getBackPath = () => {
    if (location === '/backtesting' || location === '/strategy-builder') {
      return '/';
    }
    if (location.startsWith('/admin')) {
      return '/admin';
    }
    return '/';
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left side - Back and Title */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side - Navigation buttons */}
        <div className="flex items-center space-x-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          <Link href="/strategy-builder">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Strategies
            </Button>
          </Link>

          <Link href="/backtesting">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Backtesting
            </Button>
          </Link>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}