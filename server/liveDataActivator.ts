import { angelOneProvider } from './angelOneProvider';
import { centralizedDataFeed } from './centralizedDataFeed';
import { enhancedDataService } from './enhancedDataService';
import { centralDataBroadcaster } from './centralDataBroadcaster';
import { db } from './db';
import { brokerCredentials } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { authenticator } from 'otplib';

export class LiveDataActivator {
  private isLiveDataActive = false;

  async activateLiveData(): Promise<boolean> {
    try {
      console.log('🚀 Activating live data collection...');

      // Step 1: Get Angel One credentials from database
      const credentials = await this.getAngelOneCredentials();
      if (!credentials) {
        throw new Error('No Angel One credentials found in database');
      }

      // Step 2: Initialize Angel One provider with credentials
      await this.initializeAngelOneProvider(credentials);

      // Step 3: Verify connection and get live data
      const connectionTest = await this.testLiveConnection();
      if (!connectionTest.success) {
        throw new Error(`Angel One connection failed: ${connectionTest.message}`);
      }

      // Step 4: Update centralized data feed to use live data
      await this.updateCentralizedFeedConfig(credentials);

      // Step 5: Initialize enhanced data service with live mode
      await this.initializeEnhancedDataService();

      // Step 6: Update connection status in database
      await this.updateConnectionStatus('CONNECTED');

      this.isLiveDataActive = true;
      console.log('✅ Live data collection activated successfully');
      console.log(`📊 Data source: Angel One API (Client: ${credentials.clientId})`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to activate live data:', error);
      await this.updateConnectionStatus('FAILED');
      return false;
    }
  }

  private async getAngelOneCredentials(): Promise<any> {
    const [creds] = await db.select().from(brokerCredentials)
      .where(eq(brokerCredentials.brokerType, 'angel-one'))
      .orderBy(brokerCredentials.updatedAt)
      .limit(1);

    if (!creds) {
      return null;
    }

    return {
      clientId: creds.clientId,
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      pin: creds.pin,
      totp: creds.totp
    };
  }

  private async initializeAngelOneProvider(credentials: any): Promise<void> {
    // Generate current TOTP code
    const totpCode = authenticator.generate(credentials.totp);
    
    console.log('🔐 Authenticating with Angel One...');
    console.log(`Client ID: ${credentials.clientId}`);
    console.log(`TOTP: ${totpCode}`);

    // Initialize the provider with credentials
    const success = await angelOneProvider.initialize();
    if (!success) {
      throw new Error('Angel One provider initialization failed');
    }
  }

  private async testLiveConnection(): Promise<{success: boolean, message: string}> {
    try {
      // Test with NIFTY quote
      const quote = await angelOneProvider.getQuote('NIFTY', 'NSE');
      if (quote && quote.ltp > 0) {
        console.log(`📈 Live NIFTY price: ${quote.ltp}`);
        return { success: true, message: `Live data confirmed - NIFTY: ${quote.ltp}` };
      } else {
        return { success: false, message: 'No live data received' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  private async updateCentralizedFeedConfig(credentials: any): Promise<void> {
    const config = {
      adminApiKey: credentials.apiKey,
      adminClientId: credentials.clientId,
      adminSecret: credentials.apiSecret,
      adminPin: credentials.pin,
      adminTotp: credentials.totp
    };

    const success = await centralizedDataFeed.initialize(config);
    if (!success) {
      throw new Error('Failed to initialize centralized data feed');
    }
  }

  private async initializeEnhancedDataService(): Promise<void> {
    await enhancedDataService.initialize();
    console.log('📊 Enhanced data service initialized with live mode');
  }

  private async updateConnectionStatus(status: string): Promise<void> {
    await db.update(brokerCredentials)
      .set({
        connectionStatus: status as any,
        lastConnected: new Date(),
        updatedAt: new Date()
      })
      .where(eq(brokerCredentials.brokerType, 'angel-one'));
  }

  async deactivateLiveData(): Promise<void> {
    console.log('🛑 Deactivating live data collection...');
    
    angelOneProvider.disconnect();
    centralizedDataFeed.stop();
    enhancedDataService.stop();
    
    await this.updateConnectionStatus('DISCONNECTED');
    this.isLiveDataActive = false;
    
    console.log('✅ Live data collection deactivated');
  }

  isLiveActive(): boolean {
    return this.isLiveDataActive;
  }

  async getCurrentLiveData(): Promise<any> {
    if (!this.isLiveDataActive) {
      throw new Error('Live data is not active');
    }

    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    const liveData = {};

    for (const symbol of symbols) {
      try {
        const quote = await angelOneProvider.getQuote(symbol, 'NSE');
        if (quote) {
          liveData[symbol] = {
            price: quote.ltp,
            change: quote.ltp - quote.close,
            changePercent: ((quote.ltp - quote.close) / quote.close * 100).toFixed(2),
            volume: quote.volume,
            source: 'angel-one-live',
            timestamp: new Date()
          };
        }
      } catch (error) {
        console.error(`Error fetching live data for ${symbol}:`, error);
      }
    }

    return liveData;
  }

  async getLiveOptionChain(symbol: string): Promise<any> {
    if (!this.isLiveDataActive) {
      throw new Error('Live data is not active');
    }

    try {
      const expiry = this.getNextExpiry();
      const optionChain = await angelOneProvider.getOptionChain(symbol, expiry);
      
      if (optionChain && optionChain.data) {
        return {
          symbol,
          expiry,
          data: optionChain.data.map((strike: any) => ({
            strike: strike.strikePrice,
            call: {
              oi: strike.CE?.openInterest || 0,
              oiChange: strike.CE?.changeinOpenInterest || 0,
              ltp: strike.CE?.lastPrice || 0,
              volume: strike.CE?.totalTradedVolume || 0
            },
            put: {
              oi: strike.PE?.openInterest || 0,
              oiChange: strike.PE?.changeinOpenInterest || 0,
              ltp: strike.PE?.lastPrice || 0,
              volume: strike.PE?.totalTradedVolume || 0
            }
          })),
          source: 'angel-one-live',
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error(`Error fetching option chain for ${symbol}:`, error);
      throw error;
    }
  }

  private getNextExpiry(): string {
    const now = new Date();
    const nextThursday = new Date(now);
    nextThursday.setDate(now.getDate() + (4 - now.getDay() + 7) % 7);
    return nextThursday.toISOString().split('T')[0];
  }
}

export const liveDataActivator = new LiveDataActivator();