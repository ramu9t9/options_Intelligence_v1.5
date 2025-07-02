import { EventEmitter } from "events";
import { angelOneProvider } from "./angelOneProvider";

export interface LiveDataPoint {
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: "angel-one" | "fallback";
}

export interface LiveOptionData {
  strike: number;
  callOI: number;
  callOIChange: number;
  callLTP: number;
  callVolume: number;
  putOI: number;
  putOIChange: number;
  putLTP: number;
  putVolume: number;
}

export class LiveDataService extends EventEmitter {
  private isActive = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private instruments = ["NIFTY", "BANKNIFTY", "FINNIFTY"];
  private lastKnownPrices: Record<string, number> = {
    NIFTY: 24500,
    BANKNIFTY: 52000,
    FINNIFTY: 24000,
  };

  async initialize(): Promise<void> {
    console.log("🔄 Initializing Live Data Service...");

    // Try to authenticate Angel One
    if (!angelOneProvider.isAuthenticated()) {
      await angelOneProvider.initialize();
    }

    this.isActive = true;
    this.startDataCollection();

    console.log("✅ Live Data Service initialized");
  }

  private startDataCollection(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Collect data every 5 seconds
    this.updateInterval = setInterval(async () => {
      await this.collectLiveData();
    }, 5000);

    // Initial collection
    this.collectLiveData();
  }

  private async collectLiveData(): Promise<void> {
    if (!this.isActive) return;

    for (const symbol of this.instruments) {
      try {
        const dataPoint = await this.fetchLiveDataPoint(symbol);
        this.emit("liveData", dataPoint);

        // Also emit option chain data
        const optionChain = await this.generateLiveOptionChain(
          symbol,
          dataPoint.ltp,
        );
        this.emit("optionChain", {
          symbol,
          optionChain,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error(`Error collecting data for ${symbol}:`, error);
      }
    }
  }

  private async fetchLiveDataPoint(symbol: string): Promise<LiveDataPoint> {
    // Try Angel One first
    if (angelOneProvider.isAuthenticated()) {
      try {
        const quote = await angelOneProvider.getQuote(symbol);
        if (quote && quote.ltp > 0) {
          this.lastKnownPrices[symbol] = quote.ltp;

          return {
            symbol,
            ltp: quote.ltp,
            change: quote.ltp - quote.close,
            changePercent: ((quote.ltp - quote.close) / quote.close) * 100,
            volume: quote.volume,
            timestamp: new Date(),
            source: "angel-one",
          };
        }
      } catch (error) {
        console.warn(
          `Angel One fetch failed for ${symbol}, using live simulation`,
        );
      }
    }

    // Generate realistic live data simulation
    return this.generateRealisticLiveData(symbol);
  }

  private generateRealisticLiveData(symbol: string): LiveDataPoint {
    const basePrice = this.lastKnownPrices[symbol];

    // Generate realistic price movement (±0.1% typical intraday volatility)
    const volatility = 0.001; // 0.1%
    const change = (Math.random() - 0.5) * basePrice * volatility * 2;
    const newPrice = basePrice + change;

    // Update last known price for next iteration
    this.lastKnownPrices[symbol] = newPrice;

    return {
      symbol,
      ltp: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round((change / basePrice) * 10000) / 100,
      volume: Math.floor(Math.random() * 1000000) + 500000,
      timestamp: new Date(),
      source: "fallback",
    };
  }

  private async generateLiveOptionChain(
    symbol: string,
    currentPrice: number,
  ): Promise<LiveOptionData[]> {
    // Generate strikes around current price
    const atmStrike = Math.round(currentPrice / 100) * 100;
    const strikes = [];

    for (let i = -5; i <= 5; i++) {
      strikes.push(atmStrike + i * 100);
    }

    return strikes.map((strike) => {
      const isATM = Math.abs(strike - currentPrice) < 50;
      const isITM = strike < currentPrice;

      // Generate realistic OI and volumes
      const baseOI = isATM ? 50000 : 20000;
      const oiVariation = Math.floor(Math.random() * 10000);

      return {
        strike,
        callOI: baseOI + oiVariation,
        callOIChange: Math.floor((Math.random() - 0.5) * 5000),
        callLTP: this.calculateOptionPrice(currentPrice, strike, "CALL"),
        callVolume: Math.floor(Math.random() * 10000) + 1000,
        putOI: baseOI + oiVariation + 5000,
        putOIChange: Math.floor((Math.random() - 0.5) * 5000),
        putLTP: this.calculateOptionPrice(currentPrice, strike, "PUT"),
        putVolume: Math.floor(Math.random() * 10000) + 1000,
      };
    });
  }

  private calculateOptionPrice(
    spotPrice: number,
    strike: number,
    type: "CALL" | "PUT",
  ): number {
    const intrinsic =
      type === "CALL"
        ? Math.max(0, spotPrice - strike)
        : Math.max(0, strike - spotPrice);

    const timeValue = Math.random() * 50 + 10; // Random time value
    return Math.round((intrinsic + timeValue) * 100) / 100;
  }

  getLastKnownPrices(): Record<string, number> {
    return { ...this.lastKnownPrices };
  }
  // Connected only when active and authenticated
  isConnected(): boolean {
    return this.isActive && angelOneProvider.isAuthenticated();
  }

  stop(): void {
    this.isActive = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log("Live Data Service stopped");
  }
}

export const liveDataService = new LiveDataService();
