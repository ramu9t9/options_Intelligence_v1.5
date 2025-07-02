import { angelOneProvider } from './angelOneProvider';
import { db } from './db';
import { brokerCredentials } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { authenticator } from 'otplib';

class LiveDataManager {
  private isLiveActive = false;

  async activateLiveData(): Promise<void> {
    console.log('Activating live data collection...');

    // Get Angel One credentials from database
    const [creds] = await db.select().from(brokerCredentials)
      .where(eq(brokerCredentials.brokerType, 'angel-one'))
      .limit(1);

    if (!creds) {
      throw new Error('No Angel One credentials found');
    }

    // Initialize Angel One provider
    const success = await angelOneProvider.initialize();
    if (!success) {
      throw new Error('Angel One provider initialization failed');
    }

    // Test connection with live quote
    const testQuote = await angelOneProvider.getQuote('NIFTY', 'NSE');
    if (!testQuote || testQuote.ltp <= 0) {
      throw new Error('Unable to fetch live market data');
    }

    console.log(`Live NIFTY price confirmed: ${testQuote.ltp}`);
    this.isLiveActive = true;

    // Update connection status
    await db.update(brokerCredentials)
      .set({
        connectionStatus: 'CONNECTED',
        lastConnected: new Date(),
        updatedAt: new Date()
      })
      .where(eq(brokerCredentials.brokerType, 'angel-one'));

    console.log('Live data collection activated successfully');
  }

  async getCurrentLiveData(): Promise<any> {
    if (!this.isLiveActive) {
      throw new Error('Live data not active');
    }

    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    const liveData = {};

    for (const symbol of symbols) {
      const quote = await angelOneProvider.getQuote(symbol, 'NSE');
      if (quote) {
        liveData[symbol] = {
          price: quote.ltp,
          change: quote.ltp - quote.close,
          changePercent: ((quote.ltp - quote.close) / quote.close * 100).toFixed(2),
          volume: quote.volume,
          source: 'angel-one-live'
        };
      }
    }

    return liveData;
  }

  isActive(): boolean {
    return this.isLiveActive;
  }
}

export const liveDataManager = new LiveDataManager();