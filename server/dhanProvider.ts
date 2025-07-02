import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

export interface DhanAuth {
  accessToken: string;
  clientId: string;
  refreshToken?: string;
  expiryTime: Date;
}

export interface DhanProfile {
  clientId: string;
  clientName: string;
  email: string;
  mobile: string;
  status: string;
  segment: string[];
  exchangeSegments: string[];
  dpIds: string[];
}

export interface DhanQuote {
  securityId: string;
  exchangeSegment: string;
  tradingSymbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  totalTradedValue: number;
  change: number;
  pChange: number;
}

export interface DhanOptionChain {
  underlyingValue: number;
  underlyingSymbol: string;
  optionData: Array<{
    strikePrice: number;
    expiryDate: string;
    CE?: {
      openInterest: number;
      changeinOpenInterest: number;
      pctChange: number;
      lastPrice: number;
      change: number;
      volume: number;
      bidPrice: number;
      askPrice: number;
      impliedVolatility: number;
    };
    PE?: {
      openInterest: number;
      changeinOpenInterest: number;
      pctChange: number;
      lastPrice: number;
      change: number;
      volume: number;
      bidPrice: number;
      askPrice: number;
      impliedVolatility: number;
    };
  }>;
}

export class DhanProvider extends EventEmitter {
  private api: AxiosInstance;
  private auth: DhanAuth | null = null;
  private baseUrl = 'https://api.dhan.co';
  private credentials: {
    accessToken: string;
    clientId: string;
  } = {
    accessToken: '',
    clientId: ''
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
        'Accept': 'application/json'
      }
    });
    this.setupInterceptors();
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Initializing Dhan provider...');
      
      if (!this.credentials.accessToken || !this.credentials.clientId) {
        console.log('❌ Dhan credentials not provided');
        return false;
      }

      const authenticated = await this.authenticate();
      
      if (authenticated) {
        this.isConnected = true;
        this.startHeartbeat();
        console.log('✅ Dhan provider initialized successfully');
        return true;
      } else {
        console.log('❌ Dhan authentication failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Dhan provider initialization failed:', error);
      return false;
    }
  }

  private async authenticate(): Promise<boolean> {
    try {
      // Set authorization header
      this.api.defaults.headers.common['access-token'] = this.credentials.accessToken;
      
      // Verify connection by fetching user profile
      const profile = await this.getUserProfile();
      
      if (profile) {
        this.auth = {
          accessToken: this.credentials.accessToken,
          clientId: this.credentials.clientId,
          expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };
        
        console.log('✅ Dhan authentication successful');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Dhan authentication error:', error);
      return false;
    }
  }

  private setupInterceptors(): void {
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.log('🔄 Dhan token expired, attempting to refresh...');
          this.isConnected = false;
          this.emit('disconnected');
        }
        return Promise.reject(error);
      }
    );
  }

  async getUserProfile(): Promise<DhanProfile | null> {
    try {
      const response = await this.api.get('/v2/user/profile');
      
      if (response.data && response.data.status === 'success') {
        return {
          clientId: response.data.data.clientId,
          clientName: response.data.data.clientName,
          email: response.data.data.email,
          mobile: response.data.data.mobile,
          status: response.data.data.status,
          segment: response.data.data.segment || [],
          exchangeSegments: response.data.data.exchangeSegments || [],
          dpIds: response.data.data.dpIds || []
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Dhan user profile:', error);
      return null;
    }
  }

  async getQuote(symbol: string, exchangeSegment: string = 'NSE_EQ'): Promise<DhanQuote | null> {
    try {
      // Get security ID for the symbol first
      const securityId = await this.getSecurityId(symbol, exchangeSegment);
      
      if (!securityId) {
        console.error(`Security ID not found for ${symbol}`);
        return null;
      }

      const response = await this.api.get(`/v2/charts/historical`, {
        params: {
          securityId,
          exchangeSegment,
          instrument: 'EQUITY'
        }
      });

      if (response.data && response.data.status === 'success') {
        const data = response.data.data;
        return {
          securityId,
          exchangeSegment,
          tradingSymbol: symbol,
          ltp: data.close || 0,
          open: data.open || 0,
          high: data.high || 0,
          low: data.low || 0,
          close: data.close || 0,
          volume: data.volume || 0,
          totalTradedValue: data.turnover || 0,
          change: data.change || 0,
          pChange: data.pChange || 0
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching Dhan quote for ${symbol}:`, error);
      return null;
    }
  }

  async getOptionChain(symbol: string, expiry: string): Promise<DhanOptionChain | null> {
    try {
      // Note: Dhan API structure may differ, this is a conceptual implementation
      const response = await this.api.get(`/v2/option-chain`, {
        params: {
          underlying: symbol,
          expiry: expiry
        }
      });

      if (response.data && response.data.status === 'success') {
        return {
          underlyingValue: response.data.data.underlyingValue,
          underlyingSymbol: symbol,
          optionData: response.data.data.optionData || []
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching Dhan option chain for ${symbol}:`, error);
      return null;
    }
  }

  private async getSecurityId(symbol: string, exchangeSegment: string): Promise<string | null> {
    try {
      // This would typically involve a symbol lookup API
      // For now, using a basic mapping
      const symbolMappings: Record<string, string> = {
        'NIFTY': '25',
        'BANKNIFTY': '26',
        'FINNIFTY': '27'
      };

      return symbolMappings[symbol] || null;
    } catch (error) {
      console.error(`Error getting security ID for ${symbol}:`, error);
      return null;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.getUserProfile();
      } catch (error) {
        console.error('Dhan heartbeat failed:', error);
        this.isConnected = false;
        this.emit('disconnected');
      }
    }, 300000); // 5 minutes
  }

  disconnect(): void {
    console.log('🛑 Disconnecting Dhan provider...');
    
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    delete this.api.defaults.headers.common['access-token'];
    this.auth = null;
    
    console.log('✅ Dhan provider disconnected');
  }

  isAuthenticated(): boolean {
    return this.isConnected && this.auth !== null;
  }

  getConnectionStatus(): {
    isConnected: boolean;
    provider: string;
    clientId?: string;
    tokenExpiry?: Date;
  } {
    return {
      isConnected: this.isConnected,
      provider: 'Dhan',
      clientId: this.auth?.clientId,
      tokenExpiry: this.auth?.expiryTime
    };
  }

  updateCredentials(accessToken: string, clientId: string): void {
    this.credentials = { accessToken, clientId };
  }
}

export const dhanProvider = new DhanProvider();