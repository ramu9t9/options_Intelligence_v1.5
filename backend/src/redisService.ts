import Redis from 'ioredis';
import { EventEmitter } from 'events';

export interface CacheConfig {
  optionChainTTL: number; // 5-15 seconds for option chain data
  oiDeltaTTL: number; // 30 seconds for OI delta calculations
  snapshotTTL: number; // 10 seconds for WebSocket broadcast data
  patternTTL: number; // 60 seconds for pattern analysis results
}

export interface OptionChainCache {
  symbol: string;
  data: any;
  timestamp: Date;
  strikes: number[];
  expiryDates: string[];
}

export interface OIDeltaCache {
  symbol: string;
  strike: number;
  expiry: string;
  callOIDelta: number;
  putOIDelta: number;
  timestamp: Date;
  changePercent: number;
}

export interface SnapshotCache {
  marketData: any;
  optionChains: OptionChainCache[];
  patterns: any[];
  alerts: any[];
  timestamp: Date;
}

export class RedisService extends EventEmitter {
  private redis: Redis | null = null;
  private isConnected = false;
  private config: CacheConfig = {
    optionChainTTL: 10, // 10 seconds default
    oiDeltaTTL: 30,
    snapshotTTL: 10,
    patternTTL: 60
  };

  constructor(config?: Partial<CacheConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  async initialize(redisUrl?: string): Promise<boolean> {
    try {
      // Use environment Redis URL or default to localhost
      const connectionString = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(connectionString, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        commandTimeout: 5000
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
        this.emit('connected');
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
        // Don't emit error to prevent crashes, just log and continue with fallback
        console.log('⚠️ Redis unavailable, falling back to in-memory operations');
      });

      this.redis.on('close', () => {
        console.log('📴 Redis connection closed');
        this.isConnected = false;
        this.emit('disconnected');
      });

      // Test connection
      await this.redis.connect();
      await this.redis.ping();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Option Chain Caching (5-15 second TTL)
  async cacheOptionChain(symbol: string, data: any): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      const cacheData: OptionChainCache = {
        symbol,
        data,
        timestamp: new Date(),
        strikes: data.strikes || [],
        expiryDates: data.expiryDates || []
      };

      const key = `option_chain:${symbol}`;
      await this.redis.setex(key, this.config.optionChainTTL, JSON.stringify(cacheData));
      
      // Also cache individual strike data for faster lookups
      if (data.optionChain) {
        for (const option of data.optionChain) {
          const strikeKey = `option_strike:${symbol}:${option.strike}`;
          await this.redis.setex(strikeKey, this.config.optionChainTTL, JSON.stringify(option));
        }
      }

      return true;
    } catch (error) {
      console.error('Error caching option chain:', error);
      return false;
    }
  }

  async getOptionChain(symbol: string): Promise<OptionChainCache | null> {
    if (!this.isConnected || !this.redis) return null;
    
    try {
      const key = `option_chain:${symbol}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving option chain from cache:', error);
      return null;
    }
  }

  // OI Delta Caching (30 second TTL)
  async cacheOIDelta(symbol: string, strike: number, expiry: string, data: Omit<OIDeltaCache, 'symbol' | 'strike' | 'expiry'>): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      const cacheData: OIDeltaCache = {
        symbol,
        strike,
        expiry,
        ...data,
        timestamp: new Date()
      };

      const key = `oi_delta:${symbol}:${strike}:${expiry}`;
      await this.redis.setex(key, this.config.oiDeltaTTL, JSON.stringify(cacheData));
      
      // Cache aggregated OI deltas for symbol
      const symbolKey = `oi_delta_summary:${symbol}`;
      const existing = await this.redis.get(symbolKey);
      let summary = existing ? JSON.parse(existing) : { symbol, deltas: [], timestamp: new Date() };
      
      // Update or add delta entry
      const existingIndex = summary.deltas.findIndex((d: any) => d.strike === strike && d.expiry === expiry);
      if (existingIndex >= 0) {
        summary.deltas[existingIndex] = cacheData;
      } else {
        summary.deltas.push(cacheData);
      }
      
      summary.timestamp = new Date();
      await this.redis.setex(symbolKey, this.config.oiDeltaTTL, JSON.stringify(summary));

      return true;
    } catch (error) {
      console.error('Error caching OI delta:', error);
      return false;
    }
  }

  async getOIDelta(symbol: string, strike?: number, expiry?: string): Promise<OIDeltaCache | OIDeltaCache[] | null> {
    if (!this.isConnected || !this.redis) return null;
    
    try {
      if (strike && expiry) {
        // Get specific strike/expiry delta
        const key = `oi_delta:${symbol}:${strike}:${expiry}`;
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
      } else {
        // Get all deltas for symbol
        const symbolKey = `oi_delta_summary:${symbol}`;
        const cached = await this.redis.get(symbolKey);
        if (cached) {
          const summary = JSON.parse(cached);
          return summary.deltas;
        }
        return null;
      }
    } catch (error) {
      console.error('Error retrieving OI delta from cache:', error);
      return null;
    }
  }

  // WebSocket Snapshot Caching (10 second TTL)
  async cacheSnapshot(data: Omit<SnapshotCache, 'timestamp'>): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      const cacheData: SnapshotCache = {
        ...data,
        timestamp: new Date()
      };

      const key = 'websocket_snapshot';
      await this.redis.setex(key, this.config.snapshotTTL, JSON.stringify(cacheData));
      
      // Cache individual components for faster partial updates
      await this.redis.setex('snapshot:market_data', this.config.snapshotTTL, JSON.stringify(data.marketData));
      await this.redis.setex('snapshot:option_chains', this.config.snapshotTTL, JSON.stringify(data.optionChains));
      await this.redis.setex('snapshot:patterns', this.config.snapshotTTL, JSON.stringify(data.patterns));
      await this.redis.setex('snapshot:alerts', this.config.snapshotTTL, JSON.stringify(data.alerts));

      return true;
    } catch (error) {
      console.error('Error caching snapshot:', error);
      return false;
    }
  }

  async getSnapshot(): Promise<SnapshotCache | null> {
    if (!this.isConnected || !this.redis) return null;
    
    try {
      const key = 'websocket_snapshot';
      const cached = await this.redis.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving snapshot from cache:', error);
      return null;
    }
  }

  // Pattern Analysis Caching (60 second TTL)
  async cachePatternAnalysis(symbol: string, patterns: any[]): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      const cacheData = {
        symbol,
        patterns,
        timestamp: new Date()
      };

      const key = `patterns:${symbol}`;
      await this.redis.setex(key, this.config.patternTTL, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Error caching pattern analysis:', error);
      return false;
    }
  }

  async getPatternAnalysis(symbol: string): Promise<any[] | null> {
    if (!this.isConnected || !this.redis) return null;
    
    try {
      const key = `patterns:${symbol}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const data = JSON.parse(cached);
        return data.patterns;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving pattern analysis from cache:', error);
      return null;
    }
  }

