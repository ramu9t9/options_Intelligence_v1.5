import CircuitBreaker from 'opossum';
import { EventEmitter } from 'events';

export interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  rollingCountTimeout: number;
  rollingCountBuckets: number;
  name: string;
  group?: string;
}

export interface CircuitBreakerStats {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  fallbacks: number;
  successes: number;
  rejects: number;
  fires: number;
  opens: number;
  lastFailureTime?: Date;
  nextAttempt?: Date;
  uptime: number;
}

export class CircuitBreakerManager extends EventEmitter {
  private breakers = new Map<string, CircuitBreaker>();
  private stats = new Map<string, any>();
  private fallbackProviders = new Map<string, Function>();

  constructor() {
    super();
  }

  createBreaker<T extends any[], R>(
    name: string,
    fn: (...args: T) => Promise<R>,
    options: Partial<CircuitBreakerOptions> = {},
    fallbackFn?: (...args: T) => Promise<R>
  ): CircuitBreaker {
    const defaultOptions: CircuitBreakerOptions = {
      timeout: 30000, // 30 seconds
      errorThresholdPercentage: 50, // 50% error rate
      resetTimeout: 30000, // 30 seconds before retry
      rollingCountTimeout: 60000, // 1 minute rolling window
      rollingCountBuckets: 10,
      name,
      ...options,
    };

    const breaker = new CircuitBreaker(fn, defaultOptions);

    // Setup event handlers
    this.setupBreakerEvents(breaker, name);

    // Register fallback if provided
    if (fallbackFn) {
      this.fallbackProviders.set(name, fallbackFn);
      breaker.fallback(fallbackFn);
    }

    this.breakers.set(name, breaker);
    this.stats.set(name, {
      failures: 0,
      fallbacks: 0,
      successes: 0,
      rejects: 0,
      fires: 0,
      opens: 0,
      lastFailureTime: null,
      nextAttempt: null,
      uptime: Date.now(),
    });

    console.log(`✅ Circuit breaker "${name}" created with threshold ${defaultOptions.errorThresholdPercentage}%`);
    return breaker;
  }

  private setupBreakerEvents(breaker: CircuitBreaker, name: string): void {
    breaker.on('open', () => {
      console.log(`🔴 Circuit breaker "${name}" OPENED - failing requests will be rejected`);
      const stats = this.stats.get(name);
      if (stats) {
        stats.opens++;
        stats.nextAttempt = new Date(Date.now() + breaker.options.resetTimeout);
      }
      this.emit('breaker:open', { name, timestamp: new Date() });
    });

    breaker.on('halfOpen', () => {
      console.log(`🟡 Circuit breaker "${name}" HALF-OPEN - testing with next request`);
      this.emit('breaker:halfOpen', { name, timestamp: new Date() });
    });

    breaker.on('close', () => {
      console.log(`🟢 Circuit breaker "${name}" CLOSED - normal operation resumed`);
      const stats = this.stats.get(name);
      if (stats) {
        stats.nextAttempt = null;
      }
      this.emit('breaker:close', { name, timestamp: new Date() });
    });

    breaker.on('success', (result, latency) => {
      const stats = this.stats.get(name);
      if (stats) {
        stats.successes++;
        stats.fires++;
      }
      this.emit('breaker:success', { name, latency, timestamp: new Date() });
    });

    breaker.on('failure', (error) => {
      console.log(`❌ Circuit breaker "${name}" recorded failure:`, error.message);
      const stats = this.stats.get(name);
      if (stats) {
        stats.failures++;
        stats.lastFailureTime = new Date();
      }
      this.emit('breaker:failure', { name, error: error.message, timestamp: new Date() });
    });

    breaker.on('reject', () => {
      console.log(`🚫 Circuit breaker "${name}" rejected request - circuit is OPEN`);
      const stats = this.stats.get(name);
      if (stats) {
        stats.rejects++;
      }
      this.emit('breaker:reject', { name, timestamp: new Date() });
    });

    breaker.on('timeout', () => {
      console.log(`⏰ Circuit breaker "${name}" timed out`);
      const stats = this.stats.get(name);
      if (stats) {
        stats.failures++;
      }
      this.emit('breaker:timeout', { name, timestamp: new Date() });
    });

    breaker.on('fallback', (result) => {
      console.log(`🔄 Circuit breaker "${name}" using fallback`);
      const stats = this.stats.get(name);
      if (stats) {
        stats.fallbacks++;
      }
      this.emit('breaker:fallback', { name, timestamp: new Date() });
    });
  }

  getBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getBreakerStats(name: string): CircuitBreakerStats | null {
    const breaker = this.breakers.get(name);
    const stats = this.stats.get(name);
    
    if (!breaker || !stats) return null;

    return {
      name,
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      failures: stats.failures,
      fallbacks: stats.fallbacks,
      successes: stats.successes,
      rejects: stats.rejects,
      fires: stats.fires,
      opens: stats.opens,
      lastFailureTime: stats.lastFailureTime,
      nextAttempt: stats.nextAttempt,
      uptime: Date.now() - stats.uptime,
    };
  }

  getAllBreakerStats(): CircuitBreakerStats[] {
    return Array.from(this.breakers.keys())
      .map(name => this.getBreakerStats(name))
      .filter(stats => stats !== null) as CircuitBreakerStats[];
  }

  getSystemHealth(): {
    totalBreakers: number;
    openBreakers: number;
    halfOpenBreakers: number;
    healthyBreakers: number;
    overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  } {
    const allStats = this.getAllBreakerStats();
    const openBreakers = allStats.filter(s => s.state === 'OPEN').length;
    const halfOpenBreakers = allStats.filter(s => s.state === 'HALF_OPEN').length;
    const healthyBreakers = allStats.filter(s => s.state === 'CLOSED').length;

    let overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (openBreakers > 0) {
      overallHealth = openBreakers >= allStats.length / 2 ? 'CRITICAL' : 'DEGRADED';
    }

    return {
      totalBreakers: allStats.length,
      openBreakers,
      halfOpenBreakers,
      healthyBreakers,
      overallHealth,
    };
  }

  async executeWithBreaker<T extends any[], R>(
    breakerName: string,
    ...args: T
  ): Promise<R> {
    const breaker = this.breakers.get(breakerName);
    if (!breaker) {
      throw new Error(`Circuit breaker "${breakerName}" not found`);
    }

    try {
      return await breaker.fire(...args);
    } catch (error) {
      // If we have a fallback and the circuit is open, the fallback was already called
      throw error;
    }
  }

  reset(name?: string): void {
    if (name) {
      const breaker = this.breakers.get(name);
      if (breaker) {
        breaker.close();
        console.log(`🔄 Circuit breaker "${name}" manually reset`);
      }
    } else {
      this.breakers.forEach((breaker, name) => {
        breaker.close();
        console.log(`🔄 Circuit breaker "${name}" manually reset`);
      });
    }
  }

  shutdown(): void {
    console.log('🧹 Shutting down circuit breakers...');
    this.breakers.forEach((breaker, name) => {
      breaker.shutdown();
      console.log(`📴 Circuit breaker "${name}" shut down`);
    });
    this.breakers.clear();
    this.stats.clear();
    this.fallbackProviders.clear();
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Pre-configured circuit breakers for common use cases
export const createApiCircuitBreaker = <T extends any[], R>(
  name: string,
  apiFn: (...args: T) => Promise<R>,
  fallbackFn?: (...args: T) => Promise<R>
): CircuitBreaker => {
  return circuitBreakerManager.createBreaker(
    name,
    apiFn,
    {
      timeout: 10000, // 10 seconds for API calls
      errorThresholdPercentage: 60, // 60% error rate
      resetTimeout: 30000, // 30 seconds before retry
      rollingCountTimeout: 60000, // 1 minute rolling window
      rollingCountBuckets: 10,
    },
    fallbackFn
  );
};

export const createDatabaseCircuitBreaker = <T extends any[], R>(
  name: string,
  dbFn: (...args: T) => Promise<R>,
  fallbackFn?: (...args: T) => Promise<R>
): CircuitBreaker => {
  return circuitBreakerManager.createBreaker(
    name,
    dbFn,
    {
      timeout: 5000, // 5 seconds for DB calls
      errorThresholdPercentage: 50, // 50% error rate
      resetTimeout: 15000, // 15 seconds before retry
      rollingCountTimeout: 30000, // 30 seconds rolling window
      rollingCountBuckets: 6,
    },
    fallbackFn
  );
};