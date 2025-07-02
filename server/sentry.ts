import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { createModuleLogger } from './logger';

const log = createModuleLogger('sentry');

// Initialize Sentry for backend
export function initializeSentry() {
  // Only initialize if DSN is provided
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    log.warn('Sentry DSN not provided, error monitoring disabled');
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '1.0.0',
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      integrations: [
        // Enable automatic instrumentation
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
        Sentry.onUncaughtExceptionIntegration(),
        Sentry.onUnhandledRejectionIntegration(),
        nodeProfilingIntegration(),
        
        // Database integration (if needed)
        // Sentry.postgresIntegration(),
      ],
      
      // Additional options
      beforeSend(event, hint) {
        // Filter out certain errors in development
        if (process.env.NODE_ENV === 'development') {
          const error = hint.originalException;
          if (error && typeof error === 'object' && 'code' in error) {
            // Skip Redis connection errors in development
            if (error.code === 'ECONNREFUSED' && hint.originalException.toString().includes('6379')) {
              return null;
            }
          }
        }
        
        // Log error to our structured logging
        log.error('Sentry captured error', hint.originalException as Error, {
          eventId: event.event_id,
          fingerprint: event.fingerprint,
          tags: event.tags
        });
        
        return event;
      },
      
      // Set user context for better error tracking
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }
        return breadcrumb;
      }
    });

    // Set global tags
    Sentry.setTag('service', 'options-intelligence-platform');
    Sentry.setTag('component', 'backend');
    
    log.info('Sentry initialized successfully', {
      environment: process.env.NODE_ENV,
      dsn: dsn.substring(0, 30) + '...' // Log partial DSN for verification
    });
    
    return true;
  } catch (error) {
    log.error('Failed to initialize Sentry', error as Error);
    return false;
  }
}

// Express middleware for Sentry request handling
export const sentryRequestHandler = Sentry.expressIntegration({
  // Capture request info
  request: true,
  // Capture response headers
  response: true,
  // Capture user info from request
  user: ['id', 'username', 'email']
});

// Express error handler for Sentry
export const sentryErrorHandler = Sentry.expressErrorHandler({
  shouldHandleError(error) {
    // Capture all errors
    return true;
  }
});

// Utility functions for error tracking
export const captureError = (error: Error, context?: any, user?: any) => {
  if (!Sentry.isInitialized()) {
    log.warn('Sentry not initialized, error not captured', { error: error.message });
    return;
  }

  Sentry.withScope(scope => {
    if (user) {
      scope.setUser(user);
    }
    
    if (context) {
      scope.setContext('additional_context', context);
      
      // Set tags from context
      if (context.module) scope.setTag('module', context.module);
      if (context.operation) scope.setTag('operation', context.operation);
      if (context.component) scope.setTag('component', context.component);
    }
    
    Sentry.captureException(error);
  });
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: any) => {
  if (!Sentry.isInitialized()) {
    log.warn('Sentry not initialized, message not captured', { message });
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

// Market data specific error tracking
export const captureMarketDataError = (error: Error, symbol: string, provider: string, context?: any) => {
  captureError(error, {
    module: 'market-data',
    symbol,
    provider,
    operation: 'data-fetch',
    ...context
  });
};

// API error tracking
export const captureAPIError = (error: Error, req: any, context?: any) => {
  const user = req.user ? {
    id: req.user.id,
    username: req.user.username,
    email: req.user.email
  } : undefined;

  captureError(error, {
    module: 'api',
    endpoint: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...context
  }, user);
};

// Infrastructure error tracking
export const captureInfrastructureError = (error: Error, component: string, context?: any) => {
  captureError(error, {
    module: 'infrastructure',
    component,
    operation: 'system-operation',
    ...context
  });
};

// Database error tracking
export const captureDatabaseError = (error: Error, operation: string, table?: string, context?: any) => {
  captureError(error, {
    module: 'database',
    operation,
    table,
    ...context
  });
};

// Authentication error tracking
export const captureAuthError = (error: Error, user?: string, context?: any) => {
  captureError(error, {
    module: 'authentication',
    user,
    operation: 'auth-operation',
    ...context
  });
};

export default Sentry;