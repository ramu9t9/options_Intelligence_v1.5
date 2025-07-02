import crypto from 'crypto';

/**
 * Encryption Service for broker credentials
 * Uses AES-256-GCM for secure encryption/decryption
 */
class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor() {
    // Use environment variable or generate a fixed key for the session
    const keyString = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-broker-credentials-32chars';
    this.secretKey = crypto.scryptSync(keyString, 'salt', 32);
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text: string): string {
    try {
      const cipher = crypto.createCipher(this.algorithm, this.secretKey);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate masked display for sensitive fields
   */
  maskSensitiveData(data: string): string {
    if (!data || data.length <= 4) {
      return '••••';
    }
    
    const firstTwo = data.substring(0, 2);
    const lastTwo = data.substring(data.length - 2);
    const mask = '•'.repeat(Math.max(4, data.length - 4));
    
    return firstTwo + mask + lastTwo;
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();