import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  subscriptionTier?: string;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  requiredSubscription?: string[];
  fallbackComponent?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = [], 
  requiredSubscription = [],
  fallbackComponent
}: ProtectedRouteProps) {
  const { data: user, isLoading, error } = useQuery<{ user: User }>({
    queryKey: ['/api/auth/verify'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <Card className="w-96 bg-black/20 backdrop-blur-sm border border-white/10">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
              <p className="text-white">Verifying access permissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authentication error
  if (error || !user?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <Card className="w-96 bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              You need to be logged in to access this page.
            </p>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = user.user.role;
  const userSubscription = user.user.subscriptionTier || 'FREE';

  // Role-based access control
  if (requiredRole.length > 0 && !requiredRole.includes(userRole)) {
    const UnauthorizedComponent = fallbackComponent || (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <Card className="w-96 bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-orange-400" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-gray-300">
                You don't have permission to access this page.
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="text-sm text-red-300">
                  <strong>Required Role:</strong> {requiredRole.join(', ')}
                </div>
                <div className="text-sm text-red-300">
                  <strong>Your Role:</strong> {userRole}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1"
              >
                Go Back
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );

    return UnauthorizedComponent;
  }

  // Subscription-based access control
  if (requiredSubscription.length > 0 && !requiredSubscription.includes(userSubscription)) {
    const SubscriptionRequiredComponent = fallbackComponent || (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <Card className="w-96 bg-black/20 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-purple-400" />
              Upgrade Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-gray-300">
                This feature requires a higher subscription tier.
              </p>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                <div className="text-sm text-purple-300">
                  <strong>Required:</strong> {requiredSubscription.join(', ')}
                </div>
                <div className="text-sm text-purple-300">
                  <strong>Current:</strong> {userSubscription}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1"
              >
                Go Back
              </Button>
              <Button 
                onClick={() => window.location.href = '/settings'}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );

    return SubscriptionRequiredComponent;
  }

  // Access granted - render the protected content
  return <>{children}</>;
}

// Convenience components for common access patterns
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['ADMIN', 'SUPER_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['SUPER_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}

export function ProRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredSubscription={['PRO', 'VIP', 'INSTITUTIONAL']}>
      {children}
    </ProtectedRoute>
  );
}

export function VipRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredSubscription={['VIP', 'INSTITUTIONAL']}>
      {children}
    </ProtectedRoute>
  );
}

export function InstitutionalRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredSubscription={['INSTITUTIONAL']}>
      {children}
    </ProtectedRoute>
  );
}