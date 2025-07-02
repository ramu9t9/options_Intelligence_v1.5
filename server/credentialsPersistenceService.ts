/**
 * Credentials Persistence Service
 * Automatically loads and activates stored broker credentials on startup
 */

import { EventEmitter } from 'events';
import { db } from './db';
import { brokerConfigs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { angelOneProvider } from './angelOneProvider';
import { encryptionService } from './encryptionService';

export class CredentialsPersistenceService extends EventEmitter {
  private isInitialized = false;
  private autoLoadInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    try {
      console.log('🔑 Initializing Credentials Persistence Service...');
      
      // Load stored credentials immediately
      await this.loadStoredCredentials();
      
      // Set up periodic check for credential updates (every 30 seconds)
      this.autoLoadInterval = setInterval(() => {
        this.loadStoredCredentials();
      }, 30000);
      
      this.isInitialized = true;
      console.log('✅ Credentials Persistence Service initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Error initializing Credentials Persistence Service:', error);
    }
  }

  async loadStoredCredentials(): Promise<boolean> {
    try {
      // Check for Angel One credentials in the broker_configs table
      const [angelCreds] = await db.select().from(brokerConfigs)
        .where(eq(brokerConfigs.brokerName, 'angel-one'))
        .limit(1);

      if (angelCreds && angelCreds.apiKey && angelCreds.clientId && angelCreds.apiSecret) {
        console.log('🔑 Found stored Angel One credentials, decrypting and activating...');
        
        // Decrypt credentials
        const decryptedCredentials = {
          clientId: encryptionService.decrypt(angelCreds.clientId),
          apiKey: encryptionService.decrypt(angelCreds.apiKey),
          apiSecret: encryptionService.decrypt(angelCreds.apiSecret),
          pin: encryptionService.decrypt(angelCreds.pin),
          totpKey: angelCreds.totpKey ? encryptionService.decrypt(angelCreds.totpKey) : undefined
        };
        
        // Set credentials in Angel One provider
        angelOneProvider.setCredentials(decryptedCredentials);
        
        // Test the connection
        const success = await angelOneProvider.initialize();
        
        if (success) {
          console.log('✅ Angel One provider activated with stored credentials');
          
          // Update connection status
          await db.update(brokerConfigs)
            .set({ 
              isActive: true,
              lastUsed: new Date(),
              updatedAt: new Date()
            })
            .where(eq(brokerConfigs.brokerName, 'angel-one'));
          
          this.emit('credentialsLoaded', { broker: 'angel-one', status: 'connected' });
          return true;
        } else {
          console.log('⚠️ Failed to activate Angel One provider with stored credentials');
          
          // Update connection status to inactive
          await db.update(brokerConfigs)
            .set({ 
              isActive: false,
              updatedAt: new Date()
            })
            .where(eq(brokerConfigs.brokerName, 'angel-one'));
          
          this.emit('credentialsError', { broker: 'angel-one', error: 'Authentication failed' });
          return false;
        }
      } else {
        console.log('ℹ️ No stored Angel One credentials found');
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading stored credentials:', error);
      this.emit('credentialsError', { broker: 'angel-one', error: (error as Error).message });
      return false;
    }
  }

  async getCredentials(brokerType: string): Promise<any> {
    try {
      const [credentials] = await db.select().from(brokerConfigs)
        .where(eq(brokerConfigs.brokerName, brokerType))
        .limit(1);
      return credentials || null;
    } catch (error) {
      console.error(`❌ Error getting ${brokerType} credentials:`, error);
      return null;
    }
  }

  async testCredentials(): Promise<{ broker: string; status: string; message: string }[]> {
    const results = [];
    
    try {
      // Test Angel One credentials
      const [angelCreds] = await db.select().from(brokerConfigs)
        .where(eq(brokerConfigs.brokerName, 'angel-one'))
        .limit(1);

      if (angelCreds) {
        const isConnected = await angelOneProvider.isAuthenticated();
        results.push({
          broker: 'angel-one',
          status: isConnected ? 'connected' : 'disconnected',
          message: isConnected 
            ? `Connected with client ID: ${encryptionService.decrypt(angelCreds.clientId)}`
            : 'Stored credentials found but not connected'
        });
      } else {
        results.push({
          broker: 'angel-one',
          status: 'not-configured',
          message: 'No credentials stored'
        });
      }
    } catch (error) {
      results.push({
        broker: 'angel-one',
        status: 'error',
        message: (error as Error).message
      });
    }

    return results;
  }

  async refreshConnection(): Promise<boolean> {
    console.log('🔄 Refreshing broker connections...');
    return await this.loadStoredCredentials();
  }

  getStatus(): { initialized: boolean; autoLoadActive: boolean } {
    return {
      initialized: this.isInitialized,
      autoLoadActive: this.autoLoadInterval !== null
    };
  }

  stop(): void {
    if (this.autoLoadInterval) {
      clearInterval(this.autoLoadInterval);
      this.autoLoadInterval = null;
    }
    this.isInitialized = false;
    console.log('🛑 Credentials Persistence Service stopped');
  }
}

export const credentialsPersistenceService = new CredentialsPersistenceService();