import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { storage } from './storage';

export interface AngelOneAuth {
  jwtToken: string;
  refreshToken: string;
  feedToken: string;
  expiryTime: Date;
}

export interface AngelOneQuote {
  exchange: string;
  tradingsymbol: string;
  symboltoken: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ltp: number;
  volume: number;
  totaltradedvalue: number;
}

export interface AngelOneOptionChain {
  netChange: number;
  pctChange: number;
  data: Array<{
    strikePrice: number;
    expiryDate: string;
    CE?: {
      openInterest: number;
      changeinOpenInterest: number;
      pctChange: number;
      lastPrice: number;
      change: number;
      totalTradedVolume: number;
    };
    PE?: {
      openInterest: number;
      changeinOpenInterest: number;
      pctChange: number;
      lastPrice: number;
      change: number;
      totalTradedVolume: number;
    };
  }>;
}

export class AngelOneProvider extends EventEmitter {
  private api: AxiosInstance;
  private auth: AngelOneAuth | null = null;
  private baseUrl = 'https://apiconnect.angelone.in';
  private credentials: {
    apiKey: string;
    clientId: string;
    clientSecret: string;
  } = {
    apiKey: process.env.ANGEL_ONE_API_KEY || '',
    clientId: process.env.ANGEL_ONE_CLIENT_ID || '',
    clientSecret: process.env.ANGEL_ONE_CLIENT_SECRET || ''
  };
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '106.193.147.98',
        'X-MACAddress': '00:00:00:00:00:00',
        'X-PrivateKey': process.env.ANGEL_PRIVATE_KEY || ''
      }
    });

    this.setupInterceptors();
  }

  async initialize(): Promise<boolean> {
    try {
      // Get credentials from database
      const { db } = await import('./db');
      const { brokerCredentials } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [creds] = await db.select().from(brokerCredentials)
        .where(eq(brokerCredentials.brokerType, 'angel-one'))
        .limit(1);
        
      if (!creds || !creds.apiKey || !creds.clientId || !creds.apiSecret) {
        console.log('Angel One credentials not found in database');
        return false;
      }

      this.credentials = {
        apiKey: creds.apiKey,
        clientId: creds.clientId,
        clientSecret: creds.apiSecret
      };

      // Authenticate
      const authenticated = await this.authenticate();
      if (authenticated) {
        this.isConnected = true;
        this.startHeartbeat();
        this.emit('connected');
        console.log('✅ Angel One provider initialized successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error initializing Angel One provider:', error);
      return false;
    }
  }

  private async authenticate(): Promise<boolean> {
    try {
      // Get credentials with TOTP from database
      const { db } = await import('./db');
      const { brokerCredentials } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { authenticator } = await import('otplib');
      
      const [creds] = await db.select().from(brokerCredentials)
        .where(eq(brokerCredentials.brokerType, 'angel-one'))
        .limit(1);
        
      if (!creds || !creds.totp) {
        console.error('Angel One TOTP not found');
        return false;
      }

      // Generate TOTP code
      const totpCode = authenticator.generate(creds.totp);
      
      const response = await this.api.post('/rest/auth/angelbroking/user/v1/loginByPassword', {
        clientcode: creds.clientId,
        password: creds.pin,
        totp: totpCode
      }, {
        headers: {
          'X-PrivateKey': creds.apiKey
        }
      });

      if (response.data.status && response.data.data) {
        this.auth = {
          jwtToken: response.data.data.jwtToken,
          refreshToken: response.data.data.refreshToken,
          feedToken: response.data.data.feedToken,
          expiryTime: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
        };

        // Set auth header for future requests
        this.api.defaults.headers.common['Authorization'] = `Bearer ${this.auth.jwtToken}`;
        
        console.log('✅ Angel One authentication successful');
        return true;
      } else {
        console.error('❌ Angel One authentication failed:', response.data.message);
        return false;
      }

      console.error('❌ Angel One authentication failed:', response.data.message);
      return false;
    } catch (error) {
      console.error('❌ Angel One authentication error:', error);
      return false;
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        if (this.auth?.jwtToken) {
          config.headers.Authorization = `Bearer ${this.auth.jwtToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.auth?.refreshToken) {
          try {
            await this.refreshToken();
            // Retry the original request
            return this.api.request(error.config);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            this.emit('disconnected', 'Token refresh failed');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<void> {
    if (!this.auth?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.api.post('/rest/auth/angelbroking/jwt/v1/generateTokens', {
      refreshToken: this.auth.refreshToken
    });

    if (response.data.status && response.data.data) {
      this.auth.jwtToken = response.data.data.jwtToken;
      this.auth.refreshToken = response.data.data.refreshToken;
      this.auth.expiryTime = new Date(Date.now() + 8 * 60 * 60 * 1000);
      
      console.log('✅ Angel One token refreshed successfully');
    } else {
      throw new Error('Token refresh failed');
    }
  }

  async getQuote(symbol: string, exchange: string = 'NSE'): Promise<AngelOneQuote | null> {
    try {
      if (!this.isConnected || !this.auth) {
        console.warn('Angel One not connected, initializing...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Failed to initialize Angel One');
          return null;
        }
      }

      const symbolToken = await this.getSymbolToken(symbol, exchange);
      if (!symbolToken) {
        console.error(`Symbol token not found for ${symbol}`);
        return null;
      }

      // Try market data API first
      try {
        const response = await this.api.post('/rest/secure/angelbroking/market/v1/getMarketData', {
          mode: 'LTP',
          exchangeTokens: {
            [exchange]: [symbolToken]
          }
        });

        if (response.data.status && response.data.data && response.data.data.fetched) {
          const marketData = response.data.data.fetched[0];
          console.log(`Live ${symbol} quote via market data:`, marketData.ltp);
          
          return {
            exchange,
            tradingsymbol: symbol,
            symboltoken: symbolToken,
            open: marketData.open || 0,
            high: marketData.high || 0,
            low: marketData.low || 0,
            close: marketData.close || 0,
            ltp: marketData.ltp || 0,
            volume: marketData.volume || 0,
            totaltradedvalue: marketData.totaltradedvalue || 0
          };
        }
      } catch (marketDataError) {
        console.log(`Market data API failed for ${symbol}, trying LTP endpoint...`);
      }

      // Fallback to LTP endpoint
      const response = await this.api.post('/rest/secure/angelbroking/order/v1/getLTP', {
        exchange,
        tradingsymbol: symbol,
        symboltoken: symbolToken
      });

      if (response.data.status && response.data.data) {
        const quoteData = response.data.data;
        console.log(`Live ${symbol} quote:`, quoteData.ltp);
        
        return {
          exchange,
          tradingsymbol: symbol,
          symboltoken: symbolToken,
          open: quoteData.open || 0,
          high: quoteData.high || 0,
          low: quoteData.low || 0,
          close: quoteData.close || 0,
          ltp: quoteData.ltp || 0,
          volume: quoteData.volume || 0,
          totaltradedvalue: quoteData.totaltradedvalue || 0
        };
      } else {
        console.error(`No quote data received for ${symbol}:`, response.data);
        return null;
      }

      if (response.data.status && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error(`Error getting quote for ${symbol}:`, error);
      return null;
    }
  }

  async getOptionChain(symbol: string, expiry: string): Promise<AngelOneOptionChain | null> {
    try {
      if (!this.isConnected || !this.auth) {
        console.error('Angel One not connected');
        return null;
      }

      const response = await this.api.get('/rest/secure/angelbroking/market/v1/optionChain', {
        params: {
          symbolname: symbol,
          expirydate: expiry,
          exchange: 'NFO'
        }
      });

      if (response.data.status && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error(`Error getting option chain for ${symbol}:`, error);
      return null;
    }
  }

  private async getSymbolToken(symbol: string, exchange: string): Promise<string | null> {
    try {
      // For major indices, we can hardcode the tokens
      const knownTokens: Record<string, string> = {
        'NIFTY': '99926000',
        'BANKNIFTY': '99926009',
        'FINNIFTY': '99926037'
      };

      if (knownTokens[symbol]) {
        return knownTokens[symbol];
      }

      // For other symbols, we'd need to search the master contract
      // This is a simplified implementation
      const response = await this.api.post('/rest/secure/angelbroking/market/v1/searchScrip', {
        exchange,
        searchtext: symbol
      });

      if (response.data.status && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].symboltoken;
      }

      return null;
    } catch (error) {
      console.error(`Error getting symbol token for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: Array<{symbol: string, exchange: string}>): Promise<AngelOneQuote[]> {
    try {
      if (!this.isConnected || !this.auth) {
        console.error('Angel One not connected');
        return [];
      }

      const quotes: AngelOneQuote[] = [];
      
      // Process in batches to avoid rate limits
      for (let i = 0; i < symbols.length; i += 10) {
        const batch = symbols.slice(i, i + 10);
        const batchPromises = batch.map(({ symbol, exchange }) => 
          this.getQuote(symbol, exchange)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            quotes.push(result.value);
          }
        });

        // Rate limiting: wait between batches
        if (i + 10 < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return quotes;
    } catch (error) {
      console.error('Error getting multiple quotes:', error);
      return [];
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        // Simple ping to keep connection alive
        await this.api.get('/rest/secure/angelbroking/user/v1/getProfile');
      } catch (error) {
        console.error('Heartbeat failed:', error);
        this.emit('error', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  disconnect(): void {
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.auth = null;
    delete this.api.defaults.headers.common['Authorization'];
    
    this.emit('disconnected', 'Manual disconnect');
    console.log('Angel One provider disconnected');
  }

  isAuthenticated(): boolean {
    return this.isConnected && 
           this.auth !== null && 
           this.auth.expiryTime > new Date();
  }

  getConnectionStatus(): {
    connected: boolean;
    authenticated: boolean;
    tokenExpiry?: Date;
  } {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated(),
      tokenExpiry: this.auth?.expiryTime
    };
  }
}

// Export singleton instance
export const angelOneProvider = new AngelOneProvider();