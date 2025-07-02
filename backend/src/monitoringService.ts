import { EventEmitter } from 'events';
import { queueManager } from './jobs/queueManager';
import { circuitBreakerManager } from './circuitBreaker';
import { pubSubManager } from './pubSubManager';
import { cacheAdapter } from './cacheAdapter';

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  queues: {
    mode: string;
    redis: boolean;
    stats: any;
  };
  circuitBreakers: {
    total: number;
    healthy: number;
    degraded: number;
    critical: number;
    breakers: any[];
  };
  pubSub: {
    connected: boolean;
    messageCount: number;
    subscriptions: number;
  };
  cache: {
    available: boolean;
    hitRate: number;
    memoryUsage: number;
    totalRequests: number;
  };
  websockets: {
    activeConnections: number;
    totalMessagesSent: number;
    lastBroadcast: Date | null;
  };
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  threshold: number;
  duration: number; // seconds
}

export interface SystemAlert {
  id: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export class MonitoringService extends EventEmitter {
  private metrics: SystemMetrics[] = [];
  private activeAlerts = new Map<string, SystemAlert>();
  private alertConditions: AlertCondition[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  private websocketStats = {
    activeConnections: 0,
    totalMessagesSent: 0,
    lastBroadcast: null as Date | null,
  };

  constructor() {
    super();
    this.setupDefaultAlertConditions();
    this.startMetricsCollection();
  }

  private setupDefaultAlertConditions(): void {
    this.alertConditions = [
      {
        metric: 'memory.percentage',
        operator: 'gt',
        threshold: 85,
        duration: 300, // 5 minutes
      },
      {
        metric: 'circuitBreakers.critical',
        operator: 'gt',
        threshold: 0,
        duration: 60, // 1 minute
      },
      {
        metric: 'cache.hitRate',
        operator: 'lt',
        threshold: 0.5, // 50%
        duration: 600, // 10 minutes
      },
    ];
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      const metrics = await this.collectMetrics();
      this.metrics.push(metrics);
      
      // Keep only last 1000 metrics (approximately 16-17 hours at 1-minute intervals)
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }
      
      this.checkAlertConditions(metrics);
      this.emit('metrics:collected', metrics);
    }, 60000); // Collect every minute
  }

  private async collectMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    
    // Get queue statistics
    const queueStats = await queueManager.getQueueStats();
    
    // Get circuit breaker statistics
    const breakerStats = circuitBreakerManager.getAllBreakerStats();
    const systemHealth = circuitBreakerManager.getSystemHealth();
    
    // Get pub/sub statistics
    const pubSubStats = pubSubManager.getStats();
    
    // Get cache statistics
    const cacheStats = cacheAdapter.getStats();

    return {
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      memory: {
        used: memoryUsage.heapUsed,
        total: totalMemory,
        percentage: (memoryUsage.heapUsed / totalMemory) * 100,
      },
      cpu: {
        usage: process.cpuUsage().system / 1000000, // Convert to seconds
      },
      queues: {
        mode: queueStats.mode,
        redis: queueStats.redis,
        stats: queueStats,
      },
      circuitBreakers: {
        total: systemHealth.totalBreakers,
        healthy: systemHealth.healthyBreakers,
        degraded: systemHealth.openBreakers + systemHealth.halfOpenBreakers,
        critical: systemHealth.openBreakers,
        breakers: breakerStats,
      },
      pubSub: {
        connected: pubSubStats.connected,
        messageCount: pubSubStats.messageCount,
        subscriptions: pubSubStats.subscriptionCount,
      },
      cache: {
        available: cacheStats.redis.connected,
        hitRate: cacheStats.performance.hitRate,
        memoryUsage: cacheStats.performance.memoryUsage,
        totalRequests: cacheStats.performance.totalRequests,
      },
      websockets: {
        activeConnections: this.websocketStats.activeConnections,
        totalMessagesSent: this.websocketStats.totalMessagesSent,
        lastBroadcast: this.websocketStats.lastBroadcast,
      },
    };
  }

  private checkAlertConditions(metrics: SystemMetrics): void {
    this.alertConditions.forEach(condition => {
      const value = this.getMetricValue(metrics, condition.metric);
      const isTriggered = this.evaluateCondition(value, condition);
      
      const alertId = `condition_${condition.metric}_${condition.operator}_${condition.threshold}`;
      const existingAlert = this.activeAlerts.get(alertId);
      
      if (isTriggered && !existingAlert) {
        this.createAlert({
          id: alertId,
          level: this.getAlertLevel(condition.metric),
          title: `${condition.metric} threshold exceeded`,
          message: `${condition.metric} is ${value} (threshold: ${condition.threshold})`,
          timestamp: new Date(),
          resolved: false,
          metadata: { condition, value, metrics },
        });
      } else if (!isTriggered && existingAlert && !existingAlert.resolved) {
        this.resolveAlert(alertId);
      }
    });
  }

  private getMetricValue(metrics: SystemMetrics, path: string): number {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : 0;
  }

  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'eq':
        return value === condition.threshold;
      default:
        return false;
    }
  }

  private getAlertLevel(metric: string): SystemAlert['level'] {
    if (metric.includes('memory') || metric.includes('critical')) {
      return 'CRITICAL';
    }
    if (metric.includes('cache') || metric.includes('degraded')) {
      return 'WARNING';
    }
    return 'INFO';
  }

  private createAlert(alert: SystemAlert): void {
    this.activeAlerts.set(alert.id, alert);
    console.log(`🚨 ALERT [${alert.level}]: ${alert.title} - ${alert.message}`);
    this.emit('alert:created', alert);
  }

  private resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`✅ ALERT RESOLVED: ${alert.title}`);
      this.emit('alert:resolved', alert);
    }
  }

  // Public API methods
  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(minutes: number = 60): SystemMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  getActiveAlerts(): SystemAlert[] {
    return Array.from(this.activeAlerts.values()).filter(a => !a.resolved);
  }

  getAllAlerts(): SystemAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  getSystemHealth(): {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    if (!metrics) {
      return {
        status: 'CRITICAL',
        score: 0,
        issues: ['No metrics available'],
        recommendations: ['Check monitoring service'],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check memory usage
    if (metrics.memory.percentage > 85) {
      issues.push('High memory usage');
      recommendations.push('Consider increasing memory or optimizing memory usage');
      score -= 20;
    }

    // Check circuit breakers
    if (metrics.circuitBreakers.critical > 0) {
      issues.push('Critical circuit breakers open');
      recommendations.push('Check external service dependencies');
      score -= 30;
    }

    // Check cache performance
    if (metrics.cache.hitRate < 0.5) {
      issues.push('Low cache hit rate');
      recommendations.push('Review cache configuration and TTL settings');
      score -= 15;
    }

    // Check pub/sub connectivity
    if (!metrics.pubSub.connected) {
      issues.push('Pub/sub system disconnected');
      recommendations.push('Check Redis connectivity');
      score -= 25;
    }

    // Check queue system
    if (!metrics.queues.redis) {
      issues.push('Queue system using fallback mode');
      recommendations.push('Restore Redis connectivity for optimal performance');
      score -= 10;
    }

    let status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (score < 50) status = 'CRITICAL';
    else if (score < 80) status = 'DEGRADED';

    return { status, score, issues, recommendations };
  }

  updateWebSocketStats(stats: Partial<typeof this.websocketStats>): void {
    Object.assign(this.websocketStats, stats);
  }

  recordWebSocketMessage(): void {
    this.websocketStats.totalMessagesSent++;
    this.websocketStats.lastBroadcast = new Date();
  }

  recordWebSocketConnection(delta: number): void {
    this.websocketStats.activeConnections += delta;
  }

  // API endpoint data formatters
  getHealthEndpointData(): any {
    const health = this.getSystemHealth();
    const metrics = this.getCurrentMetrics();
    
    return {
      status: health.status,
      timestamp: new Date(),
      uptime: metrics?.uptime || 0,
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: { status: 'healthy' }, // Would need actual DB check
        redis: { 
          status: metrics?.cache.available ? 'healthy' : 'degraded',
          message: metrics?.cache.available ? 'Connected' : 'Using fallback'
        },
        queue_system: {
          status: metrics?.queues.redis ? 'healthy' : 'degraded',
          mode: metrics?.queues.mode || 'unknown'
        },
        circuit_breakers: {
          status: health.score > 70 ? 'healthy' : 'degraded',
          total: metrics?.circuitBreakers.total || 0,
          healthy: metrics?.circuitBreakers.healthy || 0
        }
      },
      issues: health.issues,
      recommendations: health.recommendations
    };
  }

  getMetricsEndpointData(): any {
    const metrics = this.getCurrentMetrics();
    if (!metrics) return { error: 'No metrics available' };

    return {
      timestamp: metrics.timestamp,
      system: {
        uptime: metrics.uptime,
        memory: metrics.memory,
        cpu: metrics.cpu
      },
      infrastructure: {
        queues: {
          mode: metrics.queues.mode,
          redis_connected: metrics.queues.redis,
          stats: metrics.queues.stats
        },
        cache: {
          available: metrics.cache.available,
          hit_rate: metrics.cache.hitRate,
          memory_usage: metrics.cache.memoryUsage,
          total_requests: metrics.cache.totalRequests
        },
        pubsub: {
          connected: metrics.pubSub.connected,
          message_count: metrics.pubSub.messageCount,
          subscriptions: metrics.pubSub.subscriptions
        },
        circuit_breakers: {
          total: metrics.circuitBreakers.total,
          healthy: metrics.circuitBreakers.healthy,
          degraded: metrics.circuitBreakers.degraded,
          breakers: metrics.circuitBreakers.breakers
        }
      },
      websockets: {
        active_connections: metrics.websockets.activeConnections,
        total_messages_sent: metrics.websockets.totalMessagesSent,
        last_broadcast: metrics.websockets.lastBroadcast
      }
    };
  }

  cleanup(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.removeAllListeners();
  }
}

export const monitoringService = new MonitoringService();