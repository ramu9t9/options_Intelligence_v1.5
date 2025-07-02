import { db } from './db';
import { 
  realtimeDataSnapshots,
  intradayOptionOI,
  dailyOptionOI,
  oiDeltaLog,
  optionData,
  instruments
} from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface MarketDataSnapshot {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  optionChain: Array<{
    strike: number;
    callOI: number;
    callOIChange: number;
    callLTP: number;
    callVolume: number;
    putOI: number;
    putOIChange: number;
    putLTP: number;
    putVolume: number;
  }>;
  timestamp: Date;
}

export class DataPersistenceService {
  private instrumentIds = new Map<string, number>();

  async initialize(): Promise<void> {
    console.log('🗄️ Initializing Data Persistence Service...');
    
    // Ensure instruments exist in database
    await this.ensureInstruments();
    
    console.log('✅ Data Persistence Service initialized');
  }

  private async ensureInstruments(): Promise<void> {
    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    
    for (const symbol of symbols) {
      try {
        // Check if instrument exists
        const existing = await db.select().from(instruments).where(eq(instruments.symbol, symbol)).limit(1);
        
        if (existing.length === 0) {
          // Create instrument
          const [instrument] = await db.insert(instruments).values({
            symbol,
            name: `${symbol} Index`,
            marketType: 'INDEX' as any,
            underlyingPrice: symbol === 'NIFTY' ? '24500' : symbol === 'BANKNIFTY' ? '52000' : '24000',
            isActive: true
          }).returning();
          
          this.instrumentIds.set(symbol, instrument.id);
          console.log(`📊 Created instrument: ${symbol} (ID: ${instrument.id})`);
        } else {
          this.instrumentIds.set(symbol, existing[0].id);
          console.log(`📊 Found existing instrument: ${symbol} (ID: ${existing[0].id})`);
        }
      } catch (error) {
        console.error(`Error ensuring instrument ${symbol}:`, error);
      }
    }
  }

  async persistMarketSnapshot(snapshot: MarketDataSnapshot): Promise<void> {
    const instrumentId = this.instrumentIds.get(snapshot.symbol);
    if (!instrumentId) {
      console.error(`No instrument ID found for ${snapshot.symbol}`);
      return;
    }

    try {
      // 1. Update realtime_data_snapshots
      await this.updateRealtimeSnapshot(instrumentId, snapshot);
      
      // 2. Store intraday option data
      await this.storeIntradayOptionData(snapshot);
      
      // 3. Update option_data table
      await this.updateOptionData(instrumentId, snapshot);
      
      // 4. Log OI changes
      await this.logOIChanges(snapshot);
      
      console.log(`💾 Persisted market data for ${snapshot.symbol}: ₹${snapshot.price.toLocaleString()}`);
    } catch (error) {
      console.error(`Error persisting data for ${snapshot.symbol}:`, error);
    }
  }

  private async updateRealtimeSnapshot(instrumentId: number, snapshot: MarketDataSnapshot): Promise<void> {
    // Calculate total OI for calls and puts
    const totalCallOI = snapshot.optionChain.reduce((sum, option) => sum + option.callOI, 0);
    const totalPutOI = snapshot.optionChain.reduce((sum, option) => sum + option.putOI, 0);
    const putCallRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

    // Determine market sentiment
    let marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (snapshot.changePercent > 0.5) marketSentiment = 'BULLISH';
    else if (snapshot.changePercent < -0.5) marketSentiment = 'BEARISH';

    // Calculate max pain (strike with highest total OI)
    let maxPainStrike = 0;
    let maxTotalOI = 0;
    snapshot.optionChain.forEach(option => {
      const totalOI = option.callOI + option.putOI;
      if (totalOI > maxTotalOI) {
        maxTotalOI = totalOI;
        maxPainStrike = option.strike;
      }
    });

    // Upsert realtime snapshot
    await db.insert(realtimeDataSnapshots).values({
      instrumentId,
      currentPrice: snapshot.price.toString(),
      changeFromOpen: snapshot.change.toString(),
      changePercent: snapshot.changePercent.toString(),
      volume: snapshot.volume,
      marketSentiment,
      totalCallOI,
      totalPutOI,
      putCallRatio: putCallRatio.toString(),
      maxPainStrike: maxPainStrike.toString(),
      dataSource: 'live-simulator',
      lastUpdated: snapshot.timestamp
    }).onConflictDoNothing();
  }

