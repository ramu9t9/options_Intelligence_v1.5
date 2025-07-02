/**
 * Angel One TOTP Authentication Fix
 * Comprehensive solution for TOTP generation and authentication
 */

import * as crypto from 'crypto';

export class AngelOneTotpFix {
  /**
   * Generate TOTP with multiple window attempts for Angel One
   * This handles timing issues and provides multiple valid codes
   */
  static generateTotpWithWindows(secret: string): { codes: string[], currentTime: number } {
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
    const currentTime = Math.floor(Date.now() / 1000);
    const window = 30; // TOTP window in seconds
    
    const codes: string[] = [];
    
    // Generate codes for current window and ±1 windows (covers timing drift)
    for (let offset = -1; offset <= 1; offset++) {
      const timeWindow = Math.floor((currentTime + (offset * window)) / window);
      const code = this.generateTotpCode(cleanSecret, timeWindow);
      codes.push(code);
    }
    
    return { codes, currentTime };
  }

  /**
   * Generate a single TOTP code for a specific time window
   */
  private static generateTotpCode(secret: string, timeWindow: number): string {
    // Convert base32 secret to buffer
    const key = this.base32ToBuffer(secret);
    
    // Create time-based counter
    const counter = Buffer.alloc(8);
    counter.writeUInt32BE(0, 0);
    counter.writeUInt32BE(timeWindow, 4);
    
    // Generate HMAC
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counter);
    const digest = hmac.digest();
    
    // Dynamic truncation
    const offset = digest[digest.length - 1] & 0x0f;
    const code = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);
    
    // Return 6-digit code
    return (code % 1000000).toString().padStart(6, '0');
  }

  /**
   * Convert base32 string to buffer
   */
  private static base32ToBuffer(base32: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    
    // Convert each character to 5-bit binary
    for (const char of base32) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;
      bits += index.toString(2).padStart(5, '0');
    }
    
    // Convert bits to bytes
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const byte = bits.substr(i, 8);
      if (byte.length === 8) {
        bytes.push(parseInt(byte, 2));
      }
    }
    
    return Buffer.from(bytes);
  }

  /**
   * Test multiple TOTP codes against Angel One API
   */
  static async testMultipleCodes(
    credentials: {
      clientId: string;
      apiKey: string;
      apiSecret: string;
      pin: string;
      totpKey: string;
    }
  ): Promise<{ success: boolean; workingCode?: string; response?: any; error?: string }> {
    const { codes } = this.generateTotpWithWindows(credentials.totpKey);
    
    console.log(`🔐 Testing ${codes.length} TOTP codes for Angel One authentication...`);
    
    for (const code of codes) {
      try {
        console.log(`🧪 Testing TOTP code: ${code}`);
        
        const result = await this.testSingleCode(credentials, code);
        if (result.success) {
          console.log(`✅ SUCCESS: TOTP code ${code} worked!`);
          return { success: true, workingCode: code, response: result.response };
        } else {
          console.log(`❌ FAILED: TOTP code ${code} - ${result.error}`);
        }
      } catch (error) {
        console.log(`🚨 ERROR testing code ${code}:`, error);
      }
    }
    
    return { 
      success: false, 
      error: `All ${codes.length} TOTP codes failed. Check your TOTP secret or Angel One account status.` 
    };
  }

  /**
   * Test a single TOTP code with Angel One API
   */
  private static async testSingleCode(
    credentials: { clientId: string; apiKey: string; apiSecret: string; pin: string },
    totpCode: string
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      const axios = require('axios');
      
      const loginData = {
        clientcode: credentials.clientId,
        password: credentials.pin,
        totp: totpCode
      };
      
      const response = await axios.post(
        'https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword',
        loginData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress': '00:00:00:00:00:00',
            'X-PrivateKey': credentials.apiKey
          },
          timeout: 10000
        }
      );
      
      if (response.data?.status === true && response.data?.data?.jwtToken) {
        return { success: true, response: response.data };
      } else {
        return { 
          success: false, 
          error: response.data?.message || 'Authentication failed' 
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Network error' 
      };
    }
  }

  /**
   * Generate current TOTP for manual verification
   */
  static getCurrentTotp(secret: string): string {
    const { codes } = this.generateTotpWithWindows(secret);
    return codes[1]; // Return the current time window code
  }

  /**
   * Verify TOTP secret format
   */
  static verifyTotpSecret(secret: string): { valid: boolean; error?: string } {
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
    
    if (cleanSecret.length === 0) {
      return { valid: false, error: 'TOTP secret is empty' };
    }
    
    if (cleanSecret.length < 16) {
      return { valid: false, error: 'TOTP secret too short (minimum 16 characters)' };
    }
    
    const base32Regex = /^[A-Z2-7]+=*$/;
    if (!base32Regex.test(cleanSecret)) {
      return { valid: false, error: 'Invalid base32 format' };
    }
    
    return { valid: true };
  }
}