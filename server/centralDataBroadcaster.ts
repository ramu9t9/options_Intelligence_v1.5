import { EventEmitter } from 'events';
import { marketDataService } from './marketDataService';
import { aiInsightsEngine } from './aiInsightsEngine';
import { alertSystem } from './alertSystem';
import { dataPersistenceService } from './dataPersistenceService';
import { Server } from 'socket.io';

export interface CentralizedData {
  marketData: {
    timestamp: Date;
    lastBrokerUpdate: Date;
    brokerConnectionStatus: string;
    dataSource: string;
    instruments: Record<string, {
      price: number;
      change: number;
      changePercent: number;
      volume: number;
      optionChain: any[];
      lastRefresh: Date;
    }>;
  };
  aiInsights: {
    insights: any[];
    recommendations: any[];
    sentiment: any;
    analytics: any;
    lastAnalysisRun: Date;
  };
  alerts: {
    recentAlerts: any[];
    systemStats: any;
  };
  lastUpdated: Date;
}

export class CentralDataBroadcaster extends EventEmitter {
  private io: Server | null = null;
  private centralizedData: CentralizedData;
  private updateInterval: NodeJS.Timeout | null = null;
  private connectedClients = new Set<string>();
  private isInitialized = false;

  constructor() {
    super();
    
    // Initialize with empty but proper structure
    this.centralizedData = {
      marketData: {
        timestamp: new Date(),
        lastBrokerUpdate: new Date(),
        brokerConnectionStatus: 'Disconnected',
        dataSource: 'None',
        instruments: {}
      },
      aiInsights: {
        insights: [],
        recommendations: [],
        sentiment: null,
        analytics: {},
        lastAnalysisRun: new Date()
      },
      alerts: {
        recentAlerts: [],
        systemStats: {}
      },
      lastUpdated: new Date()
    };
  }

