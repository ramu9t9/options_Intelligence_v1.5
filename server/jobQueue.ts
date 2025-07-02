import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { EventEmitter } from 'events';
import { redisService } from './redisService';
import { PatternDetector } from './patternDetector';
import { centralDataBroadcaster } from './centralDataBroadcaster';
import { db } from './db';
import { priceData, intradayOptionOI, oiDeltaLog } from '@shared/schema';
import { eq, and, gte } from 'drizzle-orm';

export interface JobData {
  type: 'PATTERN_ANALYSIS' | 'OI_CALCULATION' | 'CACHE_REFRESH' | 'DATA_COLLECTION' | 'ALERT_CHECK';
  symbol?: string;
  data?: any;
  priority?: number;
  timestamp: Date;
}

export interface PatternAnalysisJob extends JobData {
  type: 'PATTERN_ANALYSIS';
  symbol: string;
  optionChainData: any;
  marketData: any;
}

export interface OICalculationJob extends JobData {
  type: 'OI_CALCULATION';
  symbol: string;
  strike: number;
  expiry: string;
  currentOI: number;
  previousOI: number;
}

export interface CacheRefreshJob extends JobData {
  type: 'CACHE_REFRESH';
  cacheKeys: string[];
  invalidatePattern?: string;
}

export interface DataCollectionJob extends JobData {
  type: 'DATA_COLLECTION';
  symbols: string[];
  dataType: 'MARKET_DATA' | 'OPTION_CHAIN' | 'HISTORICAL';
}

export interface AlertCheckJob extends JobData {
  type: 'ALERT_CHECK';
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  patterns?: any[];
}

export class JobQueueService extends EventEmitter {
  private patternQueue: Queue | null = null;
  private oiQueue: Queue | null = null;
  private cacheQueue: Queue | null = null;
  private dataQueue: Queue | null = null;
  private alertQueue: Queue | null = null;
  
  private patternWorker: Worker | null = null;
  private oiWorker: Worker | null = null;
  private cacheWorker: Worker | null = null;
  private dataWorker: Worker | null = null;
  private alertWorker: Worker | null = null;
  
  private queueEvents: QueueEvents[] = [];
  private isInitialized = false;
  private jobStats = {
    processed: 0,
    failed: 0,
    active: 0,
    waiting: 0
  };

  async initialize(): Promise<boolean> {
    try {
      // Ensure Redis is connected
      if (!redisService.isReady()) {
        await redisService.initialize();
      }

      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0
      };

      // Initialize queues with different priorities
      this.patternQueue = new Queue('pattern-analysis', { 
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      this.oiQueue = new Queue('oi-calculation', { 
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 50,
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 1000
          }
        }
      });

      this.cacheQueue = new Queue('cache-refresh', { 
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2
        }
      });

