import { io, Socket } from 'socket.io-client';

// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin
  : 'http://localhost:5000';

interface LiveDataPoint {
  id: number;
  symbolName: string;
  timestamp: string;
  price: string;
  volume: number;
  oi: number;
  changeOi: number;
  change: string;
  changePercent: string;
  dataSource: string;
}

interface HistoricalCandle {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
  dataSource: string;
}

interface PatternDetection {
  id: number;
  symbolName: string;
  patternName: string;
  confidence: string;
  timeframe: string;
  timestamp: string;
  direction: string;
  targetPrice?: string;
  stopLoss?: string;
  isActive: boolean;
}

interface DataSource {
  id: number;
  name: string;
  priority: number;
  isActive: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime?: string;
  currentUsage: number;
  usagePercentage: string;
}

class SensibullDataService {
  private socket: Socket | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.initializeWebSocket();
  }

  // ===========================
  // WEBSOCKET MANAGEMENT
  // ===========================

  private initializeWebSocket() {
    try {
      this.socket = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true
      });

      this.socket.on('connect', () => {
        console.log('🔌 Connected to Sensibull Data Service');
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from Sensibull Data Service');
      });

      this.socket.on('liveData', (data) => {
        this.notifySubscribers(`live_${data.symbol}`, data);
      });

      this.socket.on('patternUpdate', (data) => {
        this.notifySubscribers('patterns', data);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
      });
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
    }
  }

  subscribeToLiveData(symbols: string[], callback: (data: any) => void) {
    if (!this.socket) {
      console.warn('⚠️ WebSocket not connected');
      return;
    }

    symbols.forEach(symbol => {
      const key = `live_${symbol.toUpperCase()}`;
      if (!this.subscribers.has(key)) {
        this.subscribers.set(key, new Set());
      }
      this.subscribers.get(key)?.add(callback);
    });

    this.socket.emit('subscribe', {
      symbols: symbols.map(s => s.toUpperCase()),
      type: 'live'
    });
  }

  subscribeToPatterns(callback: (data: any) => void) {
    if (!this.subscribers.has('patterns')) {
      this.subscribers.set('patterns', new Set());
    }
    this.subscribers.get('patterns')?.add(callback);
  }

  unsubscribeFromLiveData(symbols: string[], callback?: (data: any) => void) {
    if (!this.socket) return;

    symbols.forEach(symbol => {
      const key = `live_${symbol.toUpperCase()}`;
      if (callback) {
        this.subscribers.get(key)?.delete(callback);
      } else {
        this.subscribers.delete(key);
      }
    });

    this.socket.emit('unsubscribe', {
      symbols: symbols.map(s => s.toUpperCase()),
      type: 'live'
    });
  }

  private notifySubscribers(key: string, data: any) {
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in subscriber callback:', error);
        }
      });
    }
  }

  // ===========================
  // REST API METHODS
  // ===========================

  async getLiveData(symbol: string, limit = 100): Promise<LiveDataPoint[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/live/${symbol.toUpperCase()}?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching live data:', error);
      throw error;
    }
  }

  async getMultipleLiveData(symbols: string[]): Promise<{ [symbol: string]: LiveDataPoint | null }> {
    try {
      const symbolsParam = symbols.map(s => s.toUpperCase()).join(',');
      const response = await fetch(`${API_BASE_URL}/api/v2/live?symbols=${symbolsParam}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching multiple live data:', error);
      throw error;
    }
  }

  async getHistoricalData(
    symbol: string, 
    timeframe: string, 
    from: string, 
    to: string
  ): Promise<HistoricalCandle[]> {
    try {
      const params = new URLSearchParams({
        timeframe,
        from,
        to
      });
      
      const response = await fetch(
        `${API_BASE_URL}/api/v2/historical/${symbol.toUpperCase()}?${params}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching historical data:', error);
      throw error;
    }
  }

  async getOptionChain(symbol: string, limit = 50): Promise<any[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v2/optionchain/${symbol.toUpperCase()}?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching option chain:', error);
      throw error;
    }
  }

  async getLiveOptionChain(symbol: string): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v2/optionchain/live/${symbol.toUpperCase()}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error fetching live option chain:', error);
      throw error;
    }
  }

  async getPatternDetections(symbol?: string, limit = 100): Promise<PatternDetection[]> {
    try {
      const params = new URLSearchParams();
      if (symbol) params.append('symbol', symbol.toUpperCase());
      if (limit) params.append('limit', limit.toString());
      
      const response = await fetch(`${API_BASE_URL}/api/v2/patterns?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching pattern detections:', error);
      throw error;
    }
  }

  async triggerPatternDetection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/patterns/detect`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error triggering pattern detection:', error);
      return false;
    }
  }

  // ===========================
  // DATA SOURCE MANAGEMENT
  // ===========================

  async getDataSourceHealth(): Promise<DataSource[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/sources`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching data source health:', error);
      throw error;
    }
  }

  async updateDataSourceStatus(sourceName: string, isActive: boolean): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/sources/${sourceName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error updating data source status:', error);
      return false;
    }
  }

  // ===========================
  // SYSTEM MANAGEMENT
  // ===========================

  async getSystemHealth(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/system/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching system health:', error);
      throw error;
    }
  }

  async triggerDataCleanup(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/system/cleanup`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error triggering data cleanup:', error);
      return false;
    }
  }

  // ===========================
  // UTILITY METHODS
  // ===========================

  formatPrice(price: string | number): string {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  formatNumber(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN').format(num);
  }

  formatPercentage(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  }

  getChangeColor(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num > 0) return 'text-green-600';
    if (num < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  // ===========================
  // CLEANUP
  // ===========================

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscribers.clear();
  }
}

// Create singleton instance
export const sensibullDataService = new SensibullDataService();
export default sensibullDataService;