  // Cache Invalidation Methods
  async invalidateOptionChain(symbol: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      const keys = await this.redis.keys(`option_chain:${symbol}*`);
      const strikeKeys = await this.redis.keys(`option_strike:${symbol}:*`);
      
      if (keys.length > 0 || strikeKeys.length > 0) {
        await this.redis.del(...keys, ...strikeKeys);
      }
      return true;
    } catch (error) {
      console.error('Error invalidating option chain cache:', error);
      return false;
    }
  }

  async invalidateOIDelta(symbol: string): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      const keys = await this.redis.keys(`oi_delta:${symbol}:*`);
      const summaryKey = `oi_delta_summary:${symbol}`;
      
      if (keys.length > 0) {
        await this.redis.del(...keys, summaryKey);
      }
      return true;
    } catch (error) {
      console.error('Error invalidating OI delta cache:', error);
      return false;
    }
  }

  async invalidateSnapshot(): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      const keys = ['websocket_snapshot', 'snapshot:market_data', 'snapshot:option_chains', 'snapshot:patterns', 'snapshot:alerts'];
      await this.redis.del(...keys);
      return true;
    } catch (error) {
      console.error('Error invalidating snapshot cache:', error);
      return false;
    }
  }

  async invalidateAll(): Promise<boolean> {
    if (!this.isConnected || !this.redis) return false;
    
    try {
      await this.redis.flushdb();
      console.log('✅ All Redis cache invalidated');
      return true;
    } catch (error) {
      console.error('Error invalidating all cache:', error);
      return false;
    }
  }

  // Cache Statistics
  async getCacheStats(): Promise<{
    memory: any;
    keys: number;
    connections: number;
    hitRate?: number;
    isConnected: boolean;
  }> {
    if (!this.isConnected || !this.redis) {
      return { memory: {}, keys: 0, connections: 0, isConnected: false };
    }
    
    try {
      const info = await this.redis.info('memory');
      const dbsize = await this.redis.dbsize();
      
      const memoryStats = this.parseRedisInfo(info);
      const connections = 1; // Current connection

      return {
        memory: memoryStats,
        keys: dbsize,
        connections,
        isConnected: this.isConnected
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { memory: {}, keys: 0, connections: 0, isConnected: false };
    }
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const stats: any = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return stats;
  }

  // Cleanup and connection management
  isReady(): boolean {
    return this.isConnected && this.redis !== null;
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
      console.log('📴 Redis disconnected');
    }
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Redis cache config updated:', this.config);
  }
}

// Export singleton instance
export const redisService = new RedisService({
  optionChainTTL: 10, // 10 seconds for option chain data
  oiDeltaTTL: 30,     // 30 seconds for OI deltas
  snapshotTTL: 10,    // 10 seconds for WebSocket snapshots
  patternTTL: 60      // 60 seconds for pattern analysis
});