      this.dataQueue = new Queue('data-collection', { 
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          }
        }
      });

      this.alertQueue = new Queue('alert-check', { 
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 50,
          attempts: 2
        }
      });

      // Initialize workers
      await this.initializeWorkers(redisConfig);
      
      // Initialize queue events for monitoring
      this.initializeQueueEvents(redisConfig);

      this.isInitialized = true;
      console.log('✅ Job Queue Service initialized with Redis backend');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Job Queue Service:', error);
      return false;
    }
  }

  private async initializeWorkers(redisConfig: any): Promise<void> {
    // Pattern Analysis Worker
    this.patternWorker = new Worker('pattern-analysis', async (job: Job<PatternAnalysisJob>) => {
      return await this.processPatternAnalysis(job.data);
    }, { 
      connection: redisConfig,
      concurrency: 5
    });

    // OI Calculation Worker
    this.oiWorker = new Worker('oi-calculation', async (job: Job<OICalculationJob>) => {
      return await this.processOICalculation(job.data);
    }, { 
      connection: redisConfig,
      concurrency: 10
    });

    // Cache Refresh Worker
    this.cacheWorker = new Worker('cache-refresh', async (job: Job<CacheRefreshJob>) => {
      return await this.processCacheRefresh(job.data);
    }, { 
      connection: redisConfig,
      concurrency: 3
    });

    // Data Collection Worker
    this.dataWorker = new Worker('data-collection', async (job: Job<DataCollectionJob>) => {
      return await this.processDataCollection(job.data);
    }, { 
      connection: redisConfig,
      concurrency: 2
    });

    // Alert Check Worker
    this.alertWorker = new Worker('alert-check', async (job: Job<AlertCheckJob>) => {
      return await this.processAlertCheck(job.data);
    }, { 
      connection: redisConfig,
      concurrency: 8
    });

    // Add error handling for all workers
    const workers = [this.patternWorker, this.oiWorker, this.cacheWorker, this.dataWorker, this.alertWorker];
    workers.forEach(worker => {
      worker.on('completed', (job) => {
        this.jobStats.processed++;
        console.log(`✅ Job ${job.id} completed in queue ${job.queueName}`);
      });

      worker.on('failed', (job, err) => {
        this.jobStats.failed++;
        console.error(`❌ Job ${job?.id} failed in queue ${job?.queueName}:`, err.message);
      });
    });
  }

  private initializeQueueEvents(redisConfig: any): void {
    const queues = [this.patternQueue, this.oiQueue, this.cacheQueue, this.dataQueue, this.alertQueue];
    
    queues.forEach(queue => {
      if (queue) {
        const queueEvents = new QueueEvents(queue.name, { connection: redisConfig });
        this.queueEvents.push(queueEvents);

        queueEvents.on('waiting', () => this.jobStats.waiting++);
        queueEvents.on('active', () => {
          this.jobStats.active++;
          this.jobStats.waiting = Math.max(0, this.jobStats.waiting - 1);
        });
        queueEvents.on('completed', () => {
          this.jobStats.active = Math.max(0, this.jobStats.active - 1);
        });
        queueEvents.on('failed', () => {
          this.jobStats.active = Math.max(0, this.jobStats.active - 1);
        });
      }
    });
  }

  // Job Processing Methods
  private async processPatternAnalysis(data: PatternAnalysisJob): Promise<any> {
    try {
      console.log(`🔍 Processing pattern analysis for ${data.symbol}`);
      
      // Check cache first
      const cachedPatterns = await redisService.getPatternAnalysis(data.symbol);
      if (cachedPatterns) {
        console.log(`📋 Using cached patterns for ${data.symbol}`);
        return { patterns: cachedPatterns, cached: true };
      }

      // Perform pattern analysis
      const patterns = await patternDetector.analyzePatterns(data.symbol, data.optionChainData);
      
      // Cache results
      await redisService.cachePatternAnalysis(data.symbol, patterns);
      
      // Invalidate option chain cache to ensure fresh data on next request
      await redisService.invalidateOptionChain(data.symbol);
      
      // Broadcast updated patterns
      await centralDataBroadcaster.broadcastPatterns(data.symbol, patterns);
      
      return { patterns, cached: false };
    } catch (error) {
      console.error(`Error processing pattern analysis for ${data.symbol}:`, error);
      throw error;
    }
  }

  private async processOICalculation(data: OICalculationJob): Promise<any> {
    try {
      console.log(`📊 Processing OI calculation for ${data.symbol} ${data.strike} ${data.expiry}`);
      
      const oiDelta = data.currentOI - data.previousOI;
      const changePercent = data.previousOI > 0 ? (oiDelta / data.previousOI) * 100 : 0;
      
      // Store OI delta in database
      await db.insert(oiDeltaLog).values({
        symbol: data.symbol,
        strike: data.strike,
        expiry: data.expiry,
        previousOi: data.previousOI,
        currentOi: data.currentOI,
        delta: oiDelta,
        changePercent,
        triggerReason: 'job_queue_calculation',
        timestamp: new Date()
      });

      // Cache OI delta
      await redisService.cacheOIDelta(data.symbol, data.strike, data.expiry, {
        callOIDelta: oiDelta,
        putOIDelta: 0, // Will be calculated separately for puts
        timestamp: new Date(),
        changePercent
      });

      // Invalidate related caches
      await redisService.invalidateOIDelta(data.symbol);
      await redisService.invalidateSnapshot();

      return { 
        oiDelta, 
        changePercent,
        symbol: data.symbol,
        strike: data.strike,
        expiry: data.expiry
      };
    } catch (error) {
      console.error(`Error processing OI calculation:`, error);
      throw error;
    }
  }

  private async processCacheRefresh(data: CacheRefreshJob): Promise<any> {
    try {
      console.log(`🗄️ Processing cache refresh for keys: ${data.cacheKeys.join(', ')}`);
      
      if (data.invalidatePattern) {
        // Invalidate pattern-based cache keys
        const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
        for (const symbol of symbols) {
          await redisService.invalidateOptionChain(symbol);
          await redisService.invalidateOIDelta(symbol);
        }
      }

      // Invalidate specific cache keys
      for (const key of data.cacheKeys) {
        if (key === 'snapshot') {
          await redisService.invalidateSnapshot();
        } else if (key.startsWith('option_chain:')) {
          const symbol = key.split(':')[1];
          await redisService.invalidateOptionChain(symbol);
        } else if (key.startsWith('oi_delta:')) {
          const symbol = key.split(':')[1];
          await redisService.invalidateOIDelta(symbol);
        }
      }

      return { invalidatedKeys: data.cacheKeys };
    } catch (error) {
      console.error('Error processing cache refresh:', error);
      throw error;
    }
  }

  private async processDataCollection(data: DataCollectionJob): Promise<any> {
    try {
      console.log(`📡 Processing data collection for ${data.symbols.join(', ')}`);
      
      const results: any[] = [];
      
      for (const symbol of data.symbols) {
        try {
          // Collect fresh market data
          const marketData = await this.fetchMarketData(symbol);
          
          if (marketData) {
            // Store in database
            await db.insert(realtimeData).values({
              symbol,
              ltp: marketData.ltp,
              change: marketData.change,
              changePercent: marketData.changePercent,
              volume: marketData.volume,
              openInterest: marketData.openInterest,
              timestamp: new Date(),
              source: 'job_queue'
            });

            // Invalidate caches to ensure fresh data
            await redisService.invalidateOptionChain(symbol);
            
            results.push({ symbol, status: 'success', data: marketData });
          } else {
            results.push({ symbol, status: 'no_data' });
          }
        } catch (error) {
          console.error(`Error collecting data for ${symbol}:`, error);
          results.push({ symbol, status: 'error', error: error.message });
        }
      }

      return { results, timestamp: new Date() };
    } catch (error) {
      console.error('Error processing data collection:', error);
      throw error;
    }
  }

  private async processAlertCheck(data: AlertCheckJob): Promise<any> {
    try {
      console.log(`🚨 Processing alert check for ${data.symbol}`);
      
      // Check for price-based alerts
      const priceChange = data.currentPrice - data.previousPrice;
      const priceChangePercent = data.previousPrice > 0 ? (priceChange / data.previousPrice) * 100 : 0;
      
      let triggeredAlerts = 0;
      
      // Check significant price movements (>2%)
      if (Math.abs(priceChangePercent) > 2) {
        triggeredAlerts++;
        console.log(`⚡ Significant price movement detected for ${data.symbol}: ${priceChangePercent.toFixed(2)}%`);
      }
      
      // Check pattern-based alerts
      if (data.patterns && data.patterns.length > 0) {
        const highConfidencePatterns = data.patterns.filter((p: any) => p.confidence > 0.7);
        if (highConfidencePatterns.length > 0) {
          triggeredAlerts += highConfidencePatterns.length;
          console.log(`🎯 High confidence patterns detected for ${data.symbol}: ${highConfidencePatterns.length}`);
        }
      }

      // Broadcast alerts if any were triggered
      if (triggeredAlerts > 0) {
        await centralDataBroadcaster.broadcastAlert({
          symbol: data.symbol,
          type: 'PRICE_MOVEMENT',
          severity: Math.abs(priceChangePercent) > 5 ? 'HIGH' : 'MEDIUM',
          message: `${data.symbol}: ${priceChange > 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`,
          timestamp: new Date()
        });
      }

      return { 
        symbol: data.symbol,
        triggeredAlerts,
        priceChangePercent,
        patterns: data.patterns?.length || 0
      };
    } catch (error) {
      console.error('Error processing alert check:', error);
      throw error;
    }
  }

  private async fetchMarketData(symbol: string): Promise<any> {
    // Mock implementation - in production this would call actual data providers
    const basePrice = symbol === 'NIFTY' ? 24500 : symbol === 'BANKNIFTY' ? 52000 : 24000;
    const change = (Math.random() - 0.5) * 500;
    
    return {
      ltp: basePrice + change,
      change,
      changePercent: (change / basePrice) * 100,
      volume: Math.floor(Math.random() * 1000000),
      openInterest: Math.floor(Math.random() * 50000)
    };
  }

  // Public Job Addition Methods
  async addPatternAnalysisJob(symbol: string, optionChainData: any, marketData: any, priority: number = 1): Promise<string> {
    if (!this.patternQueue) throw new Error('Pattern queue not initialized');
    
    const job = await this.patternQueue.add('analyze-patterns', {
      type: 'PATTERN_ANALYSIS',
      symbol,
      optionChainData,
      marketData,
      priority,
      timestamp: new Date()
    } as PatternAnalysisJob, {
      priority: priority * 10
    });

    return job.id!;
  }

  async addOICalculationJob(symbol: string, strike: number, expiry: string, currentOI: number, previousOI: number): Promise<string> {
    if (!this.oiQueue) throw new Error('OI queue not initialized');
    
    const job = await this.oiQueue.add('calculate-oi', {
      type: 'OI_CALCULATION',
      symbol,
      strike,
      expiry,
      currentOI,
      previousOI,
      timestamp: new Date()
    } as OICalculationJob);

    return job.id!;
  }

  async addCacheRefreshJob(cacheKeys: string[], invalidatePattern?: string): Promise<string> {
    if (!this.cacheQueue) throw new Error('Cache queue not initialized');
    
    const job = await this.cacheQueue.add('refresh-cache', {
      type: 'CACHE_REFRESH',
      cacheKeys,
      invalidatePattern,
      timestamp: new Date()
    } as CacheRefreshJob);

    return job.id!;
  }

  async addDataCollectionJob(symbols: string[], dataType: 'MARKET_DATA' | 'OPTION_CHAIN' | 'HISTORICAL' = 'MARKET_DATA'): Promise<string> {
    if (!this.dataQueue) throw new Error('Data queue not initialized');
    
    const job = await this.dataQueue.add('collect-data', {
      type: 'DATA_COLLECTION',
      symbols,
      dataType,
      timestamp: new Date()
    } as DataCollectionJob);

    return job.id!;
  }

  async addAlertCheckJob(symbol: string, currentPrice: number, previousPrice: number, patterns?: any[]): Promise<string> {
    if (!this.alertQueue) throw new Error('Alert queue not initialized');
    
    const job = await this.alertQueue.add('check-alerts', {
      type: 'ALERT_CHECK',
      symbol,
      currentPrice,
      previousPrice,
      patterns,
      timestamp: new Date()
    } as AlertCheckJob);

    return job.id!;
  }

  // Queue Management Methods
  async getQueueStats(): Promise<any> {
    if (!this.isInitialized) return null;
    
    const stats = {
      ...this.jobStats,
      queues: {} as any
    };

    const queues = [
      { name: 'pattern-analysis', queue: this.patternQueue },
      { name: 'oi-calculation', queue: this.oiQueue },
      { name: 'cache-refresh', queue: this.cacheQueue },
      { name: 'data-collection', queue: this.dataQueue },
      { name: 'alert-check', queue: this.alertQueue }
    ];

    for (const { name, queue } of queues) {
      if (queue) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();

        stats.queues[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        };
      }
    }

    return stats;
  }

  async pauseAllQueues(): Promise<void> {
    const queues = [this.patternQueue, this.oiQueue, this.cacheQueue, this.dataQueue, this.alertQueue];
    await Promise.all(queues.filter(q => q).map(q => q!.pause()));
    console.log('⏸️ All job queues paused');
  }

  async resumeAllQueues(): Promise<void> {
    const queues = [this.patternQueue, this.oiQueue, this.cacheQueue, this.dataQueue, this.alertQueue];
    await Promise.all(queues.filter(q => q).map(q => q!.resume()));
    console.log('▶️ All job queues resumed');
  }

  async closeQueues(): Promise<void> {
    const workers = [this.patternWorker, this.oiWorker, this.cacheWorker, this.dataWorker, this.alertWorker];
    const queues = [this.patternQueue, this.oiQueue, this.cacheQueue, this.dataQueue, this.alertQueue];
    
    // Close workers first
    await Promise.all(workers.filter(w => w).map(w => w!.close()));
    
    // Close queues
    await Promise.all(queues.filter(q => q).map(q => q!.close()));
    
    // Close queue events
    await Promise.all(this.queueEvents.map(qe => qe.close()));
    
    console.log('📴 All job queues and workers closed');
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getJobStats(): any {
    return { ...this.jobStats };
  }
}

// Export singleton instance
export const jobQueueService = new JobQueueService();