  private async storeIntradayOptionData(snapshot: MarketDataSnapshot): Promise<void> {
    for (const option of snapshot.optionChain) {
      // Store call option data
      await db.insert(intradayOptionOI).values({
        symbol: snapshot.symbol,
        timestamp: snapshot.timestamp,
        strike: option.strike.toString(),
        optionType: 'CE',
        openInterest: option.callOI,
        oiChange: option.callOIChange,
        lastPrice: option.callLTP.toString(),
        volume: option.callVolume,
        dataSource: 'live-simulator'
      }).onConflictDoNothing();

      // Store put option data
      await db.insert(intradayOptionOI).values({
        symbol: snapshot.symbol,
        timestamp: snapshot.timestamp,
        strike: option.strike.toString(),
        optionType: 'PE',
        openInterest: option.putOI,
        oiChange: option.putOIChange,
        lastPrice: option.putLTP.toString(),
        volume: option.putVolume,
        dataSource: 'live-simulator'
      }).onConflictDoNothing();
    }
  }

  private async updateOptionData(instrumentId: number, snapshot: MarketDataSnapshot): Promise<void> {
    for (const option of snapshot.optionChain) {
      // Update call option
      await db.insert(optionData).values({
        instrumentId,
        strikePrice: option.strike.toString(),
        optionType: 'CE',
        openInterest: option.callOI,
        oiChange: option.callOIChange,
        lastTradedPrice: option.callLTP.toString(),
        ltpChange: '0',
        volume: option.callVolume,
        timestamp: snapshot.timestamp
      }).onConflictDoUpdate({
        target: [optionData.instrumentId, optionData.strikePrice, optionData.optionType],
        set: {
          openInterest: option.callOI,
          oiChange: option.callOIChange,
          lastTradedPrice: option.callLTP.toString(),
          volume: option.callVolume,
          timestamp: snapshot.timestamp
        }
      });

      // Update put option
      await db.insert(optionData).values({
        instrumentId,
        strikePrice: option.strike.toString(),
        optionType: 'PE',
        openInterest: option.putOI,
        oiChange: option.putOIChange,
        lastTradedPrice: option.putLTP.toString(),
        ltpChange: '0',
        volume: option.putVolume,
        timestamp: snapshot.timestamp
      }).onConflictDoUpdate({
        target: [optionData.instrumentId, optionData.strikePrice, optionData.optionType],
        set: {
          openInterest: option.putOI,
          oiChange: option.putOIChange,
          lastTradedPrice: option.putLTP.toString(),
          volume: option.putVolume,
          timestamp: snapshot.timestamp
        }
      });
    }
  }

  private async logOIChanges(snapshot: MarketDataSnapshot): Promise<void> {
    for (const option of snapshot.optionChain) {
      // Log call OI changes if significant
      if (Math.abs(option.callOIChange) > 100) {
        await db.insert(oiDeltaLog).values({
          symbol: snapshot.symbol,
          timestamp: snapshot.timestamp,
          strike: option.strike.toString(),
          optionType: 'CE',
          oldOI: option.callOI - option.callOIChange,
          newOI: option.callOI,
          deltaOI: option.callOIChange,
          percentChange: option.callOI > 0 ? ((option.callOIChange / option.callOI) * 100).toString() : '0',
          triggerReason: Math.abs(option.callOIChange) > 1000 ? 'LARGE_OI_BUILD' : 'MODERATE_OI_CHANGE',
          dataSource: 'live-simulator'
        }).onConflictDoNothing();
      }

      // Log put OI changes if significant
      if (Math.abs(option.putOIChange) > 100) {
        await db.insert(oiDeltaLog).values({
          symbol: snapshot.symbol,
          timestamp: snapshot.timestamp,
          strike: option.strike.toString(),
          optionType: 'PE',
          oldOI: option.putOI - option.putOIChange,
          newOI: option.putOI,
          deltaOI: option.putOIChange,
          percentChange: option.putOI > 0 ? ((option.putOIChange / option.putOI) * 100).toString() : '0',
          triggerReason: Math.abs(option.putOIChange) > 1000 ? 'LARGE_OI_BUILD' : 'MODERATE_OI_CHANGE',
          dataSource: 'live-simulator'
        }).onConflictDoNothing();
      }
    }
  }

  async getLatestSnapshot(symbol: string): Promise<any> {
    const instrumentId = this.instrumentIds.get(symbol);
    if (!instrumentId) return null;

    const snapshot = await db.select()
      .from(realtimeDataSnapshots)
      .where(eq(realtimeDataSnapshots.instrumentId, instrumentId))
      .limit(1);

    return snapshot[0] || null;
  }
}

export const dataPersistenceService = new DataPersistenceService();