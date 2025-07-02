import { db } from './db';
import { brokerConfigs, type BrokerConfig, type InsertBrokerConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { encryptionService } from './encryptionService';

export interface BrokerConfigData {
  brokerName: 'angel-one' | 'dhan';
  clientId: string;
  apiKey: string;
  apiSecret: string;
  pin: string;
  totpKey?: string;
}

export interface MaskedBrokerConfig {
  id: number;
  brokerName: string;
  clientId: string;
  apiKey: string; // masked
  apiSecret: string; // masked
  pin: string; // masked
  totpKey?: string; // masked
  isActive: boolean;
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for managing encrypted broker configurations
 */
export class BrokerConfigService {
  
  /**
   * Save encrypted broker configuration
   */
  async saveBrokerConfig(configData: BrokerConfigData): Promise<BrokerConfig> {
    try {
      // Encrypt sensitive fields
      const encryptedConfig: InsertBrokerConfig = {
        brokerName: configData.brokerName,
        clientId: configData.clientId,
        apiKey: encryptionService.encrypt(configData.apiKey),
        apiSecret: encryptionService.encrypt(configData.apiSecret),
        pin: encryptionService.encrypt(configData.pin),
        totpKey: configData.totpKey ? encryptionService.encrypt(configData.totpKey) : null,
        isActive: true,
        lastUsed: new Date()
      };

      // Check if config already exists for this broker
      const existingConfig = await this.getBrokerConfig(configData.brokerName);
      
      if (existingConfig) {
        // Update existing configuration
        const [updatedConfig] = await db
          .update(brokerConfigs)
          .set({
            ...encryptedConfig,
            updatedAt: new Date()
          })
          .where(eq(brokerConfigs.brokerName, configData.brokerName))
          .returning();
        
        return updatedConfig;
      } else {
        // Create new configuration
        const [newConfig] = await db
          .insert(brokerConfigs)
          .values(encryptedConfig)
          .returning();
        
        return newConfig;
      }
    } catch (error) {
      console.error('Failed to save broker config:', error);
      throw new Error('Failed to save broker configuration');
    }
  }

  /**
   * Get encrypted broker configuration (for internal use)
   */
  async getBrokerConfig(brokerName: string): Promise<BrokerConfig | null> {
    try {
      const [config] = await db
        .select()
        .from(brokerConfigs)
        .where(eq(brokerConfigs.brokerName, brokerName));
      
      return config || null;
    } catch (error) {
      console.error('Failed to get broker config:', error);
      return null;
    }
  }

  /**
   * Get decrypted broker configuration for API usage
   */
  async getDecryptedBrokerConfig(brokerName: string): Promise<BrokerConfigData | null> {
    try {
      const config = await this.getBrokerConfig(brokerName);
      
      if (!config) {
        return null;
      }

      // Decrypt sensitive fields
      return {
        brokerName: config.brokerName as 'angel-one' | 'dhan',
        clientId: config.clientId,
        apiKey: encryptionService.decrypt(config.apiKey),
        apiSecret: encryptionService.decrypt(config.apiSecret),
        pin: encryptionService.decrypt(config.pin),
        totpKey: config.totpKey ? encryptionService.decrypt(config.totpKey) : undefined
      };
    } catch (error) {
      console.error('Failed to decrypt broker config:', error);
      return null;
    }
  }

  /**
   * Get masked broker configuration for display purposes
   */
  async getMaskedBrokerConfig(brokerName: string): Promise<MaskedBrokerConfig | null> {
    try {
      const config = await this.getBrokerConfig(brokerName);
      
      if (!config) {
        return null;
      }

      return {
        id: config.id,
        brokerName: config.brokerName,
        clientId: config.clientId,
        apiKey: encryptionService.maskSensitiveData(config.apiKey),
        apiSecret: encryptionService.maskSensitiveData(config.apiSecret),
        pin: encryptionService.maskSensitiveData(config.pin),
        totpKey: config.totpKey ? encryptionService.maskSensitiveData(config.totpKey) : undefined,
        isActive: config.isActive,
        lastUsed: config.lastUsed,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      };
    } catch (error) {
      console.error('Failed to get masked broker config:', error);
      return null;
    }
  }

  /**
   * Get all masked broker configurations
   */
  async getAllMaskedConfigs(): Promise<MaskedBrokerConfig[]> {
    try {
      const configs = await db.select().from(brokerConfigs);
      
      return configs.map(config => ({
        id: config.id,
        brokerName: config.brokerName,
        clientId: config.clientId,
        apiKey: encryptionService.maskSensitiveData(config.apiKey),
        apiSecret: encryptionService.maskSensitiveData(config.apiSecret),
        pin: encryptionService.maskSensitiveData(config.pin),
        totpKey: config.totpKey ? encryptionService.maskSensitiveData(config.totpKey) : undefined,
        isActive: config.isActive,
        lastUsed: config.lastUsed,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }));
    } catch (error) {
      console.error('Failed to get all masked configs:', error);
      return [];
    }
  }

  /**
   * Delete broker configuration
   */
  async deleteBrokerConfig(brokerName: string): Promise<boolean> {
    try {
      const result = await db
        .delete(brokerConfigs)
        .where(eq(brokerConfigs.brokerName, brokerName));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete broker config:', error);
      return false;
    }
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(brokerName: string): Promise<void> {
    try {
      await db
        .update(brokerConfigs)
        .set({ lastUsed: new Date(), updatedAt: new Date() })
        .where(eq(brokerConfigs.brokerName, brokerName));
    } catch (error) {
      console.error('Failed to update last used:', error);
    }
  }
}

// Export singleton instance
export const brokerConfigService = new BrokerConfigService();