/**
 * User Broker Service - Industry Standard Implementation
 * Allows users to connect their own broker credentials to bypass cloud IP restrictions
 * Similar to how Sensibull, Zerodha Kite, and Angel One platforms work
 */

import { storage } from './storage';
import { AngelOneProvider } from './angelOneProvider';
import crypto from 'crypto';

export interface UserBrokerCredentials {
  userId: number;
  brokerType: 'angel-one' | 'dhan';
  clientId: string;
  apiKey: string;
  apiSecret: string;
  pin: string;
  totpKey: string;
  isActive: boolean;
}

export interface UserBrokerConnection {
  userId: number;
  brokerType: string;
  isConnected: boolean;
  lastConnected: Date | null;
  provider: AngelOneProvider | null;
}

export class UserBrokerService {
  private userConnections: Map<string, UserBrokerConnection> = new Map();
  private encryptionKey: string;

  constructor() {
    // Use environment variable or generate a key for encryption
    this.encryptionKey = process.env.USER_BROKER_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Encrypt sensitive credentials before storage
   */
  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt credentials for use
   */
  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Save user's broker credentials securely
   */
  async saveUserCredentials(credentials: UserBrokerCredentials): Promise<boolean> {
    try {
      // Encrypt sensitive fields
      const encryptedCredentials = {
        ...credentials,
        apiKey: this.encrypt(credentials.apiKey),
        apiSecret: this.encrypt(credentials.apiSecret),
        pin: this.encrypt(credentials.pin),
        totpKey: this.encrypt(credentials.totpKey)
      };

      // Store in database (we'll add this to schema)
      await storage.saveUserBrokerCredentials(encryptedCredentials);
      
      console.log(`✅ Saved encrypted credentials for user ${credentials.userId} - ${credentials.brokerType}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save user credentials:', error);
      return false;
    }
  }

  /**
   * Save user's broker credentials securely - alternative method signature for routes
   */
  async saveUserBrokerCredentials(userId: number, credentials: {
    brokerType: 'angel-one' | 'dhan';
    clientId: string;
    apiKey: string;
    apiSecret: string;
    pin: string;
    totpKey: string;
  }): Promise<boolean> {
    return this.saveUserCredentials({
      userId,
      ...credentials,
      isActive: true
    });
  }

  /**
   * Connect user to their broker using their own credentials
   */
  async connectUserToBroker(userId: number, brokerType: string = 'angel-one'): Promise<boolean> {
    try {
      // Get user's encrypted credentials
      const encryptedCredentials = await storage.getUserBrokerCredentials(userId, brokerType);
      if (!encryptedCredentials) {
        console.log(`❌ No credentials found for user ${userId} - ${brokerType}`);
        return false;
      }

      // Decrypt credentials
      const credentials = {
        ...encryptedCredentials,
        apiKey: this.decrypt(encryptedCredentials.apiKey),
        apiSecret: this.decrypt(encryptedCredentials.apiSecret),
        pin: this.decrypt(encryptedCredentials.pin),
        totpKey: this.decrypt(encryptedCredentials.totpKey)
      };

      // Create provider instance for this user
      const provider = new AngelOneProvider();
      
      // Override the provider's credentials with user-specific ones
      (provider as any).credentials = {
        apiKey: credentials.apiKey,
        clientId: credentials.clientId,
        clientSecret: credentials.apiSecret
      };

      // Test connection using provider's initialize method
      const connected = await provider.initialize();
      if (connected) {
        // Store active connection
        this.userConnections.set(userId.toString(), {
          userId,
          brokerType,
          isConnected: true,
          lastConnected: new Date(),
          provider
        });

        console.log(`✅ User ${userId} connected to ${brokerType} successfully`);
        return true;
      } else {
        console.log(`❌ Failed to authenticate user ${userId} with ${brokerType}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error connecting user ${userId} to broker:`, error);
      return false;
    }
  }

  /**
   * Get market data using user's own broker connection
   */
  async getUserMarketData(userId: number, symbol: string): Promise<any> {
    const connection = this.userConnections.get(userId.toString());
    
    if (!connection || !connection.isConnected || !connection.provider) {
      // Try to reconnect
      const reconnected = await this.connectUserToBroker(userId);
      if (!reconnected) {
        throw new Error('User not connected to broker. Please provide your broker credentials.');
      }
    }

    const updatedConnection = this.userConnections.get(userId.toString());
    if (updatedConnection?.provider) {
      return await updatedConnection.provider.getQuote(symbol);
    }

    throw new Error('No active broker connection found');
  }

  /**
   * Check if user has valid broker connection
   */
  isUserConnected(userId: number): boolean {
    const connection = this.userConnections.get(userId.toString());
    return connection?.isConnected || false;
  }

  /**
   * Disconnect user from broker
   */
  async disconnectUser(userId: number): Promise<void> {
    const connection = this.userConnections.get(userId.toString());
    if (connection?.provider) {
      connection.provider.removeAllListeners();
      connection.isConnected = false;
    }
    this.userConnections.delete(userId.toString());
    console.log(`🔌 Disconnected user ${userId} from broker`);
  }

  /**
   * Get connection status for user
   */
  getUserConnectionStatus(userId: number): any {
    const connection = this.userConnections.get(userId.toString());
    return {
      isConnected: connection?.isConnected || false,
      brokerType: connection?.brokerType || null,
      lastConnected: connection?.lastConnected || null
    };
  }

  /**
   * Get user broker status - alias for getUserConnectionStatus
   */
  getUserBrokerStatus(userId: number): any {
    return this.getUserConnectionStatus(userId);
  }

  /**
   * Disconnect user from broker - alias for disconnectUser
   */
  async disconnectUserFromBroker(userId: number): Promise<void> {
    return this.disconnectUser(userId);
  }
}

export const userBrokerService = new UserBrokerService();