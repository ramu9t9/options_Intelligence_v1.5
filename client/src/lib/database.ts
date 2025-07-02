import { AuthService } from '../services/AuthService';

// Frontend database service for API calls - Mock mode only
export interface Instrument {
  id: string;
  symbol: string;
  underlying_price: number;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OptionData {
  id: string;
  instrument_id: string;
  strike_price: number;
  option_type: 'CE' | 'PE';
  open_interest: number;
  oi_change: number;
  last_traded_price: number;
  ltp_change: number;
  volume: number;
  timestamp: string;
}

export interface MarketSignal {
  id: string;
  instrument_id: string;
  instrument_symbol?: string;
  strike_price: number;
  signal_type: string;
  direction: 'BULLISH' | 'BEARISH';
  description: string;
  confidence_score: number;
  is_active: boolean;
  created_at: string;
}

// Frontend database service for API calls - Mock mode only
export class DatabaseService {
  // Use relative path in development to leverage Vite proxy
  private static baseUrl = import.meta.env.VITE_API_URL || '/api';

  private static getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const token = AuthService.getInstance().getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }

    return headers;
  }

  static async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { database: false, redis: false, mockMode: true, timestamp: new Date().toISOString() };
    }
  }

  static async getInstruments(): Promise<Instrument[]> {
    try {
      const response = await fetch(`${this.baseUrl}/instruments`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.instruments || [];
    } catch (error) {
      console.error('Error fetching instruments:', error);
      return [];
    }
  }

  static async getOptionChain(symbol: string) {
    try {
      const response = await fetch(`${this.baseUrl}/option-chain/${symbol}`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.optionChain || [];
    } catch (error) {
      console.error(`Error fetching option chain for ${symbol}:`, error);
      return [];
    }
  }

  static async getRecentSignals(limit = 20): Promise<MarketSignal[]> {
    try {
      const response = await fetch(`${this.baseUrl}/signals?limit=${limit}`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.signals || [];
    } catch (error) {
      console.error('Error fetching signals:', error);
      return [];
    }
  }

  static async insertSignal(signalData: Partial<MarketSignal>) {
    try {
      const response = await fetch(`${this.baseUrl}/signals`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(signalData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.signal?.id || data.id || null;
    } catch (error) {
      console.error('Error inserting signal:', error);
      throw error;
    }
  }

  static async updateInstrumentPrice(symbol: string, price: number) {
    try {
      const response = await fetch(`${this.baseUrl}/instruments/${symbol}/price`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ price }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating price for ${symbol}:`, error);
      return false;
    }
  }

  static async getDatabaseStats() {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        headers: this.getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching database stats:', error);
      throw error;
    }
  }
}