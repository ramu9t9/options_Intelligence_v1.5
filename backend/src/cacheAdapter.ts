import { redisService } from './redisService';
import { EventEmitter } from 'events';

export interface CachedOptionChain {
  symbol: string;
  data: any;
  timestamp: Date;
  source: 'redis' | 'database' | 'api';
}

export interface CachedMarketData {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest?: number;
  timestamp: Date;
  source: 'redis' | 'database' | 'api';
}

export class CacheAdapter extends EventEmitter {
  private fallbackCache = new Map<string, any>();
  private isRedisEnabled = false;

  async initialize(): Promise<boolean> {
    try {
      // Try to initialize Redis
      this.isRedisEnabled = await redisService.initialize();
      
      if (this.isRedisEnabled) {
        console.log('✅ Cache Adapter: Redis enabled for high-performance caching');
      } else {
        console.log('⚠️ Cache Adapter: Using in-memory fallback (Redis unavailable)');
      }
      
      return true;
    } catch (error) {
      console.error('Cache Adapter initialization error:', error);
      this.isRedisEnabled = false;
      return true; // Still functional with fallback
    }
  }

  // Option Chain Caching with 10-second TTL
  async cacheOptionChain(symbol: string, data: any): Promise<boolean> {
    try {
      const cacheData: CachedOptionChain = {
        symbol,
        data,
        timestamp: new Date(),
        source: 'api'
      };

      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.cacheOptionChain(symbol, data);
      } else {
        // Fallback to in-memory cache
        this.fallbackCache.set(`option_chain:${symbol}`, {
          ...cacheData,
          expiry: Date.now() + 10000 // 10 seconds
        });
        return true;
      }
    } catch (error) {
      console.error('Error caching option chain:', error);
      return false;
    }
  }

  async getOptionChain(symbol: string): Promise<CachedOptionChain | null> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.getOptionChain(symbol);
      } else {
        // Fallback to in-memory cache
        const key = `option_chain:${symbol}`;
        const cached = this.fallbackCache.get(key);
        
        if (cached && cached.expiry > Date.now()) {
          return {
            symbol: cached.symbol,
            data: cached.data,
            timestamp: cached.timestamp,
            source: 'redis'
          };
        }
        
        // Clean expired cache
        if (cached && cached.expiry <= Date.now()) {
          this.fallbackCache.delete(key);
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error retrieving option chain from cache:', error);
      return null;
    }
  }

  // Market Data Caching with 5-second TTL
  async cacheMarketData(symbol: string, marketData: CachedMarketData): Promise<boolean> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        const key = `market_data:${symbol}`;
        const redis = (redisService as any).redis;
        if (redis) {
          await redis.setex(key, 5, JSON.stringify({
            ...marketData,
            timestamp: new Date()
          }));
          return true;
        }
      }
      
      // Fallback to in-memory cache
      this.fallbackCache.set(`market_data:${symbol}`, {
        ...marketData,
        expiry: Date.now() + 5000 // 5 seconds
      });
      return true;
    } catch (error) {
      console.error('Error caching market data:', error);
      return false;
    }
  }

  async getMarketData(symbol: string): Promise<CachedMarketData | null> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        const key = `market_data:${symbol}`;
        const redis = (redisService as any).redis;
        if (redis) {
          const cached = await redis.get(key);
          if (cached) {
            return JSON.parse(cached);
          }
        }
      }
      
      // Fallback to in-memory cache
      const key = `market_data:${symbol}`;
      const cached = this.fallbackCache.get(key);
      
      if (cached && cached.expiry > Date.now()) {
        return {
          symbol: cached.symbol,
          ltp: cached.ltp,
          change: cached.change,
          changePercent: cached.changePercent,
          volume: cached.volume,
          openInterest: cached.openInterest,
          timestamp: cached.timestamp,
          source: 'redis'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving market data from cache:', error);
      return null;
    }
  }

  // OI Delta Caching with 30-second TTL
  async cacheOIDelta(symbol: string, strike: number, expiry: string, delta: number, changePercent: number): Promise<boolean> {
    try {
      const oiData = {
        symbol,
        strike,
        expiry,
        callOIDelta: delta,
        putOIDelta: 0,
        timestamp: new Date(),
        changePercent
      };

      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.cacheOIDelta(symbol, strike, expiry, {
          callOIDelta: delta,
          putOIDelta: 0,
          timestamp: new Date(),
          changePercent
        });
      } else {
        // Fallback to in-memory cache
        const key = `oi_delta:${symbol}:${strike}:${expiry}`;
        this.fallbackCache.set(key, {
          ...oiData,
          expiry: Date.now() + 30000 // 30 seconds
        });
        return true;
      }
    } catch (error) {
      console.error('Error caching OI delta:', error);
      return false;
    }
  }

  async getOIDelta(symbol: string, strike?: number, expiry?: string): Promise<any> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.getOIDelta(symbol, strike, expiry);
      } else {
        // Fallback to in-memory cache
        if (strike && expiry) {
          const key = `oi_delta:${symbol}:${strike}:${expiry}`;
          const cached = this.fallbackCache.get(key);
          
          if (cached && cached.expiry > Date.now()) {
            return cached;
          }
        } else {
          // Return all deltas for symbol
          const deltas: any[] = [];
          for (const [key, value] of this.fallbackCache.entries()) {
            if (key.startsWith(`oi_delta:${symbol}:`) && value.expiry > Date.now()) {
              deltas.push(value);
            }
          }
          return deltas;
        }
        return null;
      }
    } catch (error) {
      console.error('Error retrieving OI delta from cache:', error);
      return null;
    }
  }

  // WebSocket Snapshot Caching with 10-second TTL
  async cacheSnapshot(marketData: any, optionChains: any[], patterns: any[], alerts: any[]): Promise<boolean> {
    try {
      const snapshot = {
        marketData,
        optionChains,
        patterns,
        alerts,
        timestamp: new Date()
      };

      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.cacheSnapshot(snapshot);
      } else {
        // Fallback to in-memory cache
        this.fallbackCache.set('websocket_snapshot', {
          ...snapshot,
          expiry: Date.now() + 10000 // 10 seconds
        });
        return true;
      }
    } catch (error) {
      console.error('Error caching snapshot:', error);
      return false;
    }
  }

  async getSnapshot(): Promise<any> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.getSnapshot();
      } else {
        // Fallback to in-memory cache
        const cached = this.fallbackCache.get('websocket_snapshot');
        
        if (cached && cached.expiry > Date.now()) {
          return {
            marketData: cached.marketData,
            optionChains: cached.optionChains,
            patterns: cached.patterns,
            alerts: cached.alerts,
            timestamp: cached.timestamp
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Error retrieving snapshot from cache:', error);
      return null;
    }
  }

  // Pattern Analysis Caching with 60-second TTL
  async cachePatterns(symbol: string, patterns: any[]): Promise<boolean> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.cachePatternAnalysis(symbol, patterns);
      } else {
        // Fallback to in-memory cache
        this.fallbackCache.set(`patterns:${symbol}`, {
          patterns,
          timestamp: new Date(),
          expiry: Date.now() + 60000 // 60 seconds
        });
        return true;
      }
    } catch (error) {
      console.error('Error caching patterns:', error);
      return false;
    }
  }

  async getPatterns(symbol: string): Promise<any[] | null> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.getPatternAnalysis(symbol);
      } else {
        // Fallback to in-memory cache
        const cached = this.fallbackCache.get(`patterns:${symbol}`);
        
        if (cached && cached.expiry > Date.now()) {
          return cached.patterns;
        }
        return null;
      }
    } catch (error) {
      console.error('Error retrieving patterns from cache:', error);
      return null;
    }
  }

  // Cache Invalidation
  async invalidateOptionChain(symbol: string): Promise<boolean> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.invalidateOptionChain(symbol);
      } else {
        // Fallback to in-memory cache
        this.fallbackCache.delete(`option_chain:${symbol}`);
        return true;
      }
    } catch (error) {
      console.error('Error invalidating option chain cache:', error);
      return false;
    }
  }

  async invalidateMarketData(symbol: string): Promise<boolean> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        const key = `market_data:${symbol}`;
        const redis = (redisService as any).redis;
        if (redis) {
          await redis.del(key);
          return true;
        }
      }
      
      // Fallback to in-memory cache
      this.fallbackCache.delete(`market_data:${symbol}`);
      return true;
    } catch (error) {
      console.error('Error invalidating market data cache:', error);
      return false;
    }
  }

  async invalidateSnapshot(): Promise<boolean> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        return await redisService.invalidateSnapshot();
      } else {
        // Fallback to in-memory cache
        this.fallbackCache.delete('websocket_snapshot');
        return true;
      }
    } catch (error) {
      console.error('Error invalidating snapshot cache:', error);
      return false;
    }
  }

  // Cache Statistics and Health
  async getCacheStats(): Promise<{
    enabled: boolean;
    backend: 'redis' | 'memory';
    keys: number;
    memory?: any;
    hitRate?: number;
  }> {
    try {
      if (this.isRedisEnabled && redisService.isReady()) {
        const redisStats = await redisService.getCacheStats();
        return {
          enabled: true,
          backend: 'redis',
          keys: redisStats.keys,
          memory: redisStats.memory,
          hitRate: redisStats.hitRate
        };
      } else {
        // Fallback stats
        const validKeys = Array.from(this.fallbackCache.entries())
          .filter(([key, value]) => value.expiry > Date.now()).length;
          
        return {
          enabled: true,
          backend: 'memory',
          keys: validKeys,
          memory: { used_memory_human: `${this.fallbackCache.size * 1024} bytes` }
        };
      }
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        enabled: false,
        backend: 'memory',
        keys: 0
      };
    }
  }

  // Cleanup expired in-memory cache entries
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.fallbackCache.entries()) {
      if (value.expiry && value.expiry <= now) {
        this.fallbackCache.delete(key);
      }
    }
  }

  // Health check
  isHealthy(): boolean {
    if (this.isRedisEnabled) {
      return redisService.isReady();
    }
    return true; // Memory cache is always available
  }

  getBackend(): 'redis' | 'memory' {
    return this.isRedisEnabled && redisService.isReady() ? 'redis' : 'memory';
  }

  // Periodic cleanup
  startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 30000); // Clean every 30 seconds
  }

  async disconnect(): Promise<void> {
    if (this.isRedisEnabled) {
      await redisService.disconnect();
    }
    this.fallbackCache.clear();
  }
}

// Export singleton instance
export const cacheAdapter = new CacheAdapter();