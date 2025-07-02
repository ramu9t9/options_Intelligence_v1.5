import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { AuthService, authenticate, authorize, validatePassword, type AuthRequest } from "./auth";
import { marketDataService } from "./marketDataService";
import { alertSystem } from "./alertSystem";
import { subscriptionService } from "./subscriptionService";
import { setupSecurity } from "./security";
import { PatternDetector } from "./patternDetector";
import { aiInsightsEngine } from "./aiInsightsEngine";
import { centralizedDataFeed } from "./centralizedDataFeed";
import { dhanProvider } from "./dhanProvider";
import { angelOneProvider } from "./angelOneProvider";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup basic security middleware (simplified for development)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  // Initialize services (with error handling)
  try {
    await marketDataService.initialize();
  } catch (error) {
    console.warn('Market data service initialization failed, continuing with mock data:', error);
  }
  
  try {
    await subscriptionService.initialize();
  } catch (error) {
    console.warn('Subscription service initialization failed, continuing:', error);
  }

  try {
    await aiInsightsEngine.initialize();
  } catch (error) {
    console.warn('AI insights engine initialization failed, continuing:', error);
  }

  // Initialize Centralized Data Feed Service
  try {
    console.log('🔄 Initializing Centralized Data Feed Service...');
    
    // Default admin configuration (can be updated via admin panel)
    const adminConfig = {
      adminApiKey: process.env.ANGEL_ONE_API_KEY || '',
      adminClientId: process.env.ANGEL_ONE_CLIENT_ID || '',
      adminSecret: process.env.ANGEL_ONE_SECRET || '',
      adminPin: process.env.ANGEL_ONE_PIN || '',
      adminTotp: process.env.ANGEL_ONE_TOTP || ''
    };
    
    const feedInitialized = await centralizedDataFeed.initialize(adminConfig);
    
    if (feedInitialized) {
      console.log('✅ Centralized Data Feed Service initialized successfully');
    } else {
      console.log('⚠️ Centralized Data Feed Service using fallback mode (missing Angel One credentials)');
    }
  } catch (error) {
    console.warn('Centralized data feed initialization failed, continuing with fallback:', error);
  }
  
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:5000", "https://*.replit.dev", "https://*.replit.app"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Centralized Data Feed WebSocket Integration
  io.on("connection", (socket) => {
    console.log("📱 Client connected:", socket.id);
    
    // Register client with centralized feed
    centralizedDataFeed.emit('clientConnected', socket.id);
    
    // Send latest snapshot if available
    const latestSnapshot = centralizedDataFeed.getLastSnapshot();
    if (latestSnapshot) {
      socket.emit("market-snapshot", latestSnapshot);
      socket.emit("market-data", {
        niftyData: latestSnapshot.instruments.NIFTY?.optionChain || [],
        bankNiftyData: latestSnapshot.instruments.BANKNIFTY?.optionChain || [],
        prices: {
          NIFTY: latestSnapshot.instruments.NIFTY?.ltp || 19523,
          BANKNIFTY: latestSnapshot.instruments.BANKNIFTY?.ltp || 45287
        }
      });
    }

    socket.on("disconnect", () => {
      console.log("📱 Client disconnected:", socket.id);
      centralizedDataFeed.emit('clientDisconnected', socket.id);
    });
  });

  // Set up centralized data feed event listeners for broadcasting
  centralizedDataFeed.on('marketSnapshot', (snapshot) => {
    // Broadcast to all connected clients
    io.emit('market-snapshot', snapshot);
    io.emit('market-data', {
      niftyData: snapshot.instruments.NIFTY?.optionChain || [],
      bankNiftyData: snapshot.instruments.BANKNIFTY?.optionChain || [],
      prices: {
        NIFTY: snapshot.instruments.NIFTY?.ltp || 19523,
        BANKNIFTY: snapshot.instruments.BANKNIFTY?.ltp || 45287
      }
    });
  });

  centralizedDataFeed.on('priceUpdate', (instruments) => {
    io.emit('price-update', instruments);
  });

  centralizedDataFeed.on('optionChainUpdate', (optionChainData) => {
    io.emit('option-chain-update', optionChainData);
  });

  centralizedDataFeed.on('sentimentUpdate', (sentiment) => {
    io.emit('sentiment-update', sentiment);
  });

  centralizedDataFeed.on('insightsUpdate', (insights) => {
    io.emit('insights-update', insights);
  });

  // Authentication API Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          error: "Password validation failed", 
          details: passwordValidation.errors 
        });
      }

      const result = await AuthService.register({
        username,
        email,
        password,
        firstName,
        lastName,
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const result = await AuthService.login(username, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Routes
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const instruments = await storage.getInstruments();
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        database: "connected",
        instrumentCount: instruments.length
      });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: (error as Error).message
      });
    }
  });

  app.get("/api/stats", (req, res) => {
    res.json({
      users: { total: 150, active: 45, trial: 20, premium: 25 },
      revenue: { mrr: 12500, arr: 150000, totalRevenue: 350000, conversionRate: 15.5 },
      system: { uptime: 99.9, apiLatency: 120, errorRate: 0.1, activeConnections: 45 },
      subscriptions: { free: 100, pro: 30, vip: 15, institutional: 5 }
    });
  });

  app.get("/api/admin/data-service/status", (req, res) => {
    res.json({
      status: "connected",
      provider: "mock",
      lastUpdate: new Date().toISOString(),
      connectionCount: io.engine.clientsCount
    });
  });

  // Database API Routes
  app.get("/api/instruments", async (req, res) => {
    try {
      const instruments = await storage.getInstruments();
      res.json(instruments);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/instruments", async (req, res) => {
    try {
      const instrument = await storage.createInstrument(req.body);
      res.json(instrument);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/instruments/:id/options", async (req, res) => {
    try {
      const instrumentId = parseInt(req.params.id);
      const options = await storage.getOptionData(instrumentId);
      res.json(options);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/signals", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const signals = await storage.getRecentSignals(limit);
      res.json(signals);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/signals", async (req, res) => {
    try {
      const signal = await storage.insertSignal(req.body);
      res.json(signal);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Subscription API Routes
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/subscription-plans", async (req, res) => {
    try {
      const plan = await storage.createSubscriptionPlan(req.body);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/users/:userId/subscription", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscription = await storage.getUserSubscription(userId);
      if (!subscription) {
        return res.status(404).json({ error: "No active subscription found" });
      }
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Service Provider API Routes
  app.get("/api/service-providers", async (req, res) => {
    try {
      const providers = await storage.getServiceProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/service-providers", async (req, res) => {
    try {
      const provider = await storage.createServiceProvider(req.body);
      res.json(provider);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/service-providers/:id/profiles", async (req, res) => {
    try {
      const providerId = parseInt(req.params.id);
      const profiles = await storage.getServiceProviderProfiles(providerId);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/service-providers/:id/profiles", async (req, res) => {
    try {
      const providerId = parseInt(req.params.id);
      const profile = await storage.createServiceProviderProfile({
        ...req.body,
        providerId
      });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Initialize sample data on startup
  initializeSampleData();

  // Initialize AI insights engine
  await aiInsightsEngine.initialize();

  // Initialize centralized data broadcaster
  const { centralDataBroadcaster } = await import('./centralDataBroadcaster');
  await centralDataBroadcaster.initialize(io);

  // Centralized Data API Routes
  app.get("/api/central-data", authenticate, async (req: AuthRequest, res) => {
    try {
      await subscriptionService.incrementApiCall(req.user!.id);
      const data = centralDataBroadcaster.getCentralizedData();
      res.json(data);
    } catch (error) {
      console.error("Error fetching centralized data:", error);
      res.status(500).json({ error: "Failed to fetch centralized data" });
    }
  });

  app.get("/api/central-data/performance", authenticate, async (req: AuthRequest, res) => {
    try {
      const metrics = centralDataBroadcaster.getPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  // Advanced Trading Strategies Routes
  app.get("/api/strategies/:symbol", authenticate, async (req: AuthRequest, res) => {
    try {
      const { symbol } = req.params;
      await subscriptionService.incrementApiCall(req.user!.id);
      
      const instrumentData = centralDataBroadcaster.getInstrumentData(symbol);
      if (!instrumentData) {
        return res.status(404).json({ error: "Instrument not found" });
      }

      const { AdvancedTradingStrategies } = await import('./tradingStrategies');
      const context = {
        underlying: symbol,
        currentPrice: instrumentData.price,
        previousPrice: instrumentData.price - instrumentData.change,
        volatility: Math.abs(instrumentData.changePercent),
        marketHours: true,
        timeframe: '1D'
      };

      const strategies = AdvancedTradingStrategies.analyzeStrategies(
        instrumentData.optionChain,
        context
      );

      res.json({ strategies, symbol, context });
    } catch (error) {
      console.error("Error analyzing strategies:", error);
      res.status(500).json({ error: "Failed to analyze trading strategies" });
    }
  });

  // AI Insights Routes
  app.get("/api/ai/insights", authenticate, async (req: AuthRequest, res) => {
    try {
      const { symbol } = req.query;
      await subscriptionService.incrementApiCall(req.user!.id);
      const insights = aiInsightsEngine.getInsights(symbol as string);
      res.json({ insights, symbol });
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      res.status(500).json({ error: "Failed to fetch AI insights" });
    }
  });

  app.get("/api/ai/recommendations", authenticate, async (req: AuthRequest, res) => {
    try {
      const { symbol } = req.query;
      await subscriptionService.incrementApiCall(req.user!.id);
      const recommendations = aiInsightsEngine.getRecommendations(symbol as string);
      res.json({ recommendations, symbol });
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.get("/api/ai/sentiment", authenticate, async (req: AuthRequest, res) => {
    try {
      await subscriptionService.incrementApiCall(req.user!.id);
      const sentiment = aiInsightsEngine.getMarketSentiment();
      const analytics = aiInsightsEngine.getAIAnalytics();
      res.json({ sentiment, analytics });
    } catch (error) {
      console.error("Error fetching market sentiment:", error);
      res.status(500).json({ error: "Failed to fetch market sentiment" });
    }
  });

  return httpServer;
}

async function initializeSampleData() {
  try {
    // Create admin user with new credentials
    const adminExists = await storage.getUserByUsername('admin');
    if (!adminExists) {
      const { AuthService } = await import('./auth');
      const hashedPassword = await AuthService.hashPassword('OpAdmin2025!');
      await storage.createUser({
        username: 'admin',
        email: 'admin@optionsintelligence.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User'
      });
      console.log('✅ Admin credentials created:');
      console.log('📧 Username: admin');
      console.log('🔐 Password: OpAdmin2025!');
    }

    // Initialize instruments
    const existingInstruments = await storage.getInstruments();
    if (existingInstruments.length === 0) {
      console.log("Adding sample instruments to database...");
      
      const instruments = [
        { symbol: "NIFTY", name: "NIFTY 50", marketType: "INDEX" as const, underlyingPrice: "22000.00", isActive: true },
        { symbol: "BANKNIFTY", name: "BANK NIFTY", marketType: "INDEX" as const, underlyingPrice: "45000.00", isActive: true },
        { symbol: "FINNIFTY", name: "NIFTY FINANCIAL SERVICES", marketType: "INDEX" as const, underlyingPrice: "18000.00", isActive: true },
        { symbol: "GOLD", name: "Gold", marketType: "COMMODITY" as const, underlyingPrice: "62000.00", isActive: true },
        { symbol: "SILVER", name: "Silver", marketType: "COMMODITY" as const, underlyingPrice: "72000.00", isActive: true },
        { symbol: "CRUDEOIL", name: "Crude Oil", marketType: "COMMODITY" as const, underlyingPrice: "6500.00", isActive: true }
      ];

      for (const instrument of instruments) {
        await storage.createInstrument(instrument);
      }
      console.log("Sample instruments added successfully");
    }

    // Initialize subscription plans
    const existingPlans = await storage.getSubscriptionPlans();
    if (existingPlans.length === 0) {
      console.log("Adding subscription plans to database...");
      
      const plans = [
        {
          name: "Free",
          price: "0.00",
          billingCycle: "MONTHLY" as const,
          features: ["2 instruments", "Basic patterns", "5 alerts", "Historical data"],
          maxInstruments: 2,
          maxAlerts: 5,
          realTimeData: false,
          patternDetectionTypes: ["CALL_LONG_BUILDUP", "PUT_LONG_BUILDUP"],
          apiRateLimit: 100,
          isActive: true
        },
        {
          name: "Pro",
          price: "49.00",
          billingCycle: "MONTHLY" as const,
          features: ["All instruments", "Advanced patterns", "100 alerts", "Backtesting", "Real-time data"],
          maxInstruments: 999,
          maxAlerts: 100,
          realTimeData: true,
          patternDetectionTypes: ["CALL_LONG_BUILDUP", "PUT_LONG_BUILDUP", "CALL_SHORT_COVER", "PUT_SHORT_COVER", "GAMMA_SQUEEZE"],
          apiRateLimit: 1000,
          isActive: true
        },
        {
          name: "VIP",
          price: "149.00",
          billingCycle: "MONTHLY" as const,
          features: ["Unlimited alerts", "API access", "Custom scanners", "Priority support", "Advanced analytics"],
          maxInstruments: 999,
          maxAlerts: 9999,
          realTimeData: true,
          patternDetectionTypes: ["CALL_LONG_BUILDUP", "PUT_LONG_BUILDUP", "CALL_SHORT_COVER", "PUT_SHORT_COVER", "GAMMA_SQUEEZE", "VOLATILITY_SPIKE", "UNUSUAL_ACTIVITY"],
          apiRateLimit: 10000,
          isActive: true
        },
        {
          name: "Institutional",
          price: "499.00",
          billingCycle: "MONTHLY" as const,
          features: ["White-label", "SLA guarantee", "Custom integrations", "Dedicated support", "Enterprise features"],
          maxInstruments: 9999,
          maxAlerts: 99999,
          realTimeData: true,
          patternDetectionTypes: ["CALL_LONG_BUILDUP", "PUT_LONG_BUILDUP", "CALL_SHORT_COVER", "PUT_SHORT_COVER", "GAMMA_SQUEEZE", "VOLATILITY_SPIKE", "UNUSUAL_ACTIVITY", "MAX_PAIN"],
          apiRateLimit: 100000,
          isActive: true
        }
      ];

      for (const plan of plans) {
        await storage.createSubscriptionPlan(plan);
      }
      console.log("Subscription plans added successfully");
    }

    // Initialize service providers
    const existingProviders = await storage.getServiceProviders();
    if (existingProviders.length === 0) {
      console.log("Adding service providers to database...");
      
      const providers = [
        {
          providerName: "Angel One",
          apiKey: "P9ErUZG0",
          clientId: "R117172", 
          clientSecret: "7fcb7f2a-fd0a-4d12-a010-16d37fbdbd6e",
          baseUrl: "https://apiconnect.angelone.in",
          isActive: true,
          priority: 1
        },
        {
          providerName: "NSE",
          baseUrl: "https://www.nseindia.com",
          isActive: true,
          priority: 2
        },
        {
          providerName: "Yahoo Finance",
          baseUrl: "https://query1.finance.yahoo.com",
          isActive: true,
          priority: 3
        },
        {
          providerName: "Mock Provider",
          baseUrl: "internal://mock",
          isActive: true,
          priority: 4
        }
      ];

      for (const provider of providers) {
        await storage.createServiceProvider(provider);
      }
      console.log("Service providers added successfully");
    }

  } catch (error) {
    console.error("Error initializing sample data:", error);
  }

  // Centralized Data Feed Admin API Routes
  app.get("/api/admin/data-feed/status", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const metrics = centralizedDataFeed.getMetrics();
      const lastSnapshot = centralizedDataFeed.getLastSnapshot();
      
      res.json({
        status: metrics.isActive ? 'active' : 'inactive',
        dataProviderStatus: metrics.dataProviderStatus,
        connectedClients: metrics.connectedClientsCount,
        totalBroadcasts: metrics.totalBroadcasts,
        lastBroadcastTime: metrics.lastBroadcastTime,
        avgResponseTime: metrics.avgResponseTime,
        errorCount: metrics.errorCount,
        lastSnapshot: lastSnapshot ? {
          timestamp: lastSnapshot.timestamp,
          instrumentCount: Object.keys(lastSnapshot.instruments).length,
          marketSentiment: lastSnapshot.marketSentiment
        } : null
      });
    } catch (error) {
      console.error("Error fetching data feed status:", error);
      res.status(500).json({ error: "Failed to fetch data feed status" });
    }
  });

  app.post("/api/admin/data-feed/update-config", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { adminApiKey, adminClientId, adminSecret, adminPin, adminTotp } = req.body;
      
      const config = {
        ...(adminApiKey && { adminApiKey }),
        ...(adminClientId && { adminClientId }),
        ...(adminSecret && { adminSecret }),
        ...(adminPin && { adminPin }),
        ...(adminTotp && { adminTotp })
      };
      
      const updated = await centralizedDataFeed.updateConfig(config);
      
      if (updated) {
        res.json({ 
          success: true, 
          message: "Angel One credentials updated successfully",
          status: centralizedDataFeed.getMetrics().dataProviderStatus
        });
      } else {
        res.status(400).json({ 
          error: "Failed to update configuration" 
        });
      }
    } catch (error) {
      console.error("Error updating data feed config:", error);
      res.status(500).json({ error: "Failed to update data feed configuration" });
    }
  });

  app.get("/api/admin/data-feed/connected-clients", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const clients = centralizedDataFeed.getConnectedClients();
      res.json({
        connectedClients: clients,
        totalCount: clients.length
      });
    } catch (error) {
      console.error("Error fetching connected clients:", error);
      res.status(500).json({ error: "Failed to fetch connected clients" });
    }
  });

  app.get("/api/data-feed/snapshot", async (req, res) => {
    try {
      const snapshot = centralizedDataFeed.getLastSnapshot();
      
      if (snapshot) {
        res.json(snapshot);
      } else {
        res.status(503).json({ 
          error: "Data feed not ready", 
          message: "Centralized data feed is initializing" 
        });
      }
    } catch (error) {
      console.error("Error fetching market snapshot:", error);
      res.status(500).json({ error: "Failed to fetch market snapshot" });
    }
  });

  // Multi-Broker Configuration API Routes
  app.get("/api/admin/brokers", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const brokers = [
        {
          id: 'angel_one',
          name: 'Angel One',
          status: angelOneProvider.isAuthenticated() ? 'connected' : 'disconnected',
          connectionDetails: angelOneProvider.getConnectionStatus(),
          requiredFields: ['apiKey', 'clientId', 'secret', 'pin', 'totp'],
          profile: null
        },
        {
          id: 'dhan',
          name: 'Dhan',
          status: dhanProvider.isAuthenticated() ? 'connected' : 'disconnected',
          connectionDetails: dhanProvider.getConnectionStatus(),
          requiredFields: ['accessToken', 'clientId'],
          profile: null
        }
      ];

      // Fetch profiles for connected brokers
      for (const broker of brokers) {
        if (broker.status === 'connected') {
          try {
            if (broker.id === 'angel_one') {
              broker.profile = {
                clientId: broker.connectionDetails.clientId || 'Connected',
                status: 'Active'
              };
            } else if (broker.id === 'dhan') {
              broker.profile = await dhanProvider.getUserProfile();
            }
          } catch (error) {
            console.error(`Error fetching ${broker.name} profile:`, error);
          }
        }
      }

      res.json({ brokers });
    } catch (error) {
      console.error("Error fetching brokers:", error);
      res.status(500).json({ error: "Failed to fetch brokers" });
    }
  });

  app.post("/api/admin/brokers/:brokerId/configure", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { brokerId } = req.params;
      const credentials = req.body;

      let success = false;
      let profile = null;
      let message = '';

      if (brokerId === 'angel_one') {
        const { apiKey, clientId, secret, pin, totp } = credentials;
        
        if (!apiKey || !clientId || !secret || !pin) {
          return res.status(400).json({ error: "Missing required Angel One credentials" });
        }

        angelOneProvider['credentials'] = { apiKey, clientId, clientSecret: secret, pin, totp: totp || '' };
        
        success = await angelOneProvider.initialize();
        
        if (success) {
          message = 'Angel One connected successfully';
          profile = {
            clientId: clientId,
            status: 'Active',
            provider: 'Angel One'
          };
          
          await centralizedDataFeed.updateConfig({
            adminApiKey: apiKey,
            adminClientId: clientId,
            adminSecret: secret,
            adminPin: pin,
            adminTotp: totp
          });
        } else {
          message = 'Angel One connection failed. Please verify credentials.';
        }

      } else if (brokerId === 'dhan') {
        const { accessToken, clientId } = credentials;
        
        if (!accessToken || !clientId) {
          return res.status(400).json({ error: "Missing required Dhan credentials" });
        }

        dhanProvider.updateCredentials(accessToken, clientId);
        success = await dhanProvider.initialize();
        
        if (success) {
          message = 'Dhan connected successfully';
          profile = await dhanProvider.getUserProfile();
        } else {
          message = 'Dhan connection failed. Please verify credentials.';
        }

      } else {
        return res.status(400).json({ error: "Invalid broker ID" });
      }

      res.json({
        success,
        message,
        profile,
        status: success ? 'connected' : 'disconnected'
      });

    } catch (error) {
      console.error("Error configuring broker:", error);
      res.status(500).json({ error: "Failed to configure broker" });
    }
  });

  app.post("/api/admin/brokers/:brokerId/test", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { brokerId } = req.params;
      
      let profile = null;
      let status = 'disconnected';
      let message = '';

      if (brokerId === 'angel_one') {
        if (angelOneProvider.isAuthenticated()) {
          status = 'connected';
          message = 'Angel One connection is active';
          profile = {
            clientId: angelOneProvider.getConnectionStatus().clientId || 'Connected',
            status: 'Active',
            provider: 'Angel One'
          };
        } else {
          message = 'Angel One is not connected';
        }

      } else if (brokerId === 'dhan') {
        if (dhanProvider.isAuthenticated()) {
          status = 'connected';
          message = 'Dhan connection is active';
          profile = await dhanProvider.getUserProfile();
        } else {
          message = 'Dhan is not connected';
        }

      } else {
        return res.status(400).json({ error: "Invalid broker ID" });
      }

      res.json({
        status,
        message,
        profile,
        timestamp: new Date()
      });

    } catch (error) {
      console.error("Error testing broker connection:", error);
      res.status(500).json({ error: "Failed to test broker connection" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateMockOptionData() {
  const strikes = [21500, 21600, 21700, 21800, 21900, 22000, 22100, 22200, 22300, 22400, 22500];
  return strikes.map(strike => ({
    strike,
    callOI: Math.floor(Math.random() * 10000) + 1000,
    callOIChange: Math.floor(Math.random() * 2000) - 1000,
    callLTP: Math.floor(Math.random() * 100) + 10,
    callLTPChange: Math.floor(Math.random() * 20) - 10,
    callVolume: Math.floor(Math.random() * 5000),
    putOI: Math.floor(Math.random() * 10000) + 1000,
    putOIChange: Math.floor(Math.random() * 2000) - 1000,
    putLTP: Math.floor(Math.random() * 100) + 10,
    putLTPChange: Math.floor(Math.random() * 20) - 10,
    putVolume: Math.floor(Math.random() * 5000)
  }));
}
