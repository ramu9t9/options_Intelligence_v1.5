import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { EventEmitter } from 'events';

// Redis connection configuration
const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// Job data interfaces
export interface LiveDataJobData {
  symbols: string[];
  timestamp: Date;
  source: 'angel-one' | 'nse' | 'yahoo' | 'mock';
}

export interface SnapshotJobData {
  symbols: string[];
  timestamp: Date;
  snapshotType: 'intraday' | 'daily' | 'end-of-day';
}

export interface PatternAnalysisJobData {
  symbols: string[];
  timestamp: Date;
  analysisType: 'real-time' | 'historical';
}

export interface CacheRefreshJobData {
  cacheType: 'option-chains' | 'market-data' | 'oi-deltas' | 'patterns';
  symbols?: string[];
  forceRefresh?: boolean;
}

export class QueueManager extends EventEmitter {
  private liveDataQueue: Queue<LiveDataJobData> | null = null;
  private snapshotQueue: Queue<SnapshotJobData> | null = null;
  private patternAnalysisQueue: Queue<PatternAnalysisJobData> | null = null;
  private cacheRefreshQueue: Queue<CacheRefreshJobData> | null = null;
  
  private liveDataWorker: Worker<LiveDataJobData> | null = null;
  private snapshotWorker: Worker<SnapshotJobData> | null = null;
  private patternWorker: Worker<PatternAnalysisJobData> | null = null;
  private cacheWorker: Worker<CacheRefreshJobData> | null = null;
  
