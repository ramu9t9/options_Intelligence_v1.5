import { angelOneProvider } from './angelOneProvider';
import { db } from './db';
import { brokerCredentials } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function activateLiveData(): Promise<boolean> {
  try {
    console.log('🚀 Activating live data collection...');
    
    // Get Angel One credentials from database
    const [creds] = await db.select().from(brokerCredentials)
      .where(eq(brokerCredentials.brokerType, 'angel-one'))
      .limit(1);

    if (!creds) {
      console.error('❌ No Angel One credentials found');
      return false;
    }

    // Initialize Angel One provider
    const success = await angelOneProvider.initialize();
    if (!success) {
      console.error('❌ Angel One provider initialization failed');
      return false;
    }

    // Test live data fetch
    const testQuote = await angelOneProvider.getQuote('NIFTY', 'NSE');
    if (!testQuote || testQuote.ltp <= 0) {
      console.error('❌ Unable to fetch live market data');
      return false;
    }

    console.log(`✅ Live NIFTY price confirmed: ${testQuote.ltp}`);
    
    // Update connection status in database
    await db.update(brokerCredentials)
      .set({
        connectionStatus: 'CONNECTED',
        lastConnected: new Date(),
        updatedAt: new Date()
      })
      .where(eq(brokerCredentials.brokerType, 'angel-one'));

    console.log('✅ Live data collection activated successfully');
    console.log('📊 Data source: Angel One API (authenticated)');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to activate live data:', error);
    return false;
  }
}

// Auto-activate live data on startup
activateLiveData();