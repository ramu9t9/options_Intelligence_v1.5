import { Request, Response, NextFunction } from 'express';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Enable default metrics collection
collectDefaultMetrics();

// Custom metrics for Options Intelligence Platform
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections'
});

const marketDataRequests = new Counter({
  name: 'market_data_requests_total',
  help: 'Total number of market data requests',
  labelNames: ['provider', 'symbol', 'status']
});

const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type']
});

const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation']
});

const patternDetectionCounter = new Counter({
  name: 'pattern_detection_total',
  help: 'Total number of pattern detections',
  labelNames: ['pattern_type', 'symbol']
});

// Request timing middleware
export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
};

// Error tracking middleware
export const errorTrackingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, error.message);
  
  // Track errors in metrics
  httpRequestTotal
    .labels(req.method, req.route?.path || req.path, '500')
    .inc();
  
  next(error);
};

// Market data metrics
export const trackMarketDataRequest = (provider: string, symbol: string, success: boolean) => {
  marketDataRequests
    .labels(provider, symbol, success ? 'success' : 'error')
    .inc();
};

// Database metrics
export const trackDatabaseQuery = (queryType: string, duration: number) => {
  databaseQueryDuration
    .labels(queryType)
    .observe(duration / 1000);
};

// Redis metrics
export const trackRedisOperation = (operation: string, duration: number) => {
  redisOperationDuration
    .labels(operation)
    .observe(duration / 1000);
};

// Pattern detection metrics
export const trackPatternDetection = (patternType: string, symbol: string) => {
  patternDetectionCounter
    .labels(patternType, symbol)
    .inc();
};

// WebSocket connection tracking
export const updateActiveConnections = (count: number) => {
  activeConnections.set(count);
};

// Health check data
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'connected' | 'disconnected' | 'error';
      responseTime?: number;
      error?: string;
    };
    marketData: {
      status: 'active' | 'degraded' | 'offline';
      lastUpdate?: string;
      providers: string[];
    };
    websocket: {
      activeConnections: number;
      status: 'active' | 'inactive';
    };
  };
  metrics: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

// Get system health status
export const getHealthStatus = async (): Promise<HealthStatus> => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    status: 'healthy', // This would be calculated based on service checks
    timestamp: new Date().toISOString(),
    uptime,
    services: {
      database: {
        status: 'connected', // Would check actual DB connection
        responseTime: 15
      },
      redis: {
        status: 'connected', // Would check actual Redis connection
        responseTime: 5
      },
      marketData: {
        status: 'active',
        lastUpdate: new Date().toISOString(),
        providers: ['Angel One', 'NSE', 'Mock']
      },
      websocket: {
        activeConnections: 0, // Would get from actual WebSocket server
        status: 'active'
      }
    },
    metrics: {
      totalRequests: 0, // Would get from metrics
      averageResponseTime: 150,
      errorRate: 0.02,
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      }
    }
  };
};

// Export the Prometheus registry for /metrics endpoint
export { register as prometheusRegister };