  private bullBoard: any;
  private isRedisAvailable = false;
  private fallbackJobs: Map<string, any> = new Map();
  private fallbackTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeQueues();
  }

  private async initializeQueues(): Promise<void> {
    try {
      // Initialize queues with Redis
      this.liveDataQueue = new Queue<LiveDataJobData>('live-data', {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      this.snapshotQueue = new Queue<SnapshotJobData>('snapshot', {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });

      this.patternAnalysisQueue = new Queue<PatternAnalysisJobData>('pattern-analysis', {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 50,
          attempts: 2,
          delay: 1000,
        },
      });

      this.cacheRefreshQueue = new Queue<CacheRefreshJobData>('cache-refresh', {
        connection: redisConnection,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 1,
        },
      });

      this.isRedisAvailable = true;
      console.log('✅ BullMQ queues initialized with Redis');
      this.emit('redis:connected');
      
      this.initializeWorkers();
      this.setupBullBoard();
      this.startScheduledJobs();
    } catch (error) {
      console.log('❌ Redis unavailable, using in-memory fallback for jobs');
      this.isRedisAvailable = false;
      this.setupFallbackSystem();
      this.emit('redis:disconnected');
    }
  }

  private setupFallbackSystem(): void {
    console.log('⚠️ Setting up in-memory job processing fallback');
    
    // Start periodic live data collection
    this.startFallbackTimer('live-data', () => {
      this.emit('job:live-data', {
        symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
        timestamp: new Date(),
        source: 'angel-one'
      });
    }, 15000); // 15 seconds

    // Start periodic snapshot collection
    this.startFallbackTimer('snapshot', () => {
      this.emit('job:snapshot', {
        symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
        timestamp: new Date(),
        snapshotType: 'intraday'
      });
    }, 15 * 60 * 1000); // 15 minutes

    // Start periodic pattern analysis
    this.startFallbackTimer('pattern-analysis', () => {
      this.emit('job:pattern-analysis', {
        symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
        timestamp: new Date(),
        analysisType: 'real-time'
      });
    }, 60000); // 1 minute
  }

  private startFallbackTimer(jobType: string, callback: () => void, interval: number): void {
    const timer = setInterval(callback, interval);
    this.fallbackTimers.set(jobType, timer);
  }

  private initializeWorkers(): void {
    if (!this.isRedisAvailable) return;

    try {
      // Initialize workers with in-line processors since external files might not work in Replit
      this.liveDataWorker = new Worker<LiveDataJobData>(
        'live-data',
        async (job) => {
          console.log(`🔄 Processing live data job ${job.id} for symbols: ${job.data.symbols.join(', ')}`);
          this.emit('job:live-data', job.data);
          return { success: true, timestamp: new Date() };
        },
        {
          connection: redisConnection,
          concurrency: 3,
        }
      );

      this.snapshotWorker = new Worker<SnapshotJobData>(
        'snapshot',
        async (job) => {
          console.log(`📸 Processing snapshot job ${job.id} for symbols: ${job.data.symbols.join(', ')}`);
          this.emit('job:snapshot', job.data);
          return { success: true, timestamp: new Date() };
        },
        {
          connection: redisConnection,
          concurrency: 2,
        }
      );

      this.patternWorker = new Worker<PatternAnalysisJobData>(
        'pattern-analysis',
        async (job) => {
          console.log(`🔍 Processing pattern analysis job ${job.id} for symbols: ${job.data.symbols.join(', ')}`);
          this.emit('job:pattern-analysis', job.data);
          return { success: true, timestamp: new Date() };
        },
        {
          connection: redisConnection,
          concurrency: 1,
        }
      );

      this.cacheWorker = new Worker<CacheRefreshJobData>(
        'cache-refresh',
        async (job) => {
          console.log(`🧹 Processing cache refresh job ${job.id} for cache type: ${job.data.cacheType}`);
          this.emit('job:cache-refresh', job.data);
          return { success: true, timestamp: new Date() };
        },
        {
          connection: redisConnection,
          concurrency: 2,
        }
      );

      this.setupWorkerEvents();
      console.log('✅ BullMQ workers initialized');
    } catch (error) {
      console.log('❌ Failed to initialize BullMQ workers:', error);
    }
  }

  private setupWorkerEvents(): void {
    const workers = [
      { worker: this.liveDataWorker, name: 'live-data' },
      { worker: this.snapshotWorker, name: 'snapshot' },
      { worker: this.patternWorker, name: 'pattern-analysis' },
      { worker: this.cacheWorker, name: 'cache-refresh' },
    ];

    workers.forEach(({ worker, name }) => {
      if (!worker) return;

      worker.on('completed', (job) => {
        console.log(`✅ ${name} job ${job.id} completed in ${job.processedOn! - job.timestamp}ms`);
        this.emit('job:completed', { queue: name, jobId: job.id, duration: job.processedOn! - job.timestamp });
      });

      worker.on('failed', (job, err) => {
        console.log(`❌ ${name} job ${job?.id} failed:`, err.message);
        this.emit('job:failed', { queue: name, jobId: job?.id, error: err.message });
      });

      worker.on('progress', (job, progress) => {
        this.emit('job:progress', { queue: name, jobId: job.id, progress });
      });
    });
  }

  private setupBullBoard(): void {
    if (!this.isRedisAvailable) return;

    try {
      const serverAdapter = new ExpressAdapter();
      serverAdapter.setBasePath('/admin/queues');

      createBullBoard({
        queues: [
          new BullMQAdapter(this.liveDataQueue!),
          new BullMQAdapter(this.snapshotQueue!),
          new BullMQAdapter(this.patternAnalysisQueue!),
          new BullMQAdapter(this.cacheRefreshQueue!),
        ],
        serverAdapter,
      });

      this.bullBoard = serverAdapter;
      console.log('✅ Bull Board dashboard initialized at /admin/queues');
    } catch (error) {
      console.log('❌ Failed to setup Bull Board:', error);
    }
  }

  private startScheduledJobs(): void {
    if (!this.isRedisAvailable) return;

    // Schedule recurring live data collection every 15 seconds
    this.liveDataQueue?.add('scheduled-live-data', {
      symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
      timestamp: new Date(),
      source: 'angel-one'
    }, {
      repeat: { every: 15000 },
      removeOnComplete: 5,
      removeOnFail: 3,
    });

    // Schedule recurring snapshot every 15 minutes
    this.snapshotQueue?.add('scheduled-snapshot', {
      symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
      timestamp: new Date(),
      snapshotType: 'intraday'
    }, {
      repeat: { every: 15 * 60 * 1000 },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    // Schedule pattern analysis every minute
    this.patternAnalysisQueue?.add('scheduled-pattern-analysis', {
      symbols: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
      timestamp: new Date(),
      analysisType: 'real-time'
    }, {
      repeat: { every: 60000 },
      removeOnComplete: 20,
      removeOnFail: 10,
    });

    console.log('✅ Scheduled jobs started');
  }

  // Public API methods
  async addLiveDataJob(data: LiveDataJobData, priority: number = 0): Promise<string | null> {
    if (this.isRedisAvailable && this.liveDataQueue) {
      try {
        const job = await this.liveDataQueue.add('collect-live-data', data, {
          priority,
          delay: 0,
        });
        return job.id!;
      } catch (error) {
        console.log('❌ Failed to add live data job, using fallback');
        this.emit('job:live-data', data);
        return null;
      }
    } else {
      this.emit('job:live-data', data);
      return null;
    }
  }

  async addSnapshotJob(data: SnapshotJobData, delay: number = 0): Promise<string | null> {
    if (this.isRedisAvailable && this.snapshotQueue) {
      try {
        const job = await this.snapshotQueue.add('create-snapshot', data, { delay });
        return job.id!;
      } catch (error) {
        console.log('❌ Failed to add snapshot job, using fallback');
        this.emit('job:snapshot', data);
        return null;
      }
    } else {
      this.emit('job:snapshot', data);
      return null;
    }
  }

  async addPatternAnalysisJob(data: PatternAnalysisJobData): Promise<string | null> {
    if (this.isRedisAvailable && this.patternAnalysisQueue) {
      try {
        const job = await this.patternAnalysisQueue.add('analyze-patterns', data);
        return job.id!;
      } catch (error) {
        console.log('❌ Failed to add pattern analysis job, using fallback');
        this.emit('job:pattern-analysis', data);
        return null;
      }
    } else {
      this.emit('job:pattern-analysis', data);
      return null;
    }
  }

  async addCacheRefreshJob(data: CacheRefreshJobData, priority: number = 0): Promise<string | null> {
    if (this.isRedisAvailable && this.cacheRefreshQueue) {
      try {
        const job = await this.cacheRefreshQueue.add('refresh-cache', data, { priority });
        return job.id!;
      } catch (error) {
        console.log('❌ Failed to add cache refresh job, using fallback');
        this.emit('job:cache-refresh', data);
        return null;
      }
    } else {
      this.emit('job:cache-refresh', data);
      return null;
    }
  }

  async getQueueStats(): Promise<any> {
    if (!this.isRedisAvailable) {
      return {
        mode: 'fallback',
        fallbackTimers: Array.from(this.fallbackTimers.keys()),
        redis: false,
        activeTimers: this.fallbackTimers.size,
      };
    }

    try {
      const [liveData, snapshot, pattern, cache] = await Promise.all([
        this.liveDataQueue!.getWaiting(),
        this.snapshotQueue!.getWaiting(),
        this.patternAnalysisQueue!.getWaiting(),
        this.cacheRefreshQueue!.getWaiting(),
      ]);

      const [liveCompleted, snapshotCompleted, patternCompleted, cacheCompleted] = await Promise.all([
        this.liveDataQueue!.getCompleted(),
        this.snapshotQueue!.getCompleted(),
        this.patternAnalysisQueue!.getCompleted(),
        this.cacheRefreshQueue!.getCompleted(),
      ]);

      return {
        mode: 'redis',
        redis: true,
        queues: {
          liveData: {
            waiting: liveData.length,
            completed: liveCompleted.length,
            name: 'live-data',
          },
          snapshot: {
            waiting: snapshot.length,
            completed: snapshotCompleted.length,
            name: 'snapshot',
          },
          pattern: {
            waiting: pattern.length,
            completed: patternCompleted.length,
            name: 'pattern-analysis',
          },
          cache: {
            waiting: cache.length,
            completed: cacheCompleted.length,
            name: 'cache-refresh',
          },
        },
      };
    } catch (error) {
      return {
        mode: 'error',
        redis: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getBullBoardRouter() {
    return this.bullBoard?.getRouter();
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up queue manager...');
    
    // Clear fallback timers
    for (const timer of this.fallbackTimers.values()) {
      clearInterval(timer);
    }
    this.fallbackTimers.clear();

    if (this.isRedisAvailable) {
      try {
        await Promise.all([
          this.liveDataWorker?.close(),
          this.snapshotWorker?.close(),
          this.patternWorker?.close(),
          this.cacheWorker?.close(),
        ]);

        await Promise.all([
          this.liveDataQueue?.close(),
          this.snapshotQueue?.close(),
          this.patternAnalysisQueue?.close(),
          this.cacheRefreshQueue?.close(),
        ]);
      } catch (error) {
        console.log('⚠️ Error during queue cleanup:', error);
      }
    }
  }
}

export const queueManager = new QueueManager();