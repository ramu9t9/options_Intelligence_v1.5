import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

export interface PubSubMessage {
  channel: string;
  data: any;
  timestamp: Date;
  source?: string;
}

export interface ChannelSubscription {
  channel: string;
  pattern?: boolean;
  callback: (message: any, channel: string) => void;
}

export class PubSubManager extends EventEmitter {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private subscriptions = new Map<string, ChannelSubscription[]>();
  private messageCount = 0;
  private lastMessageTime: Date | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private fallbackHandlers = new Map<string, Function[]>();

  constructor() {
    super();
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      this.publisher = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);

      await Promise.all([
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      this.setupEventHandlers();
      this.isConnected = true;
      console.log('✅ Redis pub/sub system initialized');
      this.emit('connected');
    } catch (error) {
      console.log('❌ Redis pub/sub unavailable, using in-memory fallback');
      this.isConnected = false;
      this.setupFallbackSystem();
      this.emit('disconnected');
    }
  }

  private setupEventHandlers(): void {
    if (!this.publisher || !this.subscriber) return;

    this.publisher.on('error', (error) => {
      console.log('❌ Redis publisher error:', error.message);
      this.handleConnectionLoss();
    });

    this.subscriber.on('error', (error) => {
      console.log('❌ Redis subscriber error:', error.message);
      this.handleConnectionLoss();
    });

    this.subscriber.on('message', (channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        this.handleMessage(channel, parsedMessage);
        this.messageCount++;
        this.lastMessageTime = new Date();
      } catch (error) {
        console.log('❌ Failed to parse pub/sub message:', error);
      }
    });

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        this.handleMessage(channel, parsedMessage, pattern);
        this.messageCount++;
        this.lastMessageTime = new Date();
      } catch (error) {
        console.log('❌ Failed to parse pub/sub pattern message:', error);
      }
    });

    this.publisher.on('connect', () => {
      console.log('🔗 Redis publisher connected');
      this.isConnected = true;
      this.emit('connected');
    });

    this.subscriber.on('connect', () => {
      console.log('🔗 Redis subscriber connected');
    });

    this.publisher.on('close', () => {
      console.log('📴 Redis publisher disconnected');
      this.handleConnectionLoss();
    });

    this.subscriber.on('close', () => {
      console.log('📴 Redis subscriber disconnected');
    });
  }

  private handleConnectionLoss(): void {
    this.isConnected = false;
    this.emit('disconnected');
    this.setupFallbackSystem();
    this.scheduleReconnect();
  }

  private setupFallbackSystem(): void {
    console.log('⚠️ Activating in-memory pub/sub fallback');
    // In-memory event system is already provided by EventEmitter
    // No additional setup needed
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      console.log('🔄 Attempting to reconnect Redis pub/sub...');
      await this.initializeRedis();
    }, 30000); // Retry every 30 seconds
  }

  private handleMessage(channel: string, message: any, pattern?: string): void {
    const subscriptions = this.subscriptions.get(pattern || channel);
    if (subscriptions) {
      subscriptions.forEach(sub => {
        try {
          sub.callback(message, channel);
        } catch (error) {
          console.log('❌ Error in subscription callback:', error);
        }
      });
    }

    // Emit as event for fallback handling
    this.emit(`message:${channel}`, message);
    this.emit('message', { channel, message, pattern });
  }

  async publish(channel: string, data: any, source?: string): Promise<boolean> {
    const message: PubSubMessage = {
      channel,
      data,
      timestamp: new Date(),
      source,
    };

    if (this.isConnected && this.publisher) {
      try {
        const result = await this.publisher.publish(channel, JSON.stringify(message));
        console.log(`📡 Published to ${channel}: ${result} subscribers`);
        return result > 0;
      } catch (error) {
        console.log('❌ Failed to publish message:', error);
        this.useFallback(channel, message);
        return false;
      }
    } else {
      this.useFallback(channel, message);
      return false;
    }
  }

  private useFallback(channel: string, message: PubSubMessage): void {
    // Use EventEmitter as fallback
    this.emit(`message:${channel}`, message.data);
    this.emit('message', { channel, message: message.data });
    
    // Execute fallback handlers
    const handlers = this.fallbackHandlers.get(channel);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data, channel);
        } catch (error) {
          console.log('❌ Error in fallback handler:', error);
        }
      });
    }
  }

  async subscribe(channel: string, callback: (message: any, channel: string) => void): Promise<boolean> {
    const subscription: ChannelSubscription = {
      channel,
      pattern: false,
      callback,
    };

    // Store subscription
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    this.subscriptions.get(channel)!.push(subscription);

    // Setup fallback handler
    if (!this.fallbackHandlers.has(channel)) {
      this.fallbackHandlers.set(channel, []);
    }
    this.fallbackHandlers.get(channel)!.push(callback);

    // Setup EventEmitter fallback
    this.on(`message:${channel}`, callback);

    if (this.isConnected && this.subscriber) {
      try {
        await this.subscriber.subscribe(channel);
        console.log(`👂 Subscribed to channel: ${channel}`);
        return true;
      } catch (error) {
        console.log('❌ Failed to subscribe to channel:', error);
        return false;
      }
    } else {
      console.log(`👂 Fallback subscription to channel: ${channel}`);
      return false;
    }
  }

  async psubscribe(pattern: string, callback: (message: any, channel: string) => void): Promise<boolean> {
    const subscription: ChannelSubscription = {
      channel: pattern,
      pattern: true,
      callback,
    };

    // Store subscription
    if (!this.subscriptions.has(pattern)) {
      this.subscriptions.set(pattern, []);
    }
    this.subscriptions.get(pattern)!.push(subscription);

    if (this.isConnected && this.subscriber) {
      try {
        await this.subscriber.psubscribe(pattern);
        console.log(`👂 Subscribed to pattern: ${pattern}`);
        return true;
      } catch (error) {
        console.log('❌ Failed to subscribe to pattern:', error);
        return false;
      }
    } else {
      console.log(`👂 Fallback pattern subscription: ${pattern}`);
      return false;
    }
  }

  async unsubscribe(channel: string): Promise<boolean> {
    // Remove from subscriptions
    this.subscriptions.delete(channel);
    this.fallbackHandlers.delete(channel);
    this.removeAllListeners(`message:${channel}`);

    if (this.isConnected && this.subscriber) {
      try {
        await this.subscriber.unsubscribe(channel);
        console.log(`🔇 Unsubscribed from channel: ${channel}`);
        return true;
      } catch (error) {
        console.log('❌ Failed to unsubscribe from channel:', error);
        return false;
      }
    }
    return false;
  }

  // Specialized methods for common use cases
  async publishMarketData(symbol: string, data: any): Promise<boolean> {
    return this.publish(`market_data:${symbol}`, data, 'market-service');
  }

  async publishOptionChain(symbol: string, data: any): Promise<boolean> {
    return this.publish(`option_chain:${symbol}`, data, 'option-service');
  }

  async publishPattern(symbol: string, pattern: any): Promise<boolean> {
    return this.publish(`patterns:${symbol}`, pattern, 'pattern-service');
  }

  async publishAlert(userId: string, alert: any): Promise<boolean> {
    return this.publish(`alerts:${userId}`, alert, 'alert-service');
  }

  async subscribeToMarketData(symbol: string, callback: (data: any) => void): Promise<boolean> {
    return this.subscribe(`market_data:${symbol}`, callback);
  }

  async subscribeToOptionChains(symbol: string, callback: (data: any) => void): Promise<boolean> {
    return this.subscribe(`option_chain:${symbol}`, callback);
  }

  async subscribeToPatterns(symbol: string, callback: (data: any) => void): Promise<boolean> {
    return this.subscribe(`patterns:${symbol}`, callback);
  }

  async subscribeToUserAlerts(userId: string, callback: (data: any) => void): Promise<boolean> {
    return this.subscribe(`alerts:${userId}`, callback);
  }

  async subscribeToAllMarketData(callback: (data: any, channel: string) => void): Promise<boolean> {
    return this.psubscribe('market_data:*', callback);
  }

  async subscribeToAllOptionChains(callback: (data: any, channel: string) => void): Promise<boolean> {
    return this.psubscribe('option_chain:*', callback);
  }

  async subscribeToAllPatterns(callback: (data: any, channel: string) => void): Promise<boolean> {
    return this.psubscribe('patterns:*', callback);
  }

  getStats(): {
    connected: boolean;
    messageCount: number;
    lastMessageTime: Date | null;
    subscriptionCount: number;
    channels: string[];
  } {
    return {
      connected: this.isConnected,
      messageCount: this.messageCount,
      lastMessageTime: this.lastMessageTime,
      subscriptionCount: this.subscriptions.size,
      channels: Array.from(this.subscriptions.keys()),
    };
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up pub/sub manager...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.subscriptions.clear();
    this.fallbackHandlers.clear();
    this.removeAllListeners();

    if (this.publisher) {
      await this.publisher.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }

    this.isConnected = false;
  }
}

export const pubSubManager = new PubSubManager();