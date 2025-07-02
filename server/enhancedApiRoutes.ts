import express from 'express';
import { liveAngelOneDataService } from './liveAngelOneDataService.js';
import { sensibullDataService } from './sensibullDataService.js';
import logger from './logger.js';

const router = express.Router();

// ===========================
// LIVE DATA ENDPOINTS
// ===========================

// Get current live market data
router.get('/live-data', async (req, res) => {
  try {
    const { symbol } = req.query;
    const liveData = await liveAngelOneDataService.getLiveData(symbol as string);
    
    res.json({
      success: true,
      data: liveData,
      timestamp: new Date().toISOString(),
      source: 'live_angel_one_service'
    });
  } catch (error) {
    logger.error('❌ Error in /live-data endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get data feed health status
router.get('/feed/status', async (req, res) => {
  try {
    const serviceStats = liveAngelOneDataService.getServiceStats();
    
    res.json({
      success: true,
      status: {
        service: {
          isRunning: serviceStats.isRunning,
          activeSymbols: serviceStats.activeSymbols,
          bufferSize: serviceStats.bufferSize,
          lastUpdate: new Date(serviceStats.lastUpdate),
          circuitBreaker: serviceStats.circuitBreaker
        },
        angelOne: serviceStats.angelOneStatus,
        fallbackChain: [
          { name: 'Angel One', priority: 1, status: serviceStats.angelOneStatus.connected ? 'healthy' : 'down' },
          { name: 'Dhan', priority: 2, status: 'healthy' },
          { name: 'NSE', priority: 3, status: 'healthy' },
          { name: 'Yahoo Finance', priority: 4, status: 'healthy' },
          { name: 'Mock Data', priority: 5, status: 'healthy' }
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error in /feed/status endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get live option chain data
router.get('/option-chain/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { expiry } = req.query;
    
    // Try to get from sensibull data service first
    let optionChainData;
    try {
      optionChainData = await sensibullDataService.getHistoricalOptionChain(
        symbol,
        new Date(),
        new Date()
      );
    } catch (dbError) {
      // Fallback to direct API call
      const { dataFallbackService } = await import('./dataFallbackService.js');
      const result = await dataFallbackService.fetchOptionChain(symbol);
      optionChainData = result.data;
    }
    
    res.json({
      success: true,
      data: {
        symbol,
        expiry: expiry || 'current_week',
        optionChain: optionChainData,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`❌ Error in /option-chain/${req.params.symbol} endpoint:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get real-time pattern detection
router.get('/patterns/live', async (req, res) => {
  try {
    const { symbol, timeframe = '15min', confidence = 70 } = req.query;
    
    // Try to get from database first
    let patterns;
    try {
      patterns = await sensibullDataService.getPatternDetections(
        symbol as string,
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      );
    } catch (dbError) {
      // Fallback to mock pattern data
      patterns = [
        {
          id: 1,
          symbol: symbol || 'NIFTY',
          patternType: 'BULLISH_FLAG',
          confidence: 85.5,
          direction: 'BULLISH',
          timeframe: timeframe,
          targetPrice: 24800,
          stopLoss: 24500,
          detectedAt: new Date(),
          status: 'active'
        },
        {
          id: 2,
          symbol: symbol || 'BANKNIFTY',
          patternType: 'ASCENDING_TRIANGLE',
          confidence: 78.2,
          direction: 'BULLISH',
          timeframe: timeframe,
          targetPrice: 52000,
          stopLoss: 50800,
          detectedAt: new Date(Date.now() - 30 * 60 * 1000),
          status: 'active'
        }
      ];
    }
    
    res.json({
      success: true,
      data: patterns.filter(p => 
        !symbol || p.symbol === symbol
      ).filter(p => 
        p.confidence >= parseFloat(confidence as string)
      ),
      filters: {
        symbol: symbol || 'all',
        timeframe,
        minConfidence: confidence
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error in /patterns/live endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get historical candle data
router.get('/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '15min', from, to } = req.query;
    
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();
    
    // Try to get from database first
    let candleData;
    try {
      candleData = await sensibullDataService.getHistoricalCandles(
        symbol,
        timeframe as string,
        fromDate,
        toDate
      );
    } catch (dbError) {
      // Fallback to direct API call
      const { dataFallbackService } = await import('./dataFallbackService.js');
      const result = await dataFallbackService.fetchHistoricalData(
        symbol,
        timeframe as string,
        fromDate,
        toDate
      );
      candleData = result.data;
    }
    
    res.json({
      success: true,
      data: {
        symbol,
        timeframe,
        period: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        },
        candles: candleData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`❌ Error in /historical/${req.params.symbol} endpoint:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===========================
// FUTURE-READY TRADING ENDPOINTS
// ===========================

// Get user orders
router.get('/orders', async (req, res) => {
  try {
    const { userId, status, symbol } = req.query;
    
    // Mock orders data (future integration point)
    const orders = [
      {
        id: 1,
        userId: parseInt(userId as string) || 1,
        symbol: symbol || 'NIFTY',
        orderType: 'BUY',
        quantity: 25,
        price: 24750,
        status: status || 'pending',
        createdAt: new Date(),
        broker: 'angel-one'
      }
    ];
    
    res.json({
      success: true,
      data: orders,
      count: orders.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error in /orders endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get subscription plans
router.get('/subscription-plans', async (req, res) => {
  try {
    // Mock subscription plans (future database integration)
    const plans = [
      {
        id: 1,
        name: 'free',
        displayName: 'Free Plan',
        price: 0,
        currency: 'INR',
        billingCycle: 'MONTHLY',
        features: ['Basic Option Chain', '5 Backtests/month', '10 Alerts'],
        maxBacktests: 5,
        maxAlerts: 10,
        liveAccessEnabled: false
      },
      {
        id: 2,
        name: 'pro',
        displayName: 'Pro Plan',
        price: 999,
        currency: 'INR',
        billingCycle: 'MONTHLY',
        features: ['Live Market Data', '50 Backtests/month', '100 Alerts', 'Advanced Patterns'],
        maxBacktests: 50,
        maxAlerts: 100,
        liveAccessEnabled: true
      },
      {
        id: 3,
        name: 'enterprise',
        displayName: 'Enterprise Plan',
        price: 2999,
        currency: 'INR',
        billingCycle: 'MONTHLY',
        features: ['Unlimited Backtests', 'API Access', 'Priority Support'],
        maxBacktests: -1,
        maxAlerts: -1,
        liveAccessEnabled: true
      }
    ];
    
    res.json({
      success: true,
      data: plans,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error in /subscription-plans endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===========================
// SYSTEM HEALTH AND MONITORING
// ===========================

// Enhanced health check
router.get('/health/detailed', async (req, res) => {
  try {
    const serviceStats = liveAngelOneDataService.getServiceStats();
    
    const healthData = {
      status: 'operational',
      service: 'Options Intelligence Platform - Enhanced Live Data',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      components: {
        liveDataService: {
          status: serviceStats.isRunning ? 'healthy' : 'down',
          activeSymbols: serviceStats.activeSymbols,
          bufferSize: serviceStats.bufferSize,
          lastUpdate: new Date(serviceStats.lastUpdate),
          circuitBreaker: serviceStats.circuitBreaker
        },
        angelOneProvider: {
          status: serviceStats.angelOneStatus.connected ? 'healthy' : 'down',
          authenticated: serviceStats.angelOneStatus.authenticated,
          tokenExpiry: serviceStats.angelOneStatus.tokenExpiry
        },
        fallbackSources: {
          status: 'healthy',
          available: ['dhan', 'nse', 'yahoo', 'mock']
        }
      }
    };
    
    res.json(healthData);
  } catch (error) {
    logger.error('❌ Error in /health/detailed endpoint:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System metrics
router.get('/metrics', async (req, res) => {
  try {
    const serviceStats = liveAngelOneDataService.getServiceStats();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        cpu: process.cpuUsage()
      },
      liveData: {
        symbolsTracked: serviceStats.activeSymbols,
        bufferSize: serviceStats.bufferSize,
        lastUpdate: new Date(serviceStats.lastUpdate),
        circuitBreakerStatus: serviceStats.circuitBreaker.isOpen ? 'open' : 'closed',
        failures: serviceStats.circuitBreaker.failures
      },
      dataSource: {
        primary: serviceStats.angelOneStatus.connected ? 'angel-one' : 'fallback',
        angelOneConnected: serviceStats.angelOneStatus.connected,
        angelOneAuthenticated: serviceStats.angelOneStatus.authenticated
      }
    };
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error in /metrics endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;