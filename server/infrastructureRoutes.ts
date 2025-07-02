import type { Express } from "express";
import { authenticate } from "./auth";

export function registerInfrastructureRoutes(app: Express): void {
  // Phase 1 Infrastructure Monitoring Endpoints
  app.get('/api/infrastructure/health', async (req, res) => {
    try {
      const { monitoringService } = await import('./monitoringService');
      const healthData = monitoringService.getHealthEndpointData();
      res.json(healthData);
    } catch (error) {
      res.status(503).json({
        status: 'CRITICAL',
        timestamp: new Date(),
        error: 'Monitoring service unavailable'
      });
    }
  });

  app.get('/api/infrastructure/metrics', authenticate, async (req, res) => {
    try {
      const { monitoringService } = await import('./monitoringService');
      const metricsData = monitoringService.getMetricsEndpointData();
      res.json(metricsData);
    } catch (error) {
      console.error('Error getting metrics:', error);
      res.status(500).json({ error: 'Failed to get system metrics' });
    }
  });

  app.get('/api/infrastructure/queues', authenticate, async (req, res) => {
    try {
      const { queueManager } = await import('./jobs/queueManager');
      const queueStats = await queueManager.getQueueStats();
      res.json({
        timestamp: new Date(),
        ...queueStats
      });
    } catch (error) {
      console.error('Error getting queue stats:', error);
      res.status(500).json({ error: 'Failed to get queue statistics' });
    }
  });

  app.get('/api/infrastructure/circuit-breakers', authenticate, async (req, res) => {
    try {
      const { circuitBreakerManager } = await import('./circuitBreaker');
      const breakerStats = circuitBreakerManager.getAllBreakerStats();
      const systemHealth = circuitBreakerManager.getSystemHealth();
      
      res.json({
        timestamp: new Date(),
        system_health: systemHealth,
        breakers: breakerStats
      });
    } catch (error) {
      console.error('Error getting circuit breaker stats:', error);
      res.status(500).json({ error: 'Failed to get circuit breaker statistics' });
    }
  });

  app.post('/api/infrastructure/circuit-breakers/:name/reset', authenticate, async (req, res) => {
    try {
      const { name } = req.params;
      const { circuitBreakerManager } = await import('./circuitBreaker');
      circuitBreakerManager.reset(name);
      
      res.json({
        success: true,
        message: `Circuit breaker ${name} reset successfully`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error resetting circuit breaker:', error);
      res.status(500).json({ error: 'Failed to reset circuit breaker' });
    }
  });

  app.get('/api/infrastructure/pubsub', authenticate, async (req, res) => {
    try {
      const { pubSubManager } = await import('./pubSubManager');
      const pubSubStats = pubSubManager.getStats();
      res.json({
        timestamp: new Date(),
        ...pubSubStats
      });
    } catch (error) {
      console.error('Error getting pub/sub stats:', error);
      res.status(500).json({ error: 'Failed to get pub/sub statistics' });
    }
  });

  app.post('/api/infrastructure/jobs/live-data', authenticate, async (req, res) => {
    try {
      const { symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'], source = 'angel-one' } = req.body;
      const { queueManager } = await import('./jobs/queueManager');
      
      const jobId = await queueManager.addLiveDataJob({
        symbols,
        timestamp: new Date(),
        source
      }, 1); // High priority
      
      res.json({
        success: true,
        jobId,
        message: 'Live data collection job queued',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error queuing live data job:', error);
      res.status(500).json({ error: 'Failed to queue live data job' });
    }
  });

  app.post('/api/infrastructure/jobs/snapshot', authenticate, async (req, res) => {
    try {
      const { symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'], snapshotType = 'intraday' } = req.body;
      const { queueManager } = await import('./jobs/queueManager');
      
      const jobId = await queueManager.addSnapshotJob({
        symbols,
        timestamp: new Date(),
        snapshotType
      });
      
      res.json({
        success: true,
        jobId,
        message: 'Snapshot job queued',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error queuing snapshot job:', error);
      res.status(500).json({ error: 'Failed to queue snapshot job' });
    }
  });

  app.post('/api/infrastructure/jobs/pattern-analysis', authenticate, async (req, res) => {
    try {
      const { symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'], analysisType = 'real-time' } = req.body;
      const { queueManager } = await import('./jobs/queueManager');
      
      const jobId = await queueManager.addPatternAnalysisJob({
        symbols,
        timestamp: new Date(),
        analysisType
      });
      
      res.json({
        success: true,
        jobId,
        message: 'Pattern analysis job queued',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error queuing pattern analysis job:', error);
      res.status(500).json({ error: 'Failed to queue pattern analysis job' });
    }
  });

  app.get('/api/infrastructure/alerts', authenticate, async (req, res) => {
    try {
      const { monitoringService } = await import('./monitoringService');
      const activeAlerts = monitoringService.getActiveAlerts();
      const allAlerts = monitoringService.getAllAlerts();
      
      res.json({
        timestamp: new Date(),
        active: activeAlerts,
        total: allAlerts.length,
        resolved: allAlerts.filter(a => a.resolved).length
      });
    } catch (error) {
      console.error('Error getting alerts:', error);
      res.status(500).json({ error: 'Failed to get system alerts' });
    }
  });

  app.get('/api/infrastructure/cache', authenticate, async (req, res) => {
    try {
      const { cacheAdapter } = await import('./cacheAdapter');
      const cacheStats = cacheAdapter.getStats();
      res.json({
        timestamp: new Date(),
        ...cacheStats
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({ error: 'Failed to get cache statistics' });
    }
  });

  app.post('/api/infrastructure/cache/invalidate', authenticate, async (req, res) => {
    try {
      const { pattern } = req.body;
      const { cacheAdapter } = await import('./cacheAdapter');
      
      if (pattern) {
        await cacheAdapter.invalidatePattern(pattern);
      } else {
        await cacheAdapter.clear();
      }
      
      res.json({
        success: true,
        message: pattern ? `Cache pattern ${pattern} invalidated` : 'All cache cleared',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error invalidating cache:', error);
      res.status(500).json({ error: 'Failed to invalidate cache' });
    }
  });

  // Bull Board Dashboard for Queue Management
  app.use('/admin/queues', authenticate, async (req, res, next) => {
    try {
      const { queueManager } = await import('./jobs/queueManager');
      const router = queueManager.getBullBoardRouter();
      if (router) {
        router(req, res, next);
      } else {
        res.status(503).json({ error: 'Queue dashboard unavailable (Redis required)' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Queue dashboard error' });
    }
  });

  // Infrastructure system reset endpoints
  app.post('/api/infrastructure/reset/all', authenticate, async (req, res) => {
    try {
      const { circuitBreakerManager } = await import('./circuitBreaker');
      const { cacheAdapter } = await import('./cacheAdapter');
      
      // Reset all circuit breakers
      circuitBreakerManager.reset();
      
      // Clear all caches
      await cacheAdapter.clear();
      
      res.json({
        success: true,
        message: 'All infrastructure components reset successfully',
        timestamp: new Date(),
        actions: [
          'Circuit breakers reset',
          'Cache cleared',
          'System health refreshed'
        ]
      });
    } catch (error) {
      console.error('Error resetting infrastructure:', error);
      res.status(500).json({ error: 'Failed to reset infrastructure' });
    }
  });

  console.log('✅ Infrastructure monitoring endpoints registered');
}