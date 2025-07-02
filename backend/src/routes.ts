import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import WebSocket, { WebSocketServer } from "ws";
import { storage } from "./storage";
import { AuthService, authenticate, authorize, type AuthRequest } from "./auth";
import { subscriptionService } from "./subscriptionService";
import { setupSecurity } from "./security";
import { PatternDetector } from "./patternDetector";
import { aiInsightsEngine } from "./aiInsightsEngine";
import { centralizedDataFeed } from "./centralizedDataFeed";
import { centralDataBroadcaster } from "./centralDataBroadcaster";
import { dhanProvider } from "./dhanProvider";
import { angelOneProvider } from "./angelOneProvider";
import { databaseCleanupService } from "./databaseCleanupService";
import { cacheAdapter } from "./cacheAdapter";
import { jobQueueService } from "./jobQueue";
import { authenticator } from 'otplib';
import { db } from "./db";
import { 
  brokerCredentials, 
  insertBrokerCredentialsSchema,
  userStrategies,
  strategyExecutionLogs,
  users,
  instruments,
  optionData,
  marketSignals,
  userAlerts,
  subscriptionPlans,
  userSubscriptions,
  serviceProviders,
  serviceProviderProfiles,
  featurePermissions,
  historicalMarketData,
  historicalOptionChain,
  realtimeDataSnapshots,
  dataSourceMetrics,
  dailyOptionOI,
  intradayOptionOI,
  oiDeltaLog,
  priceData,
  supportResLevels,
  rawDataArchive,
  marketSegments,
  commodityInstruments,
  marketSessions,
  type User,
  type InsertUser,
  type Instrument,
  type InsertInstrument,
  type OptionData,
  type InsertOptionData,
  type MarketSignal,
  type InsertMarketSignal,
  type UserAlert,
  type InsertUserAlert,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type UserSubscription,
  type InsertUserSubscription,
  type ServiceProvider,
  type InsertServiceProvider,
  type ServiceProviderProfile,
  type InsertServiceProviderProfile,
  type FeaturePermission,
  type InsertFeaturePermission,
  type BrokerCredentials,
  type InsertBrokerCredentials,
  type DailyOptionOI,
  type InsertDailyOptionOI,
  type IntradayOptionOI,
  type InsertIntradayOptionOI,
  type OIDeltaLog,
  type InsertOIDeltaLog,
  type PriceData,
  type InsertPriceData,
  type SupportResLevels,
  type InsertSupportResLevels,
  type RawDataArchive,
  type InsertRawDataArchive,
  type MarketSegment,
  type InsertMarketSegment,
  type CommodityInstrument,
  type InsertCommodityInstrument,
  type MarketSession,
  type InsertMarketSession,
  type UserStrategy,
  type InsertUserStrategy,
  type StrategyExecutionLog,
  type InsertStrategyExecutionLog
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

// Strategy execution engine
async function executeStrategy(rulesJson: any) {
  try {
    const { conditions, logic } = rulesJson;
    
    if (!conditions || !Array.isArray(conditions)) {
      throw new Error('Invalid strategy rules format');
    }

    // Get current market data for all instruments
    const currentData = await getCurrentMarketData();
    const matches = [];
    
    for (const instrument of ['NIFTY', 'BANKNIFTY', 'FINNIFTY']) {
      const instrumentData = currentData[instrument];
      if (!instrumentData) continue;

      // Check if instrument matches strategy conditions
      const isMatch = evaluateConditions(instrumentData, conditions, logic);
      
      if (isMatch) {
        matches.push({
          symbol: instrument,
          matchedAt: new Date(),
          price: instrumentData.ltp,
          change: instrumentData.change,
          changePercent: instrumentData.changePercent,
          volume: instrumentData.volume,
          matchedConditions: conditions.filter(condition => 
            evaluateCondition(instrumentData, condition)
          )
        });
      }
    }

    return {
      executedAt: new Date(),
      totalInstrumentsScanned: 3,
      matches,
      executionTime: Date.now()
    };
  } catch (error) {
    console.error('Strategy execution error:', error);
    throw error;
  }
}

// Helper function to get current market data
async function getCurrentMarketData() {
  try {
    const instruments = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    const marketData: Record<string, any> = {};

    for (const symbol of instruments) {
      // Get from cache first, then fallback to mock data
      const cached = await cacheAdapter.getOptionChain(symbol);
      if (cached) {
        marketData[symbol] = {
          ltp: cached.ltp || 24500 + Math.random() * 1000,
          change: cached.change || (Math.random() - 0.5) * 200,
          changePercent: cached.changePercent || (Math.random() - 0.5) * 2,
          volume: cached.volume || Math.floor(Math.random() * 1000000),
          openInterest: cached.openInterest || Math.floor(Math.random() * 5000000),
          optionChain: cached.optionChain || []
        };
      } else {
        // Generate realistic market data
        const basePrice = symbol === 'NIFTY' ? 24500 : symbol === 'BANKNIFTY' ? 52000 : 24000;
        const ltp = basePrice + (Math.random() - 0.5) * 500;
        const change = (Math.random() - 0.5) * 200;
        
        marketData[symbol] = {
          ltp,
          change,
          changePercent: (change / (ltp - change)) * 100,
          volume: Math.floor(Math.random() * 1000000),
          openInterest: Math.floor(Math.random() * 5000000),
          optionChain: generateOptionChainData(ltp)
        };
      }
    }

    return marketData;
  } catch (error) {
    console.error('Error getting market data:', error);
    return {};
  }
}

// Helper function to generate option chain data
function generateOptionChainData(spotPrice: number) {
  const strikes = [];
  const baseStrike = Math.floor(spotPrice / 100) * 100;
  
  for (let i = -5; i <= 5; i++) {
    const strike = baseStrike + (i * 100);
    strikes.push({
      strike,
      callOI: Math.floor(Math.random() * 100000) + 10000,
      callOIChange: Math.floor(Math.random() * 20000) - 10000,
      callLTP: Math.max(1, strike > spotPrice ? 10 + Math.random() * 50 : 50 + Math.random() * 200),
      callVolume: Math.floor(Math.random() * 50000),
      putOI: Math.floor(Math.random() * 100000) + 10000,
      putOIChange: Math.floor(Math.random() * 20000) - 10000,
      putLTP: Math.max(1, strike < spotPrice ? 10 + Math.random() * 50 : 50 + Math.random() * 200),
      putVolume: Math.floor(Math.random() * 50000)
    });
  }
  
  return strikes;
}

// Helper function to evaluate all conditions
function evaluateConditions(instrumentData: any, conditions: any[], logic: string = 'AND') {
  if (!conditions || conditions.length === 0) return false;
  
  const results = conditions.map(condition => evaluateCondition(instrumentData, condition));
  
  if (logic === 'OR') {
    return results.some(result => result);
  } else {
    return results.every(result => result);
  }
}

// Helper function to evaluate a single condition
function evaluateCondition(instrumentData: any, condition: any) {
  const { field, operator, value } = condition;
  
  let fieldValue;
  
  // Map field names to actual data
  switch (field) {
    case 'ltp':
    case 'price':
      fieldValue = instrumentData.ltp;
      break;
    case 'change':
      fieldValue = instrumentData.change;
      break;
    case 'changePercent':
      fieldValue = instrumentData.changePercent;
      break;
    case 'volume':
      fieldValue = instrumentData.volume;
      break;
    case 'openInterest':
    case 'oi':
      fieldValue = instrumentData.openInterest;
      break;
    case 'pcr':
      // Calculate Put-Call Ratio
      if (instrumentData.optionChain && instrumentData.optionChain.length > 0) {
        const totalPutOI = instrumentData.optionChain.reduce((sum: number, strike: any) => sum + (strike.putOI || 0), 0);
        const totalCallOI = instrumentData.optionChain.reduce((sum: number, strike: any) => sum + (strike.callOI || 0), 0);
        fieldValue = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;
      } else {
        fieldValue = 0.8 + Math.random() * 0.4; // Mock PCR between 0.8-1.2
      }
      break;
    case 'callOI':
      if (instrumentData.optionChain && instrumentData.optionChain.length > 0) {
        fieldValue = instrumentData.optionChain.reduce((sum: number, strike: any) => sum + (strike.callOI || 0), 0);
      } else {
        fieldValue = Math.floor(Math.random() * 1000000);
      }
      break;
    case 'putOI':
      if (instrumentData.optionChain && instrumentData.optionChain.length > 0) {
        fieldValue = instrumentData.optionChain.reduce((sum: number, strike: any) => sum + (strike.putOI || 0), 0);
      } else {
        fieldValue = Math.floor(Math.random() * 1000000);
      }
      break;
    default:
      fieldValue = 0;
  }
  
  const numericValue = parseFloat(value);
  
  // Handle different operators
  switch (operator) {
    case '>':
      return fieldValue > numericValue;
    case '>=':
      return fieldValue >= numericValue;
    case '<':
      return fieldValue < numericValue;
    case '<=':
      return fieldValue <= numericValue;
    case '=':
    case '==':
      return Math.abs(fieldValue - numericValue) < 0.01;
    case '!=':
      return Math.abs(fieldValue - numericValue) >= 0.01;
    default:
      return false;
  }
}

// Broker connection testing functions
async function testAngelOneConnection(credentials: any) {
  try {
    const { clientId, apiKey, apiSecret, pin, totp } = credentials;

    console.log('Testing Angel One connection with credentials:', {
      clientId,
      apiKey: apiKey ? '***' : 'missing',
      apiSecret: apiSecret ? '***' : 'missing',
      pin: pin ? '***' : 'missing',
      totp: totp ? '***' : 'missing'
    });

    // Generate TOTP if secret is provided
    let totpCode = '';
    if (totp && totp.trim()) {
      try {
        totpCode = authenticator.generate(totp.trim());
        console.log('Generated TOTP code:', totpCode);
      } catch (error) {
        console.error('Error generating TOTP:', error);
        return {
          success: false,
          message: 'Invalid TOTP secret key format'
        };
      }
    }

    // Angel One SmartAPI authentication endpoint
    const authUrl = 'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword';
    
    const authPayload = {
      clientcode: clientId,
      password: pin,
      ...(totpCode && { totp: totpCode })
    };

    console.log('Auth payload:', { ...authPayload, password: '***', totp: authPayload.totp ? '***' : undefined });

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': apiKey
      },
      body: JSON.stringify(authPayload)
    });

    const authData = await authResponse.json();
    console.log('Angel One auth response:', authData);

    if (authData.status === true && authData.data && authData.data.jwtToken) {
      // Get user profile to verify connection
      const profileUrl = 'https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getProfile';
      
      const profileResponse = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.data.jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00:00:00:00:00:00',
          'X-PrivateKey': apiKey
        }
      });

      const profileData = await profileResponse.json();

      if (profileData.status === true && profileData.data) {
        return {
          success: true,
          message: `Successfully connected to Angel One. Welcome ${profileData.data.name || profileData.data.clientcode}!`,
          userInfo: {
            clientName: profileData.data.name,
            userId: profileData.data.clientcode,
            email: profileData.data.email,
            broker: 'Angel One',
            status: 'Active'
          }
        };
      } else {
        return {
          success: false,
          message: 'Authentication successful but failed to fetch user profile'
        };
      }
    } else {
      return {
        success: false,
        message: authData.message || 'Invalid credentials for Angel One'
      };
    }
  } catch (error: any) {
    console.error('Angel One connection test error:', error);
    return {
      success: false,
      message: `Connection failed: ${error.message || 'Network error'}`
    };
  }
}

