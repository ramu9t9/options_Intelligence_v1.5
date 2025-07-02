import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import logger from './logger.js';
import { sensibullRoutes } from './sensibullRoutes.js';
import enhancedApiRoutes from './enhancedApiRoutes.js';
import { sensibullDataService } from './sensibullDataService.js';
import { liveAngelOneDataService } from './liveAngelOneDataService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  logger.info(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const liveDataStats = liveAngelOneDataService.getServiceStats();
  
  res.json({
    status: 'operational',
    service: 'Options Intelligence Platform - Live Angel One Integration',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    liveDataService: {
      isRunning: liveDataStats.isRunning,
      activeSymbols: liveDataStats.activeSymbols,
      angelOneConnected: liveDataStats.angelOneStatus.connected,
      lastUpdate: new Date(liveDataStats.lastUpdate)
    }
  });
});

// API Routes
app.use('/api/v2', sensibullRoutes);
app.use('/api', enhancedApiRoutes); // Enhanced live data API routes

// Legacy API compatibility
app.use('/api/legacy', sensibullRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO real-time data streaming with enhanced live data
io.on('connection', (socket) => {
  logger.info(`🔌 Client connected: ${socket.id}`);
  
  // Send initial live data on connection
  liveAngelOneDataService.getLiveData().then(data => {
    socket.emit('initial_market_data', data);
  }).catch(err => {
    logger.error('Error sending initial market data:', err);
  });
  
  // Subscribe to live market data
  socket.on('subscribe', (data) => {
    const { symbols, type } = data;
    logger.info(`📡 Client ${socket.id} subscribed to ${type} for symbols: ${symbols.join(', ')}`);
    
    // Join rooms for each symbol
    symbols.forEach((symbol: string) => {
      socket.join(`${type}_${symbol.toUpperCase()}`);
      
      // Send current data for subscribed symbol
      if (type === 'live') {
        liveAngelOneDataService.getLiveData(symbol.toUpperCase()).then(symbolData => {
          socket.emit('liveData', { 
            symbol: symbol.toUpperCase(), 
            data: symbolData[0],
            timestamp: new Date().toISOString()
          });
        }).catch(err => {
          logger.error(`Error sending data for ${symbol}:`, err);
        });
      }
    });
    
    socket.emit('subscribed', {
      symbols,
      type,
      message: 'Successfully subscribed to real-time data'
    });
  });
  
  // Unsubscribe from updates
  socket.on('unsubscribe', (data) => {
    const { symbols, type } = data;
    logger.info(`📡 Client ${socket.id} unsubscribed from ${type} for symbols: ${symbols.join(', ')}`);
    
    symbols.forEach((symbol: string) => {
      socket.leave(`${type}_${symbol.toUpperCase()}`);
    });
    
    socket.emit('unsubscribed', {
      symbols,
      type,
      message: 'Successfully unsubscribed from real-time data'
    });
  });
  
  // Get live service status
  socket.on('get_live_status', () => {
    const stats = liveAngelOneDataService.getServiceStats();
    socket.emit('live_status_update', stats);
  });
  
  socket.on('disconnect', () => {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Enhanced data broadcasting with live Angel One data
liveAngelOneDataService.on('live_data_update', (data) => {
  // Broadcast to all connected clients
  io.emit('live_market_data_update', {
    data,
    timestamp: new Date().toISOString(),
    source: 'live_angel_one'
  });
  
  // Broadcast to symbol-specific rooms
  data.forEach(update => {
    io.to(`live_${update.symbol}`).emit('liveData', {
      symbol: update.symbol,
      data: update,
      timestamp: new Date().toISOString()
    });
  });
});

// Service status broadcasting
liveAngelOneDataService.on('service_started', () => {
  io.emit('service_status', { 
    status: 'started', 
    message: 'Live Angel One data service is now active',
    timestamp: new Date().toISOString()
  });
});

liveAngelOneDataService.on('service_error', (error) => {
  io.emit('service_status', { 
    status: 'error', 
    message: `Live data service error: ${error.message}`,
    timestamp: new Date().toISOString()
  });
});

liveAngelOneDataService.on('circuit_breaker_open', (circuitBreaker) => {
  io.emit('service_status', { 
    status: 'degraded', 
    message: 'Circuit breaker opened - data collection paused temporarily',
    circuitBreaker,
    timestamp: new Date().toISOString()
  });
});

// Heartbeat broadcasting every minute
liveAngelOneDataService.on('heartbeat', (stats) => {
  io.emit('heartbeat', {
    ...stats,
    timestamp: new Date().toISOString()
  });
});

// Broadcast pattern detection updates
setInterval(async () => {
  try {
    const patterns = await sensibullDataService.getPatternDetections(undefined, 10);
    if (patterns.length > 0) {
      io.emit('patternUpdate', {
        patterns,
        timestamp: new Date()
      });
    }
  } catch (error) {
    // Silent fail
  }
}, 30000); // Every 30 seconds

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('❌ Unhandled application error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
    // Stop live data collection services
    liveAngelOneDataService.stopService();
    await sensibullDataService.shutdown();
    
    // Close server
    server.close(() => {
      logger.info('✅ Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  
  try {
    liveAngelOneDataService.stopService();
    await sensibullDataService.shutdown();
    server.close(() => {
      logger.info('✅ Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 Enhanced Options Intelligence Platform running on port ${PORT}`);
  logger.info(`📡 Live Angel One data service: Auto-starting with 5-second updates`);
  logger.info(`⚡ Enhanced fallback chain: Angel One → Dhan → NSE → Yahoo → Mock`);
  logger.info(`📈 Historical data collection: Every 15 minutes`);
  logger.info(`🧠 AI Pattern detection: Real-time with confidence scoring`);
  logger.info(`💾 Future-ready database: Orders, Payments, Subscriptions`);
  logger.info(`📡 WebSocket: Enhanced real-time streaming`);
  logger.info(`🔄 Circuit breaker: Automatic failover protection`);
  logger.info(`🎯 API endpoints: /api/live-data, /api/feed/status, /api/option-chain`);
});

export { app, server, io };