  async initialize(io: Server): Promise<void> {
    this.io = io;

    // Handle socket connections
    io.on('connection', (socket) => {
      this.connectedClients.add(socket.id);
      console.log(`📡 Client ${socket.id} connected. Total: ${this.connectedClients.size}`);

      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
        console.log(`📡 Client ${socket.id} disconnected. Total: ${this.connectedClients.size}`);
      });

      // Handle subscription to specific instruments
      socket.on('subscribeInstrument', (symbol: string) => {
        socket.join(`instrument_${symbol}`);
        console.log(`📡 Client ${socket.id} subscribed to ${symbol}`);
      });

      socket.on('unsubscribeInstrument', (symbol: string) => {
        socket.leave(`instrument_${symbol}`);
        console.log(`📡 Client ${socket.id} unsubscribed from ${symbol}`);
      });
    });

    // Start data collection and broadcasting
    this.startDataCollection();
    this.startBroadcasting();
    
    this.isInitialized = true;
    console.log('✅ Central Data Broadcaster initialized - AUTHENTIC DATA ONLY');
  }

  private updateCentralizedData(marketData: Record<string, any>): void {
    // Update market data with AUTHENTIC data only
    this.centralizedData.marketData.instruments = marketData;
    this.centralizedData.marketData.timestamp = new Date();
    this.centralizedData.marketData.lastBrokerUpdate = new Date();
    this.centralizedData.marketData.brokerConnectionStatus = 'Connected (Angel One API)';
    this.centralizedData.marketData.dataSource = 'Angel One Live Data';
    this.centralizedData.lastUpdated = new Date();
  }

  private broadcastToClients(): void {
    if (this.io && this.connectedClients.size > 0) {
      this.io.emit('centralizedData', this.centralizedData);
      console.log(`📡 Broadcasting authentic data to ${this.connectedClients.size} clients`);
    }
  }

  private async initializeAngelOneProvider(): Promise<void> {
    try {
      const { angelOneProvider } = await import('./angelOneProvider');
      const { db } = await import('./db');
      const { brokerCredentials } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      // Get Angel One credentials
      const [creds] = await db.select().from(brokerCredentials)
        .where(eq(brokerCredentials.brokerType, 'angel-one'))
        .limit(1);

      if (creds && creds.totp) {
        const success = await angelOneProvider.initialize();
        if (success) {
          console.log('✅ Angel One provider initialized - Live data active');
          this.centralizedData.marketData.brokerConnectionStatus = 'Connected (Angel One API)';
          this.centralizedData.marketData.dataSource = 'Angel One Live Data';
        } else {
          console.error('❌ Angel One authentication failed');
          this.centralizedData.marketData.brokerConnectionStatus = 'Authentication Failed';
          this.centralizedData.marketData.dataSource = 'None';
        }
      } else {
        console.warn('⚠️ No Angel One credentials found');
        this.centralizedData.marketData.brokerConnectionStatus = 'No Credentials';
        this.centralizedData.marketData.dataSource = 'None';
      }
    } catch (error) {
      console.error('❌ Failed to initialize Angel One provider:', error);
      this.centralizedData.marketData.brokerConnectionStatus = 'Initialization Failed';
      this.centralizedData.marketData.dataSource = 'None';
    }
  }

  private startDataCollection(): void {
    // Initialize Angel One provider
    this.initializeAngelOneProvider();

    // Collect data every 15 seconds to respect Angel One rate limits - AUTHENTIC DATA ONLY
    this.updateInterval = setInterval(async () => {
      await this.collectAllData();
    }, 15000);
  }

  private async collectAllData(): Promise<void> {
    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    const marketData: Record<string, any> = {};

    try {
      const { angelOneProvider } = await import('./angelOneProvider');

      // AUTHENTIC DATA ONLY - NO SIMULATION
      if (!angelOneProvider.isAuthenticated()) {
        console.error('❌ Angel One API not authenticated - cannot provide authentic market data');
        return;
      }

      // Use bulk quotes to respect Angel One's rate limits (1 request/second)
      try {
        console.log(`🔄 Fetching bulk quotes for ${symbols.length} symbols with rate limiting...`);
        const bulkQuotes = await angelOneProvider.getBulkQuotes(symbols, 'NSE');
        
        for (const symbol of symbols) {
          const quote = bulkQuotes[symbol];
          if (quote && quote.ltp > 0) {
            marketData[symbol] = {
              price: quote.ltp,
              change: quote.ltp - quote.close,
              changePercent: ((quote.ltp - quote.close) / quote.close) * 100,
              volume: quote.volume,
              optionChain: [], // Empty array for authentic data only
              lastRefresh: new Date()
            };
            console.log(`✅ ${symbol}: ₹${quote.ltp.toLocaleString()} (${quote.ltp > quote.close ? '+' : ''}${(quote.ltp - quote.close).toFixed(2)}, ${(((quote.ltp - quote.close) / quote.close) * 100).toFixed(2)}%) [Angel One Live - Bulk Request]`);
          } else {
            console.warn(`⚠️ No valid bulk quote data received for ${symbol} - skipping`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Error in bulk quote request:`, error.message);
      }

      // Only update if we have some authentic data
      if (Object.keys(marketData).length > 0) {
        this.updateCentralizedData(marketData);
      }

    } catch (error: any) {
      console.error('❌ Error in data collection:', error.message);
    }
  }

  private startBroadcasting(): void {
    // Broadcast data every 2 seconds to connected clients
    setInterval(() => {
      this.broadcastToClients();
    }, 2000);
  }

  getCentralizedData(): CentralizedData {
    return this.centralizedData;
  }

  getInstrumentData(symbol: string): any {
    return this.centralizedData.marketData.instruments[symbol];
  }

  getAIData(): any {
    return this.centralizedData.aiInsights;
  }

  getAlertData(): any {
    return this.centralizedData.alerts;
  }

  getPerformanceMetrics(): any {
    return {
      connectedClients: this.connectedClients.size,
      lastUpdate: this.centralizedData.lastUpdated,
      dataSource: this.centralizedData.marketData.dataSource,
      brokerStatus: this.centralizedData.marketData.brokerConnectionStatus,
      instrumentCount: Object.keys(this.centralizedData.marketData.instruments).length,
      insightCount: this.centralizedData.aiInsights.insights.length,
      recommendationCount: this.centralizedData.aiInsights.recommendations.length,
      isActive: this.isInitialized
    };
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.connectedClients.clear();
    this.isInitialized = false;
    console.log('📡 Central Data Broadcaster stopped');
  }
}

export const centralDataBroadcaster = new CentralDataBroadcaster();