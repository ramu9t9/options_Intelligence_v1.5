import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels with colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.meta ? ' ' + JSON.stringify(info.meta) : ''}`
  )
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      stack,
      meta: Object.keys(meta).length > 0 ? meta : undefined
    });
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: consoleFormat,
    level: level(),
  }),
  
  // Daily rotate file for all logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat,
    level: 'info'
  }),

  // Separate file for errors
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat,
    level: 'error'
  }),

  // API request logs
  new DailyRotateFile({
    filename: path.join(logsDir, 'api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
    format: fileFormat,
    level: 'http'
  })
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create specialized loggers for different modules
export const apiLogger = winston.createLogger({
  level: 'http',
  format: fileFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'api-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      format: fileFormat
    })
  ]
});

export const marketDataLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'market-data-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '3d',
      format: fileFormat
    })
  ]
});

export const securityLogger = winston.createLogger({
  level: 'warn',
  format: fileFormat,
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      format: fileFormat
    })
  ]
});

export const performanceLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      format: fileFormat
    })
  ]
});

// Helper functions for common logging patterns
export const logApiRequest = (method: string, url: string, statusCode: number, responseTime: number, userAgent?: string) => {
  apiLogger.http('API Request', {
    method,
    url,
    statusCode,
    responseTime,
    userAgent,
    timestamp: new Date().toISOString()
  });
};

export const logMarketDataUpdate = (provider: string, symbol: string, dataType: string, success: boolean, responseTime?: number) => {
  marketDataLogger.info('Market Data Update', {
    provider,
    symbol,
    dataType,
    success,
    responseTime,
    timestamp: new Date().toISOString()
  });
};

export const logSecurityEvent = (event: string, userId?: number, ipAddress?: string, userAgent?: string, details?: any) => {
  securityLogger.warn('Security Event', {
    event,
    userId,
    ipAddress,
    userAgent,
    details,
    timestamp: new Date().toISOString()
  });
};

export const logPerformanceMetric = (operation: string, duration: number, metadata?: any) => {
  performanceLogger.info('Performance Metric', {
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const logError = (error: Error, context?: string, metadata?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const logInfo = (message: string, metadata?: any) => {
  logger.info(message, {
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const logDebug = (message: string, metadata?: any) => {
  logger.debug(message, {
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const logWarn = (message: string, metadata?: any) => {
  logger.warn(message, {
    metadata,
    timestamp: new Date().toISOString()
  });
};

// Export the main logger as default
export default logger;