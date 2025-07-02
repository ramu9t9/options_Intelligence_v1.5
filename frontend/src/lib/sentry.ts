import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Initialize Sentry for frontend
export function initializeSentry() {
  // Only initialize if DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn('Sentry DSN not provided, frontend error monitoring disabled');
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'development',
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      
      // Performance monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      
      integrations: [
        new BrowserTracing({
          // Set up automatic route change tracking for React Router
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            // We'll need to provide this when we have React Router
            // For now, we'll use basic browser tracking
          ),
        }),
        new Sentry.Replay({
          // Capture 10% of all sessions,
          // plus 100% of sessions with an error
          sessionSampleRate: 0.1,
          errorSampleRate: 1.0,
        }),
      ],
      
      // Additional options
      beforeSend(event, hint) {
        // Filter out certain errors in development
        if (import.meta.env.DEV) {
          const error = hint.originalException;
          
          // Skip common development errors
          if (error && typeof error === 'object' && 'message' in error) {
            const message = error.message as string;
            if (
              message.includes('ResizeObserver loop limit exceeded') ||
              message.includes('Non-Error promise rejection captured') ||
              message.includes('Loading CSS chunk')
            ) {
              return null;
            }
          }
        }
        
        // Log error to console in development
        if (import.meta.env.DEV) {
          console.error('Sentry captured error:', hint.originalException);
        }
        
        return event;
      },
      
      // Set user context for better error tracking
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }
        
        // Skip navigation breadcrumbs for certain paths
        if (breadcrumb.category === 'navigation' && breadcrumb.data?.to?.includes('api/')) {
          return null;
        }
        
        return breadcrumb;
      }
    });

    // Set global tags
    Sentry.setTag('service', 'options-intelligence-platform');
    Sentry.setTag('component', 'frontend');
    
    console.log('Sentry initialized successfully for frontend');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
    return false;
  }
}

// Utility functions for frontend error tracking
export const captureError = (error: Error, context?: any, user?: any) => {
  if (!Sentry.isInitialized()) {
    console.warn('Sentry not initialized, error not captured:', error.message);
    return;
  }

  Sentry.withScope(scope => {
    if (user) {
      scope.setUser(user);
    }
    
    if (context) {
      scope.setContext('additional_context', context);
      
      // Set tags from context
      if (context.component) scope.setTag('component', context.component);
      if (context.action) scope.setTag('action', context.action);
      if (context.page) scope.setTag('page', context.page);
    }
    
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: any) => {
  if (!Sentry.isInitialized()) {
    console.warn('Sentry not initialized, message not captured:', message);
    return;
  }

  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('message_context', context);
    }
    
    Sentry.captureMessage(message, level);
  });
};

// Performance monitoring
export const startTransaction = (name: string, operation: string) => {
  if (!Sentry.isInitialized()) {
    return null;
  }
  
  return Sentry.startTransaction({
    name,
    op: operation,
    tags: {
      service: 'options-intelligence-platform'
    }
  });
};

// API error tracking
export const captureAPIError = (error: Error, endpoint: string, method: string, context?: any) => {
  captureError(error, {
    component: 'api-client',
    endpoint,
    method,
    action: 'api-request',
    ...context
  });
};

// UI error tracking
export const captureUIError = (error: Error, component: string, action: string, context?: any) => {
  captureError(error, {
    component,
    action,
    type: 'ui-error',
    ...context
  });
};

// Market data error tracking
export const captureMarketDataError = (error: Error, symbol: string, operation: string, context?: any) => {
  captureError(error, {
    component: 'market-data',
    symbol,
    operation,
    action: 'data-processing',
    ...context
  });
};

// Authentication error tracking
export const captureAuthError = (error: Error, action: string, context?: any) => {
  captureError(error, {
    component: 'authentication',
    action,
    type: 'auth-error',
    ...context
  });
};

// Set user context
export const setUser = (user: { id: string; email?: string; username?: string }) => {
  if (!Sentry.isInitialized()) return;
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username
  });
};

// Clear user context (on logout)
export const clearUser = () => {
  if (!Sentry.isInitialized()) return;
  
  Sentry.setUser(null);
};

// Create error boundary HOC
export const withSentryErrorBoundary = (Component: React.ComponentType<any>) => {
  return Sentry.withErrorBoundary(Component, {
    fallback: ({ error, resetError }) => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Something went wrong
              </h3>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            An unexpected error occurred. Our team has been notified and will investigate the issue.
          </div>
          <div className="flex space-x-3">
            <button
              onClick={resetError}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reload Page
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className="mt-4">
              <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    ),
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag('errorBoundary', true);
      scope.setContext('errorInfo', errorInfo);
    }
  });
};

export default Sentry;