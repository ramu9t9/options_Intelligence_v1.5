import { EventEmitter } from 'events';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { cacheAdapter } from './cacheAdapter';
import { jobQueueService } from './jobQueue';

export interface WebSocketConnection {
  id: string;
  socket: Socket;
  userId?: number;
  subscriptions: Set<string>;
  lastActivity: Date;
  connectionType: 'web' | 'mobile' | 'api';
  rateLimitCount: number;
  rateLimitReset: Date;
}

export interface BroadcastMessage {
  type: 'market_data' | 'option_chain' | 'pattern_alert' | 'oi_delta' | 'system_message';
  symbol?: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ScalingMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesSentLastMinute: number;
  averageLatency: number;
  errorRate: number;
  memoryUsage: number;
  cacheHitRate: number;
}

export class WebSocketScaler extends EventEmitter {
  private io: SocketIOServer | null = null;
  private connections = new Map<string, WebSocketConnection>();
  private subscriptions = new Map<string, Set<string>>(); // symbol -> connection IDs
  private messageQueue: BroadcastMessage[] = [];
  private isProcessingQueue = false;
  private metrics: ScalingMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesSentLastMinute: 0,
    averageLatency: 0,
    errorRate: 0,
    memoryUsage: 0,
    cacheHitRate: 0
  };
  private messageHistory: { timestamp: Date; sent: boolean }[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;
  private rateLimitConfig = {
    maxMessagesPerMinute: 120,
    maxSubscriptions: 50
  };

  async initialize(io: SocketIOServer): Promise<void> {
    this.io = io;
    this.setupSocketHandlers();
    this.startMessageProcessor();
    this.startMetricsCollection();
    this.startCleanupProcess();
    
    console.log('✅ WebSocket Scaler initialized with intelligent broadcasting');
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      this.handleNewConnection(socket);
    });
  }

  private handleNewConnection(socket: Socket): void {
    const connectionId = socket.id;
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const connectionType = this.detectConnectionType(userAgent);

    const connection: WebSocketConnection = {
      id: connectionId,
      socket,
      subscriptions: new Set(),
      lastActivity: new Date(),
      connectionType,
      rateLimitCount: 0,
      rateLimitReset: new Date(Date.now() + 60000) // 1 minute from now
    };

    this.connections.set(connectionId, connection);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    console.log(`📡 New ${connectionType} connection: ${connectionId} (Total: ${this.connections.size})`);

    // Setup connection-specific handlers
    this.setupConnectionHandlers(socket, connection);

    // Send initial market data if available
    this.sendCachedData(connection);
  }

  private detectConnectionType(userAgent: string): 'web' | 'mobile' | 'api' {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return 'mobile';
    } else if (userAgent.includes('curl') || userAgent.includes('python') || userAgent.includes('axios')) {
      return 'api';
    }
    return 'web';
  }

  private setupConnectionHandlers(socket: Socket, connection: WebSocketConnection): void {
    // Handle subscription requests
    socket.on('subscribe', (data: { symbols: string[], userId?: number }) => {
      this.handleSubscription(connection, data);
    });

    // Handle unsubscription requests
    socket.on('unsubscribe', (data: { symbols: string[] }) => {
      this.handleUnsubscription(connection, data);
    });

    // Handle ping for latency measurement
    socket.on('ping', (timestamp: number) => {
      socket.emit('pong', { timestamp, serverTime: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(connection, reason);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error(`WebSocket error for ${connection.id}:`, error);
      this.metrics.errorRate++;
    });
  }

  private handleSubscription(connection: WebSocketConnection, data: { symbols: string[], userId?: number }): void {
    const { symbols, userId } = data;
    
    // Check rate limits
    if (!this.checkRateLimit(connection)) {
      connection.socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    // Check subscription limits
    if (connection.subscriptions.size + symbols.length > this.rateLimitConfig.maxSubscriptions) {
      connection.socket.emit('error', { message: 'Subscription limit exceeded' });
      return;
    }

    // Update connection info
    if (userId) {
      connection.userId = userId;
    }
    connection.lastActivity = new Date();

    // Add subscriptions
    for (const symbol of symbols) {
      connection.subscriptions.add(symbol);
      
      // Add to global subscriptions map
      if (!this.subscriptions.has(symbol)) {
        this.subscriptions.set(symbol, new Set());
      }
      this.subscriptions.get(symbol)!.add(connection.id);
    }

    console.log(`📊 Connection ${connection.id} subscribed to: ${symbols.join(', ')}`);
    
    // Send cached data for new subscriptions
    this.sendCachedDataForSymbols(connection, symbols);
    
    // Acknowledge subscription
    connection.socket.emit('subscribed', { symbols, timestamp: new Date() });
  }

  private handleUnsubscription(connection: WebSocketConnection, data: { symbols: string[] }): void {
    const { symbols } = data;
    connection.lastActivity = new Date();

    for (const symbol of symbols) {
      connection.subscriptions.delete(symbol);
      
      // Remove from global subscriptions map
      const symbolSubs = this.subscriptions.get(symbol);
      if (symbolSubs) {
        symbolSubs.delete(connection.id);
        if (symbolSubs.size === 0) {
          this.subscriptions.delete(symbol);
        }
      }
    }

    console.log(`📊 Connection ${connection.id} unsubscribed from: ${symbols.join(', ')}`);
    connection.socket.emit('unsubscribed', { symbols, timestamp: new Date() });
  }

  private handleDisconnection(connection: WebSocketConnection, reason: string): void {
    console.log(`📡 Connection disconnected: ${connection.id} (${reason})`);
    
    // Remove from all subscriptions
    for (const symbol of connection.subscriptions) {
      const symbolSubs = this.subscriptions.get(symbol);
      if (symbolSubs) {
        symbolSubs.delete(connection.id);
        if (symbolSubs.size === 0) {
          this.subscriptions.delete(symbol);
        }
      }
    }

    // Remove connection
    this.connections.delete(connection.id);
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
  }

  private checkRateLimit(connection: WebSocketConnection): boolean {
    const now = new Date();
    
    if (now > connection.rateLimitReset) {
      connection.rateLimitCount = 0;
      connection.rateLimitReset = new Date(now.getTime() + 60000); // Reset every minute
    }

    if (connection.rateLimitCount >= this.rateLimitConfig.maxMessagesPerMinute) {
      return false;
    }

    connection.rateLimitCount++;
    return true;
  }

  private async sendCachedData(connection: WebSocketConnection): Promise<void> {
    try {
      // Send cached snapshot if available
      const snapshot = await cacheAdapter.getSnapshot();
      if (snapshot) {
        connection.socket.emit('market_snapshot', {
          data: snapshot,
          source: 'cache',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error sending cached data:', error);
    }
  }

  private async sendCachedDataForSymbols(connection: WebSocketConnection, symbols: string[]): Promise<void> {
    try {
      for (const symbol of symbols) {
        // Send cached market data
        const marketData = await cacheAdapter.getMarketData(symbol);
        if (marketData) {
          connection.socket.emit('market_data', {
            symbol,
            data: marketData,
            source: 'cache',
            timestamp: new Date()
          });
        }

        // Send cached option chain
        const optionChain = await cacheAdapter.getOptionChain(symbol);
        if (optionChain) {
          connection.socket.emit('option_chain', {
            symbol,
            data: optionChain.data,
            source: 'cache',
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error sending cached symbol data:', error);
    }
  }

  // Public broadcasting methods
  async broadcastMarketData(symbol: string, data: any, priority: BroadcastMessage['priority'] = 'medium'): Promise<void> {
    const message: BroadcastMessage = {
      type: 'market_data',
      symbol,
      data,
      timestamp: new Date(),
      priority
    };

    await this.queueMessage(message);
  }

  async broadcastOptionChain(symbol: string, data: any, priority: BroadcastMessage['priority'] = 'medium'): Promise<void> {
    const message: BroadcastMessage = {
      type: 'option_chain',
      symbol,
      data,
      timestamp: new Date(),
      priority
    };

    await this.queueMessage(message);
  }

  async broadcastAlert(alert: any, priority: BroadcastMessage['priority'] = 'high'): Promise<void> {
    const message: BroadcastMessage = {
      type: 'pattern_alert',
      data: alert,
      timestamp: new Date(),
      priority
    };

    await this.queueMessage(message);
  }

  async broadcastOIDelta(symbol: string, delta: any, priority: BroadcastMessage['priority'] = 'medium'): Promise<void> {
    const message: BroadcastMessage = {
      type: 'oi_delta',
      symbol,
      data: delta,
      timestamp: new Date(),
      priority
    };

    await this.queueMessage(message);
  }

  private async queueMessage(message: BroadcastMessage): Promise<void> {
    this.messageQueue.push(message);
    
    // Sort by priority (critical first)
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      await this.processMessageQueue();
    }
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;
    
    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        await this.processMessage(message);
        
        // Small delay to prevent overwhelming clients
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    } catch (error) {
      console.error('Error processing message queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async processMessage(message: BroadcastMessage): Promise<void> {
    try {
      const startTime = Date.now();
      let targetConnections: Set<string> = new Set();

      if (message.symbol) {
        // Send to subscribers of this symbol
        targetConnections = this.subscriptions.get(message.symbol) || new Set();
      } else {
        // Send to all connections for system messages
        targetConnections = new Set(this.connections.keys());
      }

      let sentCount = 0;
      let errorCount = 0;

      for (const connectionId of targetConnections) {
        const connection = this.connections.get(connectionId);
        if (!connection) continue;

        try {
          connection.socket.emit(message.type, {
            symbol: message.symbol,
            data: message.data,
            timestamp: message.timestamp,
            priority: message.priority
          });
          
          connection.lastActivity = new Date();
          sentCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error sending to connection ${connectionId}:`, error);
        }
      }

      const latency = Date.now() - startTime;
      this.updateMetrics(sentCount, errorCount, latency);

      // Cache the data for future connections
      if (message.symbol && message.type === 'market_data') {
        await cacheAdapter.cacheMarketData(message.symbol, message.data);
      } else if (message.symbol && message.type === 'option_chain') {
        await cacheAdapter.cacheOptionChain(message.symbol, message.data);
      }

      console.log(`📡 Broadcast ${message.type} for ${message.symbol || 'all'}: ${sentCount} sent, ${errorCount} errors, ${latency}ms`);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  private updateMetrics(sentCount: number, errorCount: number, latency: number): void {
    this.messageHistory.push({ timestamp: new Date(), sent: true });
    
    // Keep only last minute of history
    const oneMinuteAgo = new Date(Date.now() - 60000);
    this.messageHistory = this.messageHistory.filter(h => h.timestamp > oneMinuteAgo);
    
    this.metrics.messagesSentLastMinute = this.messageHistory.length;
    this.metrics.errorRate = (this.metrics.errorRate + errorCount) / 2; // Running average
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2; // Running average
  }

  private startMessageProcessor(): void {
    // Process queue every 100ms for responsive updates
    setInterval(async () => {
      if (!this.isProcessingQueue && this.messageQueue.length > 0) {
        await this.processMessageQueue();
      }
    }, 100);
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        // Update connection metrics
        this.metrics.activeConnections = this.connections.size;
        this.metrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

        // Get cache hit rate
        const cacheStats = await cacheAdapter.getCacheStats();
        this.metrics.cacheHitRate = cacheStats.hitRate || 0;

        // Emit metrics for monitoring
        this.emit('metrics', this.metrics);
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 300000); // Every 5 minutes
  }

  private cleanupInactiveConnections(): void {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 300000);
    let cleanedCount = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.lastActivity < fiveMinutesAgo) {
        connection.socket.disconnect(true);
        this.connections.delete(connectionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} inactive WebSocket connections`);
    }
  }

  // Public methods for monitoring and management
  getMetrics(): ScalingMetrics {
    return { ...this.metrics };
  }

  getConnectionStats(): {
    total: number;
    active: number;
    byType: Record<string, number>;
    subscriptions: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const subscriptions: Record<string, number> = {};

    for (const connection of this.connections.values()) {
      byType[connection.connectionType] = (byType[connection.connectionType] || 0) + 1;
    }

    for (const [symbol, subs] of this.subscriptions.entries()) {
      subscriptions[symbol] = subs.size;
    }

    return {
      total: this.connections.size,
      active: this.metrics.activeConnections,
      byType,
      subscriptions
    };
  }

  async broadcastSystemMessage(message: string, priority: BroadcastMessage['priority'] = 'medium'): Promise<void> {
    const broadcastMessage: BroadcastMessage = {
      type: 'system_message',
      data: { message, timestamp: new Date() },
      timestamp: new Date(),
      priority
    };

    await this.queueMessage(broadcastMessage);
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect all clients
    for (const connection of this.connections.values()) {
      connection.socket.disconnect(true);
    }

    console.log('📴 WebSocket Scaler shutdown complete');
  }
}

// Export singleton instance
export const webSocketScaler = new WebSocketScaler();