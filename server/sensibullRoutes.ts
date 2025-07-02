import express from 'express';
import { sensibullDataService } from './sensibullDataService.js';
import { dataFallbackService } from './dataFallbackService.js';
import logger from './logger.js';

const router = express.Router();

// ===========================
// LIVE MARKET DATA ENDPOINTS
// ===========================

/**
 * GET /api/v2/live/:symbol
 * Get live market data for a symbol
 */
router.get('/live/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 100 } = req.query;
    
    logger.info(`📡 API request: Live data for ${symbol}`);
    
    const data = await sensibullDataService.getLiveMarketData(
      symbol.toUpperCase(), 
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data,
      timestamp: new Date(),
      count: data.length
    });
  } catch (error) {
    logger.error('❌ Live data API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/v2/live
 * Get current live data for multiple symbols
 */
router.get('/live', async (req, res) => {
  try {
    const { symbols: symbolList } = req.query;
    
    if (!symbolList) {
      return res.status(400).json({
        success: false,
        error: 'symbols parameter is required',
        timestamp: new Date()
      });
    }
    
    const symbols = (symbolList as string).split(',').map(s => s.trim().toUpperCase());
    logger.info(`📡 API request: Live data for multiple symbols: ${symbols.join(', ')}`);
    
    const results = {};
    
    for (const symbol of symbols) {
      try {
        const data = await sensibullDataService.getLiveMarketData(symbol, 1);
        results[symbol] = data[0] || null;
      } catch (error) {
        results[symbol] = { error: error.message };
      }
    }
    
    res.json({
      success: true,
      data: results,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Multi-symbol live data API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ===========================
// HISTORICAL DATA ENDPOINTS
// ===========================

/**
 * GET /api/v2/historical/:symbol
 * Get historical candle data
 */
router.get('/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1d', from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'from and to parameters are required',
        timestamp: new Date()
      });
    }
    
    logger.info(`📊 API request: Historical data for ${symbol} (${timeframe})`);
    
    const data = await sensibullDataService.getHistoricalCandles(
      symbol.toUpperCase(),
      timeframe as string,
      new Date(from as string),
      new Date(to as string)
    );
    
    res.json({
      success: true,
      data,
      meta: {
        symbol: symbol.toUpperCase(),
        timeframe,
        from,
        to,
        count: data.length
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Historical data API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ===========================
// OPTION CHAIN ENDPOINTS
// ===========================

/**
 * GET /api/v2/optionchain/:symbol
 * Get option chain data
 */
router.get('/optionchain/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 50 } = req.query;
    
    logger.info(`⚡ API request: Option chain for ${symbol}`);
    
    const data = await sensibullDataService.getOptionChainHistory(
      symbol.toUpperCase(),
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data,
      meta: {
        symbol: symbol.toUpperCase(),
        count: data.length
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Option chain API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/v2/optionchain/live/:symbol
 * Get live option chain data directly from providers
 */
router.get('/optionchain/live/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    logger.info(`⚡ API request: Live option chain for ${symbol}`);
    
    const result = await dataFallbackService.fetchOptionChain(symbol.toUpperCase());
    
    res.json({
      success: true,
      data: result.data,
      meta: {
        symbol: symbol.toUpperCase(),
        source: result.source,
        fetchedAt: result.timestamp
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Live option chain API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ===========================
// PATTERN DETECTION ENDPOINTS
// ===========================

/**
 * GET /api/v2/patterns
 * Get pattern detections
 */
router.get('/patterns', async (req, res) => {
  try {
    const { symbol, limit = 100 } = req.query;
    
    logger.info(`🧠 API request: Pattern detections ${symbol ? `for ${symbol}` : '(all symbols)'}`);
    
    const data = await sensibullDataService.getPatternDetections(
      symbol ? (symbol as string).toUpperCase() : undefined,
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data,
      meta: {
        symbol: symbol || 'all',
        count: data.length
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Pattern detection API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * POST /api/v2/patterns/detect
 * Trigger pattern detection manually
 */
router.post('/patterns/detect', async (req, res) => {
  try {
    logger.info('🧠 API request: Manual pattern detection trigger');
    
    // Run pattern detection in background
    sensibullDataService.detectAndStorePatterns().catch(error => {
      logger.error('❌ Background pattern detection error:', error);
    });
    
    res.json({
      success: true,
      message: 'Pattern detection started',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Pattern detection trigger API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ===========================
// DATA SOURCE MANAGEMENT
// ===========================

/**
 * GET /api/v2/sources
 * Get data source health status
 */
router.get('/sources', async (req, res) => {
  try {
    logger.info('📡 API request: Data source health');
    
    const data = await sensibullDataService.getDataSourceHealth();
    
    res.json({
      success: true,
      data,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Data source health API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * PUT /api/v2/sources/:sourceName
 * Update data source status
 */
router.put('/sources/:sourceName', async (req, res) => {
  try {
    const { sourceName } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean value',
        timestamp: new Date()
      });
    }
    
    logger.info(`🔄 API request: Update ${sourceName} status to ${isActive}`);
    
    await sensibullDataService.updateDataSourceStatus(sourceName, isActive);
    
    res.json({
      success: true,
      message: `Data source ${sourceName} ${isActive ? 'activated' : 'deactivated'}`,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Data source update API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ===========================
// SYSTEM MANAGEMENT
// ===========================

/**
 * POST /api/v2/system/cleanup
 * Trigger data cleanup
 */
router.post('/system/cleanup', async (req, res) => {
  try {
    logger.info('🧹 API request: Data cleanup trigger');
    
    // Run cleanup in background
    sensibullDataService.cleanupOldData().catch(error => {
      logger.error('❌ Background cleanup error:', error);
    });
    
    res.json({
      success: true,
      message: 'Data cleanup started',
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ Data cleanup API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * GET /api/v2/system/health
 * Get system health status
 */
router.get('/system/health', async (req, res) => {
  try {
    const fallbackHealth = dataFallbackService.getSourceHealth();
    
    res.json({
      success: true,
      data: {
        service: 'Sensibull Data Service',
        status: 'operational',
        dataSources: fallbackHealth,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date()
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('❌ System health API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ===========================
// ERROR HANDLING
// ===========================

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    availableEndpoints: [
      'GET /api/v2/live/:symbol',
      'GET /api/v2/live?symbols=NIFTY,BANKNIFTY',
      'GET /api/v2/historical/:symbol?timeframe=1d&from=2024-01-01&to=2024-01-02',
      'GET /api/v2/optionchain/:symbol',
      'GET /api/v2/optionchain/live/:symbol',
      'GET /api/v2/patterns?symbol=NIFTY',
      'POST /api/v2/patterns/detect',
      'GET /api/v2/sources',
      'PUT /api/v2/sources/:sourceName',
      'POST /api/v2/system/cleanup',
      'GET /api/v2/system/health'
    ],
    timestamp: new Date()
  });
});

export { router as sensibullRoutes };