import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Ensure logs directory exists
import { existsSync, mkdirSync } from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, module, context, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      module: module || 'unknown',
      message,
      context: context || {},
      ...meta
    };
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, module, context }) => {
    const moduleStr = module ? `[${module}]` : '';
    const contextStr = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    return `${timestamp} ${level} ${moduleStr} ${message}${contextStr}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'options-intelligence-platform',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),

    // Daily rotating file for all logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // Keep logs for 14 days
      level: 'info'
    }),

    // Separate file for errors only
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Keep error logs for 30 days
      level: 'error'
    }),

    // API access logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'api-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '7d', // Keep API logs for 7 days
      level: 'info'
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ]
});

// Create module-specific loggers
export const createModuleLogger = (moduleName: string) => {
  return {
    info: (message: string, context?: any) => 
      logger.info(message, { module: moduleName, context }),
    
    warn: (message: string, context?: any) => 
      logger.warn(message, { module: moduleName, context }),
    
    error: (message: string, error?: Error | any, context?: any) => {
      const errorContext = error instanceof Error ? {
        stack: error.stack,
        name: error.name,
        message: error.message,
        ...context
      } : { error, ...context };
      
      logger.error(message, { module: moduleName, context: errorContext });
    },
    
    debug: (message: string, context?: any) => 
      logger.debug(message, { module: moduleName, context }),
    
    // API-specific logging
    api: (method: string, path: string, statusCode: number, duration: number, context?: any) => {
      const apiLogger = winston.createLogger({
        level: 'info',
        format: logFormat,
        transports: [
          new winston.transports.File({ 
            filename: path.join(logsDir, `api-${new Date().toISOString().split('T')[0]}.log`)
          })
        ]
      });

      apiLogger.info('API Request', {
        module: moduleName,
        context: {
          method,
          path,
          statusCode,
          duration,
          timestamp: new Date().toISOString(),
          ...context
        }
      });
    },

    // Market data specific logging
    marketData: (action: string, symbol: string, data?: any, context?: any) => 
      logger.info(`Market Data: ${action}`, { 
        module: moduleName, 
        context: { symbol, data, action, ...context } 
      }),

    // Infrastructure logging
    infrastructure: (component: string, status: string, metrics?: any, context?: any) =>
      logger.info(`Infrastructure: ${component} ${status}`, {
        module: moduleName,
        context: { component, status, metrics, ...context }
      }),

    // Security logging
    security: (event: string, user?: string, context?: any) =>
      logger.warn(`Security Event: ${event}`, {
        module: moduleName,
        context: { event, user, timestamp: new Date().toISOString(), ...context }
      })
  };
};

// Default logger instance
export const log = createModuleLogger('system');

// Performance logging helper
export const logPerformance = (operation: string, startTime: number, context?: any) => {
  const duration = Date.now() - startTime;
  log.info(`Performance: ${operation} completed in ${duration}ms`, context);
  return duration;
};

// Error logging helper with automatic Sentry integration
export const logError = (message: string, error: Error, context?: any) => {
  log.error(message, error, context);
  
  // If Sentry is available, capture the error
  try {
    const Sentry = require('@sentry/node');
    if (Sentry.isInitialized()) {
      Sentry.captureException(error, {
        tags: { module: context?.module || 'unknown' },
        extra: context
      });
    }
  } catch (sentryError) {
    // Ignore Sentry errors in logging
  }
};

// Request logging middleware factory
export const createRequestLogger = (moduleName: string) => {
  const moduleLogger = createModuleLogger(moduleName);
  
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Log request start
    moduleLogger.api(
      req.method,
      req.originalUrl || req.url,
      0, // Status code not available yet
      0, // Duration not available yet
      {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id || Math.random().toString(36).substr(2, 9)
      }
    );

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      const duration = Date.now() - startTime;
      
      moduleLogger.api(
        req.method,
        req.originalUrl || req.url,
        res.statusCode,
        duration,
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.id || 'unknown',
          responseSize: res.get('Content-Length') || 0
        }
      );
      
      originalEnd.apply(this, args);
    };

    next();
  };
};

export default logger;