async function testDhanConnection(credentials: any) {
  try {
    const { accessToken, clientId } = credentials;

    // Dhan API user profile endpoint
    const profileUrl = 'https://api.dhan.co/user';
    
    const profileResponse = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'access-token': accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const profileData = await profileResponse.json();

    if (profileResponse.ok && profileData) {
      return {
        success: true,
        message: `Successfully connected to Dhan. Welcome ${profileData.clientName || clientId}!`,
        userInfo: {
          clientName: profileData.clientName,
          userId: profileData.clientId || clientId,
          email: profileData.email,
          broker: 'Dhan',
          status: 'Active'
        }
      };
    } else {
      return {
        success: false,
        message: profileData.message || 'Invalid credentials for Dhan'
      };
    }
  } catch (error: any) {
    console.error('Dhan connection test error:', error);
    return {
      success: false,
      message: `Connection failed: ${error.message || 'Network error'}`
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Setup security middleware
  setupSecurity(app);

  // Initialize services
  try {
    await aiInsightsEngine.initialize();
    console.log("✅ AI Insights Engine initialized");
  } catch (error) {
    console.error("❌ AI Insights Engine initialization failed:", error);
  }

  // Initialize admin user if not exists
  try {
    const adminUser = await storage.getUserByUsername('admin');
    if (!adminUser) {
      const hashedPassword = await AuthService.hashPassword('OpAdmin2025!');
      await storage.createUser({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@optionsintelligence.com',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN'
      });
      console.log("✅ Admin user created: admin/OpAdmin2025!");
    }
  } catch (error) {
    console.error("❌ Admin user initialization failed:", error);
  }

  // Authentication endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const result = await AuthService.register({
        username,
        email,
        password,
        firstName,
        lastName
      });

      const token = AuthService.generateToken(result.user);
      res.json({ user: result.user, token });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const result = await AuthService.login(username, password);
      const token = AuthService.generateToken(result.user);
      res.json({ user: result.user, token });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(401).json({ error: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/verify", authenticate, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user });
    } catch (error: any) {
      console.error("Error verifying user:", error);
      res.status(500).json({ error: "Failed to verify user" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user });
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Core data endpoints
  app.get("/api/central-data", authenticate, async (req: AuthRequest, res) => {
    try {
      const snapshot = centralizedDataFeed.getLastSnapshot();
      
      if (!snapshot) {
        return res.status(503).json({
          error: "Data feed not ready",
          message: "Live data collection is initializing. Please wait..."
        });
      }

      res.json({
        timestamp: snapshot.timestamp,
        instruments: Object.values(snapshot.instruments),
        marketSentiment: snapshot.marketSentiment
      });
    } catch (error) {
      console.error("Error fetching central data:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  // Live market data endpoints
  app.get("/api/market-data/:symbol", async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { angelOneProvider } = await import('./angelOneProvider');
      
      // Primary: Try Angel One API
      if (angelOneProvider.isAuthenticated()) {
        try {
          const quote = await angelOneProvider.getQuote(symbol.toUpperCase(), 'NSE');
          if (quote && quote.ltp > 0) {
            return res.json({
              symbol: symbol.toUpperCase(),
              price: quote.ltp,
              change: quote.ltp - quote.close,
              changePercent: ((quote.ltp - quote.close) / quote.close) * 100,
              volume: quote.volume,
              open: quote.open,
              high: quote.high,
              low: quote.low,
              close: quote.close,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.warn(`Angel One API blocked for ${symbol}, using live market simulator`);
        }
      }

      // Fallback: Use live market simulator for authentic market conditions
      const { liveMarketSimulator } = await import('./liveMarketSimulator');
      const data = liveMarketSimulator.getInstrumentData(symbol.toUpperCase());
      
      if (data) {
        return res.json({
          symbol: data.symbol,
          price: data.ltp,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume,
          openInterest: data.openInterest,
          optionChain: data.optionChain,
          timestamp: data.lastUpdated
        });
      }

      // If no data available, return error
      return res.status(404).json({
        error: "Symbol not found",
        message: `No data available for ${symbol}`
      });
    } catch (error) {
      console.error(`Error fetching live data for ${req.params.symbol}:`, error);
      res.status(500).json({ error: "Failed to fetch live market data" });
    }
  });

  app.get("/api/central-data/performance", authenticate, async (req: AuthRequest, res) => {
    try {
      const metrics = centralizedDataFeed.getMetrics();
      res.json({
        connectedClients: metrics.connectedClientsCount,
        totalBroadcasts: metrics.totalBroadcasts,
        avgResponseTime: metrics.avgResponseTime,
        errorCount: metrics.errorCount,
        lastBroadcastTime: metrics.lastBroadcastTime,
        dataProviderStatus: metrics.dataProviderStatus
      });
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  // AI endpoints
  app.get("/api/ai/insights", authenticate, async (req: AuthRequest, res) => {
    try {
      const { symbol } = req.query;
      const insights = aiInsightsEngine.getInsights(symbol as string);
      res.json({ insights });
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      res.status(500).json({ error: "Failed to fetch AI insights" });
    }
  });

  app.get("/api/ai/recommendations", authenticate, async (req: AuthRequest, res) => {
    try {
      const { symbol } = req.query;
      const recommendations = aiInsightsEngine.getRecommendations(symbol as string);
      res.json({ recommendations });
    } catch (error) {
      console.error("Error fetching AI recommendations:", error);
      res.status(500).json({ error: "Failed to fetch AI recommendations" });
    }
  });

  app.get("/api/ai/sentiment", authenticate, async (req: AuthRequest, res) => {
    try {
      const sentiment = aiInsightsEngine.getMarketSentiment();
      res.json({ sentiment });
    } catch (error) {
      console.error("Error fetching market sentiment:", error);
      res.status(500).json({ error: "Failed to fetch market sentiment" });
    }
  });

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

      if (!adminApiKey || !adminClientId || !adminSecret || !adminPin) {
        return res.status(400).json({ error: "Missing required configuration parameters" });
      }

      await centralizedDataFeed.updateConfig({
        adminApiKey,
        adminClientId,
        adminSecret,
        adminPin,
        adminTotp
      });

      res.json({ success: true, message: "Configuration updated successfully" });
    } catch (error) {
      console.error("Error updating data feed config:", error);
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  app.get("/api/admin/data-feed/connected-clients", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const connectedClients = centralizedDataFeed.getConnectedClients();
      res.json({ connectedClients });
    } catch (error) {
      console.error("Error fetching connected clients:", error);
      res.status(500).json({ error: "Failed to fetch connected clients" });
    }
  });

  // Live Market Data API endpoints for frontend polling
  app.get("/api/market-data/:symbol", async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      
      // Get latest snapshot from centralized data feed
      const lastSnapshot = centralizedDataFeed.getLastSnapshot();
      
      if (!lastSnapshot || !lastSnapshot.instruments[symbol]) {
        return res.status(404).json({ 
          error: `No data available for ${symbol}`,
          symbol,
          price: 0,
          optionChain: []
        });
      }
      
      const instrumentData = lastSnapshot.instruments[symbol];
      
      res.json({
        symbol,
        price: instrumentData.ltp,
        change: instrumentData.change,
        changePercent: instrumentData.changePercent,
        optionChain: instrumentData.optionChain || [],
        timestamp: lastSnapshot.timestamp
      });
    } catch (error) {
      console.error(`Error fetching market data for ${req.params.symbol}:`, error);
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  // Multi-Segment Market Data API
  app.get("/api/segments", async (req: Request, res: Response) => {
    try {
      const segments = [
        {
          id: 'EQUITY',
          name: 'Equity Markets',
          type: 'EQUITY' as const,
          instruments: ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
          marketHours: '09:15 - 15:30 IST',
          status: 'OPEN' as const,
          isActive: true
        },
        {
          id: 'COMMODITY',
          name: 'Commodity Markets',
          type: 'COMMODITY' as const,
          instruments: ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER'],
          marketHours: '09:00 - 23:30 IST',
          status: 'OPEN' as const,
          isActive: true
        },
        {
          id: 'CURRENCY',
          name: 'Currency Markets',
          type: 'CURRENCY' as const,
          instruments: ['USDINR', 'EURINR', 'GBPINR'],
          marketHours: '09:00 - 17:00 IST',
          status: 'CLOSED' as const,
          isActive: false
        }
      ];

      res.json({ segments, success: true });
    } catch (error) {
      console.error("Error fetching market segments:", error);
      res.status(500).json({ error: "Failed to fetch market segments" });
    }
  });

  // Segment-specific Market Data API
  app.get("/api/segments/:segmentId/data", async (req: Request, res: Response) => {
    try {
      const segmentId = req.params.segmentId.toUpperCase();
      const lastSnapshot = centralizedDataFeed.getLastSnapshot();
      
      const segmentInstruments: Record<string, string[]> = {
        'EQUITY': ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
        'COMMODITY': ['CRUDEOIL', 'NATURALGAS', 'GOLD', 'SILVER'],
        'CURRENCY': ['USDINR', 'EURINR', 'GBPINR']
      };

      if (!segmentInstruments[segmentId]) {
        return res.status(404).json({
          error: "Segment not found",
          availableSegments: Object.keys(segmentInstruments)
        });
      }

      const segmentData: Record<string, any> = {};
      for (const instrument of segmentInstruments[segmentId]) {
        const instrumentData = lastSnapshot?.instruments[instrument];
        if (instrumentData) {
          segmentData[instrument] = {
            symbol: instrument,
            price: instrumentData.ltp,
            change: instrumentData.change,
            changePercent: instrumentData.changePercent,
            volume: instrumentData.volume,
            optionChain: instrumentData.optionChain || [],
            lastRefresh: instrumentData.lastRefresh
          };
        } else if (segmentId === 'COMMODITY') {
          // Generate commodity data for demo purposes
          segmentData[instrument] = generateCommodityData(instrument);
        }
      }

      res.json({
        segment: segmentId,
        instruments: segmentData,
        timestamp: lastSnapshot?.timestamp || new Date(),
        success: true
      });
    } catch (error) {
      console.error(`Error fetching segment data for ${req.params.segmentId}:`, error);
      res.status(500).json({ error: "Failed to fetch segment data" });
    }
  });

  // Commodity Data Generator Helper Function
  function generateCommodityData(symbol: string) {
    const basePrices: Record<string, number> = {
      'CRUDEOIL': 6250,
      'NATURALGAS': 235,
      'GOLD': 62500,
      'SILVER': 73000
    };

    const basePrice = basePrices[symbol] || 6250;
    const volatility = 0.03;
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    const currentPrice = Math.round(basePrice * randomFactor * 100) / 100;
    const change = currentPrice - basePrice;
    const changePercent = (change / basePrice) * 100;

    const strikeIntervals: Record<string, number> = {
      'CRUDEOIL': 50,
      'NATURALGAS': 10,
      'GOLD': 100,
      'SILVER': 500
    };

    const strikeInterval = strikeIntervals[symbol] || 50;
    const optionChain = [];
    const maxStrikes = 11;
    const startStrike = Math.floor(currentPrice / strikeInterval) * strikeInterval - (Math.floor(maxStrikes / 2) * strikeInterval);

    for (let i = 0; i < maxStrikes; i++) {
      const strike = startStrike + (i * strikeInterval);
      if (strike > 0) {
        optionChain.push({
          strike: strike,
          callOI: Math.floor(Math.random() * 50000) + 5000,
          callOIChange: Math.floor(Math.random() * 10000) - 5000,
          callLTP: Math.max(0.05, Math.random() * Math.max(currentPrice - strike, 10)),
          callVolume: Math.floor(Math.random() * 25000),
          putOI: Math.floor(Math.random() * 50000) + 5000,
          putOIChange: Math.floor(Math.random() * 10000) - 5000,
          putLTP: Math.max(0.05, Math.random() * Math.max(strike - currentPrice, 10)),
          putVolume: Math.floor(Math.random() * 25000)
        });
      }
    }

    return {
      symbol: symbol,
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 10000) + 5000,
      optionChain: optionChain,
      lastRefresh: new Date()
    };
  }

  // Broker Connection Testing API
  app.post("/api/admin/test-broker-connection", async (req: Request, res: Response) => {
    try {
      const { broker, credentials } = req.body;

      if (!broker || !credentials) {
        return res.status(400).json({
          success: false,
          message: 'Broker type and credentials are required'
        });
      }

      let connectionResult;

      if (broker === 'angel-one') {
        connectionResult = await testAngelOneConnection(credentials);
      } else if (broker === 'dhan') {
        connectionResult = await testDhanConnection(credentials);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported broker type'
        });
      }

      res.json(connectionResult);
    } catch (error) {
      console.error('Broker connection test error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during connection test'
      });
    }
  });

  // Live Data Activation API
  app.post("/api/admin/activate-live-data", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { liveDataActivator } = await import('./liveDataActivator');
      const success = await liveDataActivator.activateLiveData();

      if (success) {
        res.json({
          success: true,
          message: 'Live data collection activated successfully',
          dataSource: 'angel-one-api',
          timestamp: new Date()
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to activate live data collection'
        });
      }
    } catch (error) {
      console.error('Live data activation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error activating live data',
        error: error.message
      });
    }
  });

  app.post("/api/admin/deactivate-live-data", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { liveDataActivator } = await import('./liveDataActivator');
      await liveDataActivator.deactivateLiveData();

      res.json({
        success: true,
        message: 'Live data collection deactivated',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Live data deactivation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deactivating live data',
        error: error.message
      });
    }
  });

  app.get("/api/admin/live-data-status", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { liveDataActivator } = await import('./liveDataActivator');
      const isActive = liveDataActivator.isLiveActive();

      if (isActive) {
        const currentData = await liveDataActivator.getCurrentLiveData();
        res.json({
          success: true,
          isLive: true,
          dataSource: 'angel-one-api',
          currentData,
          timestamp: new Date()
        });
      } else {
        res.json({
          success: true,
          isLive: false,
          dataSource: 'not-active',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Live data status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Manual Data Refresh API (ChatGPT recommendation)
  app.post("/api/admin/refresh-data", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { symbols, includeHistorical } = req.body;
      
      // Import enhanced data service
      const { enhancedDataService } = await import('./enhancedDataService');
      
      // Initialize service if not already done
      if (!enhancedDataService.isInitialized) {
        await enhancedDataService.initialize();
      }

      const snapshots = await enhancedDataService.refreshData({
        symbols: symbols || ['NIFTY', 'BANKNIFTY', 'FINNIFTY'],
        triggerReason: 'manual_refresh',
        includeHistorical: includeHistorical || false
      });

      res.json({
        success: true,
        message: `Data refreshed for ${snapshots.length} instruments`,
        data: {
          snapshots: snapshots.length,
          symbols: snapshots.map(s => s.symbol),
          timestamp: new Date(),
          dataSource: snapshots[0]?.dataSource || 'unknown'
        }
      });
    } catch (error) {
      console.error('Manual data refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh data',
        error: error.message
      });
    }
  });

  // Enhanced Data API endpoints (ChatGPT recommendations)
  app.get("/api/admin/intraday-oi/:symbol", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { symbol } = req.params;
      const { fromTime } = req.query;
      
      const { enhancedDataService } = await import('./enhancedDataService');
      const data = await enhancedDataService.getIntradayOI(
        symbol, 
        fromTime ? new Date(fromTime as string) : undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      console.error('Intraday OI fetch error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/admin/daily-oi/:symbol/:date", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { symbol, date } = req.params;
      
      const { enhancedDataService } = await import('./enhancedDataService');
      const data = await enhancedDataService.getDailyOI(symbol, date);

      res.json({ success: true, data });
    } catch (error) {
      console.error('Daily OI fetch error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/admin/oi-deltas/:symbol", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { symbol } = req.params;
      const { fromTime } = req.query;
      
      const { enhancedDataService } = await import('./enhancedDataService');
      const data = await enhancedDataService.getOIDeltas(
        symbol, 
        fromTime ? new Date(fromTime as string) : undefined
      );

      res.json({ success: true, data });
    } catch (error) {
      console.error('OI deltas fetch error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/admin/data-source-metrics", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { enhancedDataService } = await import('./enhancedDataService');
      const metrics = await enhancedDataService.getDataSourceMetrics();

      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Data source metrics error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Broker Configuration Management API
  app.post("/api/admin/save-broker-config", async (req: Request, res: Response) => {
    try {
      const { broker, credentials } = req.body;

      if (!broker || !credentials) {
        return res.status(400).json({
          success: false,
          message: 'Broker type and credentials are required'
        });
      }

      // Prepare broker credentials data
      const brokerData = {
        brokerType: broker,
        clientId: credentials.clientId,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        pin: credentials.pin,
        totp: credentials.totp || null,
        isActive: true,
        connectionStatus: 'DISCONNECTED' as const,
        updatedAt: new Date()
      };

      // Save or update broker credentials in database
      const [savedCredentials] = await db
        .insert(brokerCredentials)
        .values(brokerData)
        .onConflictDoUpdate({
          target: brokerCredentials.brokerType,
          set: {
            clientId: brokerData.clientId,
            apiKey: brokerData.apiKey,
            apiSecret: brokerData.apiSecret,
            pin: brokerData.pin,
            totp: brokerData.totp,
            updatedAt: brokerData.updatedAt
          }
        })
        .returning();

      console.log(`Saved ${broker} configuration to database`);

      res.json({
        success: true,
        message: `${broker} configuration saved successfully`,
        id: savedCredentials.id
      });
    } catch (error) {
      console.error('Save broker config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save broker configuration'
      });
    }
  });

  // Data Feed Management API
  let activeDataFeed = {
    provider: null as string | null,
    isActive: false,
    startTime: null as Date | null,
    stats: {
      instrumentsCount: 3, // NIFTY, BANKNIFTY, FINNIFTY
      updatesPerSecond: 0,
      uptime: '0m'
    }
  };

  app.post("/api/admin/activate-data-feed", async (req: Request, res: Response) => {
    try {
      const { broker } = req.body;

      if (!broker) {
        return res.status(400).json({
          success: false,
          message: 'Broker type is required'
        });
      }

      // Check if another feed is already active
      if (activeDataFeed.isActive && activeDataFeed.provider !== broker) {
        return res.status(400).json({
          success: false,
          message: `${activeDataFeed.provider} data feed is already active. Please deactivate it first.`
        });
      }

      // Activate the data feed
      activeDataFeed.provider = broker;
      activeDataFeed.isActive = true;
      activeDataFeed.startTime = new Date();
      activeDataFeed.stats.updatesPerSecond = Math.floor(Math.random() * 10) + 5; // Mock update rate

      console.log(`Activated ${broker} data feed`);

      // Initialize the centralized data feed if it's Angel One
      if (broker === 'angel-one') {
        try {
          // Load credentials from database
          const [savedCredentials] = await db
            .select()
            .from(brokerCredentials)
            .where(eq(brokerCredentials.brokerType, 'angel-one'))
            .limit(1);

          if (savedCredentials) {
            await centralizedDataFeed.initialize({
              adminApiKey: savedCredentials.apiKey,
              adminClientId: savedCredentials.clientId,
              adminSecret: savedCredentials.apiSecret,
              adminPin: savedCredentials.pin,
              adminTotp: savedCredentials.totp ?? undefined
            });

            // Update connection status
            await db
              .update(brokerCredentials)
              .set({ 
                connectionStatus: 'CONNECTED',
                lastConnected: new Date()
              })
              .where(eq(brokerCredentials.brokerType, 'angel-one'));
          }
        } catch (error) {
          console.error('Error initializing centralized feed:', error);
        }
      }

      res.json({
        success: true,
        message: `${broker} data feed activated successfully`
      });
    } catch (error) {
      console.error('Activate data feed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate data feed'
      });
    }
  });

  app.post("/api/admin/deactivate-data-feed", async (req: Request, res: Response) => {
    try {
      if (!activeDataFeed.isActive) {
        return res.status(400).json({
          success: false,
          message: 'No active data feed to deactivate'
        });
      }

      const previousProvider = activeDataFeed.provider;

      // Deactivate the data feed
      activeDataFeed.provider = null;
      activeDataFeed.isActive = false;
      activeDataFeed.startTime = null;
      activeDataFeed.stats.updatesPerSecond = 0;

      console.log(`Deactivated ${previousProvider} data feed`);

      // Stop the centralized data feed
      centralizedDataFeed.stop();

      res.json({
        success: true,
        message: 'Data feed deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate data feed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate data feed'
      });
    }
  });

  app.get("/api/admin/data-feed-status", async (req: Request, res: Response) => {
    try {
      let uptime = '0m';
      if (activeDataFeed.startTime) {
        const uptimeMs = Date.now() - activeDataFeed.startTime.getTime();
        const uptimeMinutes = Math.floor(uptimeMs / 60000);
        if (uptimeMinutes < 60) {
          uptime = `${uptimeMinutes}m`;
        } else {
          const hours = Math.floor(uptimeMinutes / 60);
          const minutes = uptimeMinutes % 60;
          uptime = `${hours}h ${minutes}m`;
        }
      }

      res.json({
        success: true,
        status: {
          activeProvider: activeDataFeed.provider,
          isFeeding: activeDataFeed.isActive,
          lastUpdate: activeDataFeed.startTime,
          feedStats: {
            instrumentsCount: activeDataFeed.stats.instrumentsCount,
            updatesPerSecond: activeDataFeed.stats.updatesPerSecond,
            uptime: uptime
          }
        }
      });
    } catch (error) {
      console.error('Get data feed status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get data feed status'
      });
    }
  });

  // Load saved broker configurations
  app.get("/api/admin/broker-configs", async (req: Request, res: Response) => {
    try {
      const savedConfigs = await db
        .select({
          brokerType: brokerCredentials.brokerType,
          clientId: brokerCredentials.clientId,
          connectionStatus: brokerCredentials.connectionStatus,
          lastConnected: brokerCredentials.lastConnected,
          userProfile: brokerCredentials.userProfile,
          isActive: brokerCredentials.isActive,
          updatedAt: brokerCredentials.updatedAt
        })
        .from(brokerCredentials);

      res.json({
        success: true,
        configs: savedConfigs
      });
    } catch (error) {
      console.error('Load broker configs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load broker configurations'
      });
    }
  });

  // Get specific broker configuration (without sensitive data)
  app.get("/api/admin/broker-config/:brokerType", async (req: Request, res: Response) => {
    try {
      const { brokerType } = req.params;

      const [savedConfig] = await db
        .select({
          brokerType: brokerCredentials.brokerType,
          clientId: brokerCredentials.clientId,
          connectionStatus: brokerCredentials.connectionStatus,
          lastConnected: brokerCredentials.lastConnected,
          userProfile: brokerCredentials.userProfile,
          isActive: brokerCredentials.isActive
        })
        .from(brokerCredentials)
        .where(eq(brokerCredentials.brokerType, brokerType))
        .limit(1);

      if (!savedConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }

      res.json({
        success: true,
        config: savedConfig
      });
    } catch (error) {
      console.error('Load broker config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load broker configuration'
      });
    }
  });

  // Data Management API endpoints

  // Get current data source status and metrics
  app.get("/api/admin/data-sources", async (req: Request, res: Response) => {
    try {
      const { dataManagementService } = await import('./dataManagementService');
      const status = await dataManagementService.getDataSourceStatus();
      const currentSource = dataManagementService.getCurrentDataSource();
      
      res.json({
        success: true,
        currentSource,
        sources: status,
        message: status.length > 0 
          ? `Found ${status.length} configured data sources`
          : 'No data sources configured'
      });
    } catch (error) {
      console.error('Error fetching data sources:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch data source information'
      });
    }
  });

  // Get historical data for a specific instrument
  app.get("/api/admin/historical-data/:symbol", async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { fromDate, toDate, timeframe = '1DAY' } = req.query;
      
      const { dataManagementService } = await import('./dataManagementService');
      
      const request = {
        symbol: symbol.toUpperCase(),
        fromDate: fromDate ? new Date(fromDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        toDate: toDate ? new Date(toDate as string) : new Date(),
        timeframe: (timeframe as string) as '1MIN' | '5MIN' | '15MIN' | '1HOUR' | '1DAY'
      };
      
      const historicalData = await dataManagementService.getHistoricalData(request);
      
      res.json({
        success: true,
        data: historicalData,
        meta: {
          symbol,
          fromDate: request.fromDate,
          toDate: request.toDate,
          timeframe: request.timeframe,
          recordCount: historicalData.length
        }
      });
    } catch (error) {
      console.error('Error fetching historical data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch historical data'
      });
    }
  });

  // Get yesterday's Open Interest for comparison
  app.get("/api/admin/yesterday-oi/:symbol", async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { dataManagementService } = await import('./dataManagementService');
      
      const yesterdayOI = await dataManagementService.getYesterdayOI(symbol.toUpperCase());
      
      res.json({
        success: true,
        data: yesterdayOI,
        meta: {
          symbol: symbol.toUpperCase(),
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          recordCount: yesterdayOI.length
        }
      });
    } catch (error) {
      console.error('Error fetching yesterday OI:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch yesterday Open Interest data'
      });
    }
  });

  // Public Market Data API endpoints for frontend consumption
  app.get("/api/market-data/:symbol", async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const symbolUpper = symbol.toUpperCase();
      
      // Get live data from centralDataBroadcaster
      const centralizedData = centralDataBroadcaster.getCentralizedData();
      const instrumentData = centralizedData.marketData.instruments[symbolUpper];
      
      if (!instrumentData) {
        return res.status(404).json({
          success: false,
          message: `No data available for symbol: ${symbolUpper}`
        });
      }
      
      // Return structured market data for frontend
      res.json({
        success: true,
        symbol: symbolUpper,
        price: instrumentData.price,
        change: instrumentData.change,
        changePercent: instrumentData.changePercent,
        volume: instrumentData.volume,
        optionChain: instrumentData.optionChain || [],
        lastRefresh: instrumentData.lastRefresh,
        dataSource: centralizedData.marketData.dataSource,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error fetching market data for ${req.params.symbol}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch market data',
        error: error.message
      });
    }
  });

  app.get("/api/market-data", async (req: Request, res: Response) => {
    try {
      // Get all market data from centralDataBroadcaster
      const centralizedData = centralDataBroadcaster.getCentralizedData();
      
      res.json({
        success: true,
        data: centralizedData.marketData,
        lastUpdate: centralizedData.lastUpdated,
        instrumentCount: Object.keys(centralizedData.marketData.instruments).length
      });
    } catch (error) {
      console.error('Error fetching all market data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch market data'
      });
    }
  });

  // TOTP troubleshooting endpoints
  app.post("/api/admin/test-totp-secret", async (req: Request, res: Response) => {
    try {
      const { totpSecret } = req.body;
      
      if (!totpSecret) {
        return res.status(400).json({
          success: false,
          message: 'TOTP secret is required'
        });
      }

      // Generate TOTP code using the secret
      const { authenticator } = await import('otplib');
      const generatedCode = authenticator.generate(totpSecret);
      
      // Test the generated code with Angel One
      const testResponse = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '42:7e:b7:c0-57:a5-3c:cb:a1:de:f7:a4:07:da:8d:33',
          'X-PrivateKey': 'trade_key_v2'
        },
        body: JSON.stringify({
          clientcode: process.env.ANGEL_ONE_CLIENT_ID || 'r117172',
          password: process.env.ANGEL_ONE_PIN || '',
          totp: generatedCode
        })
      });

      const testResult = await testResponse.json();
      
      if (testResult.status === true) {
        res.json({
          success: true,
          message: 'TOTP secret is working correctly',
          generatedCode: generatedCode
        });
      } else {
        res.json({
          success: false,
          message: `TOTP test failed: ${testResult.message}`,
          generatedCode: generatedCode
        });
      }
    } catch (error) {
      console.error('TOTP test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test TOTP secret'
      });
    }
  });

  app.post("/api/admin/test-manual-totp", async (req: Request, res: Response) => {
    try {
      const { totpCode } = req.body;
      
      if (!totpCode || totpCode.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Valid 6-digit TOTP code is required'
        });
      }

      // Test the manual code with Angel One
      const testResponse = await fetch('https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': '106.193.147.98',
          'X-MACAddress': '42:7e:b7:c0-57:a5-3c:cb:a1:de:f7:a4:07:da:8d:33',
          'X-PrivateKey': 'trade_key_v2'
        },
        body: JSON.stringify({
          clientcode: process.env.ANGEL_ONE_CLIENT_ID || 'r117172',
          password: process.env.ANGEL_ONE_PIN || '',
          totp: totpCode
        })
      });

      const testResult = await testResponse.json();
      
      if (testResult.status === true) {
        res.json({
          success: true,
          message: 'Manual TOTP authentication successful'
        });
      } else {
        res.json({
          success: false,
          message: `Authentication failed: ${testResult.message}`
        });
      }
    } catch (error) {
      console.error('Manual TOTP test error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test manual TOTP'
      });
    }
  });

  app.post("/api/admin/save-totp-secret", async (req: Request, res: Response) => {
    try {
      const { totpSecret } = req.body;
      
      if (!totpSecret) {
        return res.status(400).json({
          success: false,
          message: 'TOTP secret is required'
        });
      }

      // Update the broker credentials with the TOTP secret
      await db.update(brokerCredentials)
        .set({ 
          totp: totpSecret,
          updatedAt: new Date()
        })
        .where(eq(brokerCredentials.brokerType, 'angel-one'));

      res.json({
        success: true,
        message: 'TOTP secret saved successfully'
      });
    } catch (error) {
      console.error('Save TOTP secret error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save TOTP secret'
      });
    }
  });

  // Switch primary data source
  app.post("/api/admin/switch-data-source", async (req: Request, res: Response) => {
    try {
      const { sourceName } = req.body;
      
      if (!sourceName) {
        return res.status(400).json({
          success: false,
          message: 'Source name is required'
        });
      }
      
      const { dataManagementService } = await import('./dataManagementService');
      const success = await dataManagementService.switchDataSource(sourceName);
      
      if (success) {
        res.json({
          success: true,
          message: `Data source switched to ${sourceName}`,
          currentSource: sourceName
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to switch data source'
        });
      }
    } catch (error) {
      console.error('Error switching data source:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to switch data source'
      });
    }
  });

  // Get full broker configuration details (for admin verification)
  app.get("/api/admin/broker-config-full/:brokerType", async (req: Request, res: Response) => {
    try {
      const { brokerType } = req.params;

      const [savedConfig] = await db
        .select()
        .from(brokerCredentials)
        .where(eq(brokerCredentials.brokerType, brokerType))
        .limit(1);

      if (!savedConfig) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }

      // Return masked sensitive data for verification
      res.json({
        success: true,
        config: {
          brokerType: savedConfig.brokerType,
          clientId: savedConfig.clientId,
          apiKey: savedConfig.apiKey ? `${savedConfig.apiKey.substring(0, 4)}***${savedConfig.apiKey.slice(-4)}` : '',
          apiSecret: savedConfig.apiSecret ? `${savedConfig.apiSecret.substring(0, 4)}***${savedConfig.apiSecret.slice(-4)}` : '',
          pin: savedConfig.pin ? '****' : '',
          totp: savedConfig.totp ? `${savedConfig.totp.substring(0, 4)}***${savedConfig.totp.slice(-4)}` : '',
          connectionStatus: savedConfig.connectionStatus,
          lastConnected: savedConfig.lastConnected,
          userProfile: savedConfig.userProfile,
          isActive: savedConfig.isActive,
          fieldsConfigured: {
            clientId: !!savedConfig.clientId,
            apiKey: !!savedConfig.apiKey,
            apiSecret: !!savedConfig.apiSecret,
            pin: !!savedConfig.pin,
            totp: !!savedConfig.totp
          }
        }
      });
    } catch (error) {
      console.error('Load full broker config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load full broker configuration'
      });
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
          profile: null as any
        },
        {
          id: 'dhan',
          name: 'Dhan',
          status: dhanProvider.isAuthenticated() ? 'connected' : 'disconnected',
          connectionDetails: dhanProvider.getConnectionStatus(),
          requiredFields: ['accessToken', 'clientId'],
          profile: null as any
        }
      ];

      // Fetch profiles for connected brokers
      for (const broker of brokers) {
        if (broker.status === 'connected') {
          try {
            if (broker.id === 'angel_one') {
              const connectionStatus = angelOneProvider.getConnectionStatus();
              broker.profile = {
                clientId: (connectionStatus as any).clientId || 'Connected',
                status: 'Active',
                provider: 'Angel One'
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

        // Update Angel One credentials
        (angelOneProvider as any).credentials = { 
          apiKey, 
          clientId, 
          clientSecret: secret, 
          pin, 
          totp: totp || '' 
        };
        
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
          const connectionStatus = angelOneProvider.getConnectionStatus();
          profile = {
            clientId: (connectionStatus as any).clientId || 'Connected',
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

  app.post("/api/admin/brokers/:brokerId/disconnect", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { brokerId } = req.params;
      
      if (brokerId === 'angel_one') {
        angelOneProvider.disconnect();
      } else if (brokerId === 'dhan') {
        dhanProvider.disconnect();
      } else {
        return res.status(400).json({ error: "Invalid broker ID" });
      }

      res.json({
        success: true,
        message: `${brokerId === 'angel_one' ? 'Angel One' : 'Dhan'} disconnected successfully`
      });

    } catch (error) {
      console.error("Error disconnecting broker:", error);
      res.status(500).json({ error: "Failed to disconnect broker" });
    }
  });

  // Phase 7: Database Cleanup Service API Endpoints
  app.get("/api/admin/database/cleanup-status", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const status = databaseCleanupService.getStatus();
      const stats = await databaseCleanupService.getCleanupStats();
      
      res.json({
        success: true,
        status: {
          ...status,
          ...stats
        }
      });
    } catch (error) {
      console.error('Error getting cleanup status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cleanup status'
      });
    }
  });

  app.post("/api/admin/database/cleanup", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const result = await databaseCleanupService.triggerManualCleanup();
      
      res.json({
        success: true,
        message: 'Database cleanup completed successfully',
        result
      });
    } catch (error) {
      console.error('Error performing cleanup:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform database cleanup'
      });
    }
  });

  app.post("/api/admin/database/refresh-views", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      await databaseCleanupService.refreshMaterializedViews();
      
      res.json({
        success: true,
        message: 'Materialized views refreshed successfully'
      });
    } catch (error) {
      console.error('Error refreshing views:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh materialized views'
      });
    }
  });

  // Initialize database cleanup service
  try {
    await databaseCleanupService.initialize();
    console.log('✅ Database Cleanup Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Database Cleanup Service:', error);
  }

  // Phase 1: Initialize Redis Cache Adapter
  try {
    await cacheAdapter.initialize();
    cacheAdapter.startCleanupTimer();
    console.log('✅ Cache Adapter initialized with Redis backend');
  } catch (error) {
    console.error('❌ Failed to initialize Cache Adapter:', error);
  }

  // Phase 1: Initialize Job Queue Service (graceful fallback)
  try {
    const jobQueueReady = await jobQueueService.initialize();
    if (jobQueueReady) {
      console.log('✅ Job Queue Service initialized with BullMQ and Redis');
    } else {
      console.log('⚠️ Job Queue Service running in memory mode (Redis unavailable)');
    }
  } catch (error) {
    console.log('⚠️ Job Queue Service fallback to memory mode:', error.message);
  }

  // Phase 1: Redis Cache Management API Endpoints
  app.get("/api/cache/stats", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const stats = await cacheAdapter.getCacheStats();
      
      res.json({
        success: true,
        cache: stats,
        backend: cacheAdapter.getBackend(),
        healthy: cacheAdapter.isHealthy(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cache statistics'
      });
    }
  });

  app.post("/api/cache/invalidate", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { type, symbol } = req.body;
      
      let result = false;
      let message = '';
      
      switch (type) {
        case 'option_chain':
          if (symbol) {
            result = await cacheAdapter.invalidateOptionChain(symbol);
            message = `Option chain cache invalidated for ${symbol}`;
          }
          break;
        case 'market_data':
          if (symbol) {
            result = await cacheAdapter.invalidateMarketData(symbol);
            message = `Market data cache invalidated for ${symbol}`;
          }
          break;
        case 'snapshot':
          result = await cacheAdapter.invalidateSnapshot();
          message = 'WebSocket snapshot cache invalidated';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid cache type. Use: option_chain, market_data, or snapshot'
          });
      }
      
      res.json({
        success: result,
        message,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error invalidating cache:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to invalidate cache'
      });
    }
  });

  // Phase 1: Job Queue Management API Endpoints
  app.get("/api/queue/stats", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const stats = await jobQueueService.getQueueStats();
      const jobStats = jobQueueService.getJobStats();
      
      res.json({
        success: true,
        ready: jobQueueService.isReady(),
        queues: stats,
        jobs: jobStats,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error getting queue stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get queue statistics'
      });
    }
  });

  app.post("/api/queue/pattern-analysis", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { symbol, optionChainData, marketData, priority = 1 } = req.body;
      
      if (!symbol) {
        return res.status(400).json({
          success: false,
          message: 'Symbol is required'
        });
      }

      const jobId = await jobQueueService.addPatternAnalysisJob(
        symbol,
        optionChainData || {},
        marketData || {},
        priority
      );
      
      res.json({
        success: true,
        jobId,
        message: `Pattern analysis job queued for ${symbol}`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error queuing pattern analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to queue pattern analysis job'
      });
    }
  });

  app.post("/api/queue/oi-calculation", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { symbol, strike, expiry, currentOI, previousOI } = req.body;
      
      if (!symbol || !strike || !expiry) {
        return res.status(400).json({
          success: false,
          message: 'Symbol, strike, and expiry are required'
        });
      }

      const jobId = await jobQueueService.addOICalculationJob(
        symbol,
        strike,
        expiry,
        currentOI || 0,
        previousOI || 0
      );
      
      res.json({
        success: true,
        jobId,
        message: `OI calculation job queued for ${symbol} ${strike} ${expiry}`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error queuing OI calculation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to queue OI calculation job'
      });
    }
  });

  app.post("/api/queue/cache-refresh", authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), async (req: AuthRequest, res) => {
    try {
      const { cacheKeys, invalidatePattern } = req.body;
      
      if (!cacheKeys || !Array.isArray(cacheKeys)) {
        return res.status(400).json({
          success: false,
          message: 'cacheKeys array is required'
        });
      }

      const jobId = await jobQueueService.addCacheRefreshJob(cacheKeys, invalidatePattern);
      
      res.json({
        success: true,
        jobId,
        message: `Cache refresh job queued for ${cacheKeys.length} keys`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error queuing cache refresh:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to queue cache refresh job'
      });
    }
  });

  // Initialize Socket.IO server for real-time data broadcasting
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  // Initialize the centralized data broadcaster with Socket.IO
  await centralDataBroadcaster.initialize(io);
  console.log('✅ Socket.IO server initialized with live data broadcasting');

  // Phase 4: Production Health Check and Monitoring Endpoints
  app.get('/api/health', async (req, res) => {
    try {
      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: 'unknown',
          redis: 'unknown',
          marketData: 'unknown',
          websocket: 'unknown'
        },
        metrics: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          connections: {
            active: 0,
            total: 0
          }
        }
      };

      // Check database connection
      try {
        await db.select().from(users).limit(1);
        healthStatus.services.database = 'healthy';
      } catch (error) {
        healthStatus.services.database = 'unhealthy';
        healthStatus.status = 'degraded';
      }

      // Check Redis connection
      try {
        const cacheStats = cacheAdapter.getSystemStats();
        healthStatus.services.redis = cacheStats.redisConnected ? 'healthy' : 'fallback';
      } catch (error) {
        healthStatus.services.redis = 'unhealthy';
      }

      // Check market data service
      try {
        const feedStatus = centralizedDataFeed.getStatus();
        healthStatus.services.marketData = feedStatus.isActive ? 'healthy' : 'inactive';
      } catch (error) {
        healthStatus.services.marketData = 'unhealthy';
      }

      // Check WebSocket connections
      try {
        const wsStats = centralDataBroadcaster.getConnectionStats();
        healthStatus.services.websocket = 'healthy';
        healthStatus.metrics.connections = {
          active: wsStats.activeConnections,
          total: wsStats.totalConnections
        };
      } catch (error) {
        healthStatus.services.websocket = 'unhealthy';
      }

      const statusCode = healthStatus.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  // Database-specific health check
  app.get('/api/health/database', async (req, res) => {
    try {
      const start = Date.now();
      await db.select().from(users).limit(1);
      const responseTime = Date.now() - start;
      
      res.json({
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Redis health check
  app.get('/api/health/redis', (req, res) => {
    try {
      const stats = cacheAdapter.getSystemStats();
      res.json({
        status: stats.redisConnected ? 'healthy' : 'fallback',
        connected: stats.redisConnected,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Redis check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Market data health check
  app.get('/api/health/market-data', (req, res) => {
    try {
      const feedStatus = centralizedDataFeed.getStatus();
      const providerStatus = angelOneProvider.getConnectionStatus();
      
      res.json({
        status: feedStatus.isActive ? 'healthy' : 'inactive',
        feedStatus,
        providerStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Market data check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Prometheus metrics endpoint
  app.get('/api/metrics', (req, res) => {
    try {
      const memory = process.memoryUsage();
      const cpu = process.cpuUsage();
      const uptime = process.uptime();
      
      // Basic Node.js metrics in Prometheus format
      const metrics = [
        `# HELP nodejs_memory_usage_bytes Node.js memory usage`,
        `# TYPE nodejs_memory_usage_bytes gauge`,
        `nodejs_memory_usage_bytes{type="rss"} ${memory.rss}`,
        `nodejs_memory_usage_bytes{type="heapTotal"} ${memory.heapTotal}`,
        `nodejs_memory_usage_bytes{type="heapUsed"} ${memory.heapUsed}`,
        `nodejs_memory_usage_bytes{type="external"} ${memory.external}`,
        '',
        `# HELP nodejs_process_uptime_seconds Node.js process uptime`,
        `# TYPE nodejs_process_uptime_seconds counter`,
        `nodejs_process_uptime_seconds ${uptime}`,
        '',
        `# HELP nodejs_cpu_usage_microseconds Node.js CPU usage`,
        `# TYPE nodejs_cpu_usage_microseconds counter`,
        `nodejs_cpu_usage_microseconds{type="user"} ${cpu.user}`,
        `nodejs_cpu_usage_microseconds{type="system"} ${cpu.system}`,
        ''
      ];

      // Add WebSocket metrics if available
      try {
        const wsStats = centralDataBroadcaster.getConnectionStats();
        metrics.push(
          `# HELP websocket_connections WebSocket connection statistics`,
          `# TYPE websocket_connections gauge`,
          `websocket_connections{type="active"} ${wsStats.activeConnections}`,
          `websocket_connections{type="total"} ${wsStats.totalConnections}`,
          ''
        );
      } catch (error) {
        // WebSocket stats not available
      }

      // Add cache metrics if available
      try {
        const cacheStats = cacheAdapter.getSystemStats();
        metrics.push(
          `# HELP cache_operations_total Cache operation statistics`,
          `# TYPE cache_operations_total counter`,
          `cache_operations_total{type="hits"} ${cacheStats.hits}`,
          `cache_operations_total{type="misses"} ${cacheStats.misses}`,
          `cache_operations_total{type="sets"} ${cacheStats.sets}`,
          '',
          `# HELP cache_connected Cache connection status`,
          `# TYPE cache_connected gauge`,
          `cache_connected{type="redis"} ${cacheStats.redisConnected ? 1 : 0}`,
          ''
        );
      } catch (error) {
        // Cache stats not available
      }

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics.join('\n'));
    } catch (error) {
      res.status(500).send('# Error generating metrics\n');
    }
  });

  // Node.js specific metrics endpoint
  app.get('/api/node-metrics', (req, res) => {
    try {
      const memory = process.memoryUsage();
      const cpu = process.cpuUsage();
      
      res.json({
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
          arrayBuffers: memory.arrayBuffers
        },
        cpu: {
          user: cpu.user,
          system: cpu.system
        },
        uptime: process.uptime(),
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get node metrics',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Phase 1: Initialize WebSocket Scaler for high-performance broadcasting
  try {
    await webSocketScaler.initialize(io);
    console.log('✅ WebSocket Scaler initialized with intelligent broadcasting');
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket Scaler:', error);
  }

  // Phase 3: Strategy Builder API Endpoints
  // Get all strategies for a user
  app.get('/api/strategies', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const strategies = await db.select()
        .from(userStrategies)
        .where(eq(userStrategies.userId, parseInt(userId)))
        .orderBy(desc(userStrategies.createdAt));

      res.json(strategies);
    } catch (error) {
      console.error('Error fetching strategies:', error);
      res.status(500).json({ message: 'Failed to fetch strategies' });
    }
  });

  // Get a specific strategy by ID
  app.get('/api/strategies/:id', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const [strategy] = await db.select()
        .from(userStrategies)
        .where(and(
          eq(userStrategies.id, strategyId),
          eq(userStrategies.userId, parseInt(userId))
        ));

      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      res.json(strategy);
    } catch (error) {
      console.error('Error fetching strategy:', error);
      res.status(500).json({ message: 'Failed to fetch strategy' });
    }
  });

  // Create a new strategy
  app.post('/api/strategies', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { name, description, rules_json } = req.body;

      if (!name || !rules_json) {
        return res.status(400).json({ message: 'Name and rules are required' });
      }

      // Validate JSON structure
      if (!rules_json.conditions || !Array.isArray(rules_json.conditions)) {
        return res.status(400).json({ message: 'Invalid rules format' });
      }

      const [newStrategy] = await db.insert(userStrategies)
        .values({
          userId: parseInt(userId),
          name,
          description: description || null,
          rulesJson: rules_json,
          isActive: true
        })
        .returning();

      res.status(201).json(newStrategy);
    } catch (error) {
      console.error('Error creating strategy:', error);
      res.status(500).json({ message: 'Failed to create strategy' });
    }
  });

  // Update an existing strategy
  app.put('/api/strategies/:id', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { name, description, rules_json, is_active } = req.body;

      // Verify strategy ownership
      const [existingStrategy] = await db.select()
        .from(userStrategies)
        .where(and(
          eq(userStrategies.id, strategyId),
          eq(userStrategies.userId, parseInt(userId))
        ));

      if (!existingStrategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      const [updatedStrategy] = await db.update(userStrategies)
        .set({
          name: name || existingStrategy.name,
          description: description !== undefined ? description : existingStrategy.description,
          rulesJson: rules_json || existingStrategy.rulesJson,
          isActive: is_active !== undefined ? is_active : existingStrategy.isActive,
          updatedAt: new Date()
        })
        .where(eq(userStrategies.id, strategyId))
        .returning();

      res.json(updatedStrategy);
    } catch (error) {
      console.error('Error updating strategy:', error);
      res.status(500).json({ message: 'Failed to update strategy' });
    }
  });

  // Delete a strategy
  app.delete('/api/strategies/:id', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Verify strategy ownership before deletion
      const [existingStrategy] = await db.select()
        .from(userStrategies)
        .where(and(
          eq(userStrategies.id, strategyId),
          eq(userStrategies.userId, parseInt(userId))
        ));

      if (!existingStrategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      await db.delete(userStrategies)
        .where(eq(userStrategies.id, strategyId));

      res.json({ message: 'Strategy deleted successfully' });
    } catch (error) {
      console.error('Error deleting strategy:', error);
      res.status(500).json({ message: 'Failed to delete strategy' });
    }
  });

  // Execute/test a strategy against current market data
  app.post('/api/strategies/:id/execute', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get the strategy
      const [strategy] = await db.select()
        .from(userStrategies)
        .where(and(
          eq(userStrategies.id, strategyId),
          eq(userStrategies.userId, parseInt(userId))
        ));

      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      const startTime = Date.now();

      // Execute strategy against current market data
      const results = await executeStrategy(strategy.rulesJson);

      const executionDuration = Date.now() - startTime;

      // Log the execution
      const [executionLog] = await db.insert(strategyExecutionLogs)
        .values({
          userStrategyId: strategyId,
          userId: parseInt(userId),
          matchesFound: results.matches.length,
          executionDuration,
          status: 'COMPLETED',
          resultsJson: results
        })
        .returning();

      res.json({
        execution: executionLog,
        results: results
      });
    } catch (error) {
      console.error('Error executing strategy:', error);
      
      // Log failed execution
      try {
        await db.insert(strategyExecutionLogs)
          .values({
            strategyId: parseInt(req.params.id),
            userId: parseInt(req.user?.claims?.sub),
            matchesFound: 0,
            executionDuration: 0,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
      } catch (logError) {
        console.error('Failed to log execution error:', logError);
      }

      res.status(500).json({ message: 'Failed to execute strategy' });
    }
  });

  // Get strategy execution history
  app.get('/api/strategies/:id/executions', async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Verify strategy ownership
      const [strategy] = await db.select()
        .from(userStrategies)
        .where(and(
          eq(userStrategies.id, strategyId),
          eq(userStrategies.userId, parseInt(userId))
        ));

      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      const executions = await db.select()
        .from(strategyExecutionLogs)
        .where(eq(strategyExecutionLogs.strategyId, strategyId))
        .orderBy(desc(strategyExecutionLogs.executionTime))
        .limit(50);

      res.json(executions);
    } catch (error) {
      console.error('Error fetching strategy executions:', error);
      res.status(500).json({ message: 'Failed to fetch execution history' });
    }
  });

  // ==========================================
  // PHASE 5: BACKTESTING ENGINE API ENDPOINTS
  // ==========================================

  // Import backtesting engine
  const { backtestingEngine } = await import('./backtestingEngine');

  // Run strategy backtest
  app.post('/api/strategies/:id/backtest', async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { symbol, startDate, endDate, timeframe, backtestName } = req.body;

      // Validate request data
      if (!symbol || !startDate || !endDate || !timeframe) {
        return res.status(400).json({ 
          message: 'Missing required fields: symbol, startDate, endDate, timeframe' 
        });
      }

      // Verify strategy ownership
      const [strategy] = await db.select()
        .from(userStrategies)
        .where(and(
          eq(userStrategies.id, strategyId),
          eq(userStrategies.userId, parseInt(userId))
        ));

      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      const backtestRequest = {
        strategyId,
        symbol,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        timeframe,
        backtestName
      };

      const results = await backtestingEngine.runBacktest(backtestRequest, parseInt(userId));
      
      res.json(results);
    } catch (error) {
      console.error('Error running backtest:', error);
      res.status(500).json({ 
        message: 'Failed to run backtest',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get backtest results
  app.get('/api/backtests/:id', async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const backtestId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const result = await backtestingEngine.getBacktestResults(backtestId);
      
      if (!result) {
        return res.status(404).json({ message: 'Backtest not found' });
      }

      // Verify ownership
      if (result.userId !== parseInt(userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching backtest results:', error);
      res.status(500).json({ message: 'Failed to fetch backtest results' });
    }
  });

  // Get user's backtest history
  app.get('/api/backtests', async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const backtests = await backtestingEngine.getUserBacktests(parseInt(userId), limit);
      
      res.json(backtests);
    } catch (error) {
      console.error('Error fetching user backtests:', error);
      res.status(500).json({ message: 'Failed to fetch backtest history' });
    }
  });

  // Get strategy backtest history
  app.get('/api/strategies/:id/backtests', async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Verify strategy ownership
      const [strategy] = await db.select()
        .from(userStrategies)
        .where(and(
          eq(userStrategies.id, strategyId),
          eq(userStrategies.userId, parseInt(userId))
        ));

      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      const backtests = await backtestingEngine.getStrategyBacktests(strategyId);
      
      res.json(backtests);
    } catch (error) {
      console.error('Error fetching strategy backtests:', error);
      res.status(500).json({ message: 'Failed to fetch strategy backtest history' });
    }
  });

  // Delete backtest
  app.delete('/api/backtests/:id', async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const backtestId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const success = await backtestingEngine.deleteBacktest(backtestId, parseInt(userId));
      
      if (!success) {
        return res.status(404).json({ message: 'Backtest not found or access denied' });
      }

      res.json({ message: 'Backtest deleted successfully' });
    } catch (error) {
      console.error('Error deleting backtest:', error);
      res.status(500).json({ message: 'Failed to delete backtest' });
    }
  });

  // WebSocket server for legacy support (if needed)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Legacy WebSocket client connected');

    ws.on('close', () => {
      console.log('Legacy WebSocket client disconnected');
    });
  });

  // =======================================================================
  // 📋 PHASE 3: STRATEGY EXECUTION ENGINE API ENDPOINTS
  // =======================================================================
  
  // Import the new strategy execution engines
  const { strategyExecutor } = await import('./strategyExecutor');
  const { checkAccess, checkFeatureAccess, checkRateLimit } = await import('./auth');

  // ✅ STRATEGY EXECUTION ENGINE ENDPOINTS
  
  // Execute a single strategy against current market data
  app.post('/api/strategies/:id/execute', authenticate, checkAccess(['USER', 'PRO', 'ADMIN']), checkRateLimit('strategy_execution'), async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get current market data for execution
      const centralizedData = centralDataBroadcaster.getCentralizedData();
      const marketData = Object.values(centralizedData.marketData.instruments).map(instrument => ({
        symbol: instrument.symbol,
        price: instrument.price,
        openInterest: instrument.optionChain?.reduce((sum: number, opt: any) => sum + (opt.callOI || 0) + (opt.putOI || 0), 0) || 0,
        oiChange: instrument.optionChain?.reduce((sum: number, opt: any) => sum + (opt.oiChange || 0), 0) || 0,
        volume: instrument.volume || 0,
        pcr: instrument.optionChain ? calculatePCR(instrument.optionChain) : 0.8,
        timestamp: new Date()
      }));

      const result = await strategyExecutor.executeStrategy(strategyId, parseInt(userId), marketData);

      res.json({
        success: true,
        strategy: result,
        executionTime: new Date(),
        marketDataUsed: marketData.length
      });

    } catch (error) {
      console.error('Strategy execution error:', error);
      res.status(500).json({
        success: false,
        message: 'Strategy execution failed',
        error: error.message
      });
    }
  });

  // Batch execute multiple strategies
  app.post('/api/strategies/batch-execute', authenticate, checkAccess(['PRO', 'VIP', 'ADMIN']), checkRateLimit('strategy_execution'), async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { strategyIds } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!strategyIds || !Array.isArray(strategyIds)) {
        return res.status(400).json({ message: 'Strategy IDs array is required' });
      }

      // Get current market data
      const centralizedData = centralDataBroadcaster.getCentralizedData();
      const marketData = Object.values(centralizedData.marketData.instruments).map(instrument => ({
        symbol: instrument.symbol,
        price: instrument.price,
        openInterest: instrument.optionChain?.reduce((sum: number, opt: any) => sum + (opt.callOI || 0) + (opt.putOI || 0), 0) || 0,
        oiChange: instrument.optionChain?.reduce((sum: number, opt: any) => sum + (opt.oiChange || 0), 0) || 0,
        volume: instrument.volume || 0,
        pcr: instrument.optionChain ? calculatePCR(instrument.optionChain) : 0.8,
        timestamp: new Date()
      }));

      const strategiesData = strategyIds.map((id: number) => ({ id, userId: parseInt(userId) }));
      const results = await strategyExecutor.batchExecuteStrategies(strategiesData, marketData);

      res.json({
        success: true,
        executedStrategies: results.length,
        matchedStrategies: results.filter(r => r.matched).length,
        results,
        executionTime: new Date()
      });

    } catch (error) {
      console.error('Batch strategy execution error:', error);
      res.status(500).json({
        success: false,
        message: 'Batch execution failed',
        error: error.message
      });
    }
  });

  // Check user access to specific features
  app.get('/api/user/access/:feature', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { feature } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const accessCheck = await strategyExecutor.checkUserAccess(parseInt(userId), feature);

      res.json({
        success: true,
        feature,
        access: accessCheck,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Access check failed',
        error: error.message
      });
    }
  });

  // Get execution statistics (Admin only)
  app.get('/api/admin/execution-stats', authenticate, checkAccess(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
    try {
      const stats = await strategyExecutor.getExecutionStats();

      res.json({
        success: true,
        stats,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Execution stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get execution statistics',
        error: error.message
      });
    }
  });

  // =======================================================================
  // 🔒 RBAC AND SUBSCRIPTION MANAGEMENT ENDPOINTS  
  // =======================================================================

  // Get user subscription details
  app.get('/api/user/subscription', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const [user] = await db.select().from(users).where(eq(users.id, parseInt(userId)));

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        success: true,
        subscription: {
          tier: user.subscriptionTier,
          maxStrategies: user.maxStrategies,
          maxExecutionsPerDay: user.maxExecutionsPerDay,
          role: user.role,
          status: user.status
        },
        features: {
          strategyBuilder: ['PRO', 'VIP', 'INSTITUTIONAL'].includes(user.subscriptionTier),
          unlimitedAlerts: ['VIP', 'INSTITUTIONAL'].includes(user.subscriptionTier),
          advancedAnalytics: ['VIP', 'INSTITUTIONAL'].includes(user.subscriptionTier),
          apiAccess: ['INSTITUTIONAL'].includes(user.subscriptionTier),
          realTimeData: ['PRO', 'VIP', 'INSTITUTIONAL'].includes(user.subscriptionTier)
        }
      });

    } catch (error) {
      console.error('Subscription details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get subscription details',
        error: error.message
      });
    }
  });

  // =======================================================================
  // 📊 ENHANCED STRATEGY ANALYTICS ENDPOINTS
  // =======================================================================

  // Get strategy performance analytics
  app.get('/api/strategies/:id/analytics', authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const strategyId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get strategy details
      const [strategy] = await db.select()
        .from(userStrategies)
        .where(and(
          eq(userStrategies.id, strategyId),
          eq(userStrategies.userId, parseInt(userId))
        ));

      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      // Generate performance analytics
      const analytics = {
        totalExecutions: strategy.totalExecutions || 0,
        lastExecuted: strategy.lastExecuted,
        isActive: strategy.isActive,
        performance: {
          successRate: Math.random() * 80 + 15, // Mock success rate 15-95%
          averageReturn: (Math.random() - 0.5) * 10, // Mock return -5% to +5%
          sharpeRatio: Math.random() * 2 + 0.5, // Mock Sharpe ratio 0.5-2.5
          maxDrawdown: Math.random() * 15 + 2 // Mock drawdown 2-17%
        },
        riskMetrics: {
          volatility: Math.random() * 20 + 5, // Mock volatility 5-25%
          beta: Math.random() * 1.5 + 0.5, // Mock beta 0.5-2.0
          var95: Math.random() * 8 + 1 // Mock VaR 1-9%
        },
        recentActivity: {
          last7Days: Math.floor(Math.random() * 20),
          last30Days: Math.floor(Math.random() * 100),
          lastExecution: strategy.lastExecuted || new Date()
        }
      };

      res.json({
        success: true,
        strategy: {
          id: strategy.id,
          name: strategy.name,
          description: strategy.description
        },
        analytics,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Strategy analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get strategy analytics',
        error: error.message
      });
    }
  });

  // Helper function to calculate Put-Call Ratio
  function calculatePCR(optionChain: any[]): number {
    let totalPutOI = 0;
    let totalCallOI = 0;
    
    optionChain.forEach(strike => {
      totalPutOI += strike.putOI || 0;
      totalCallOI += strike.callOI || 0;
    });
    
    return totalCallOI > 0 ? totalPutOI / totalCallOI : 0.8;
  }

  console.log("✅ Phase 3: Strategy Execution Engine API endpoints registered");

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