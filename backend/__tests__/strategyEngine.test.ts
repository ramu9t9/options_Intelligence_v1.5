import { describe, test, expect, beforeEach } from '@jest/globals';
import { PatternDetector } from '../server/patternDetector';
import { aiInsightsEngine, type TradingInsight } from '../server/aiInsightsEngine';

describe('Strategy Engine - Pattern Detection', () => {
  let patternDetector: PatternDetector;
  let mockOptionChain: any;

  beforeEach(() => {
    patternDetector = new PatternDetector();
    mockOptionChain = global.testUtils.createMockOptionChain('NIFTY', [24000, 24100, 24200, 24300, 24400]);
  });

  describe('Call Long Buildup Detection', () => {
    test('should detect call long buildup pattern', async () => {
      // Create option chain with increasing call OI and volume
      const optionChain = mockOptionChain.strikes.map((strike: any, index: number) => ({
        ...strike,
        callOI: 50000 + (index * 10000), // Increasing OI
        callOIChange: 5000 + (index * 1000), // Positive OI change
        callVolume: 10000 + (index * 2000), // High volume
        callLTP: 200 - (index * 30) // Decreasing premium as strikes increase
      }));

      const patterns = await patternDetector.detectPatterns('NIFTY', optionChain, 24200);
      const callBuildupPattern = patterns.find(p => p.type === 'CALL_LONG_BUILDUP');

      expect(callBuildupPattern).toBeDefined();
      expect(callBuildupPattern?.confidence).toBeGreaterThan(0.6);
      expect(callBuildupPattern?.signal).toBe('BULLISH');
    });

    test('should not detect call buildup with insufficient OI increase', async () => {
      const optionChain = mockOptionChain.strikes.map((strike: any) => ({
        ...strike,
        callOIChange: Math.random() * 1000 - 500, // Random small changes
        callVolume: Math.random() * 5000
      }));

      const patterns = await patternDetector.detectPatterns('NIFTY', optionChain, 24200);
      const callBuildupPattern = patterns.find(p => p.type === 'CALL_LONG_BUILDUP');

      expect(callBuildupPattern?.confidence || 0).toBeLessThan(0.5);
    });
  });

  describe('Put Long Buildup Detection', () => {
    test('should detect put long buildup pattern', async () => {
      const optionChain = mockOptionChain.strikes.map((strike: any, index: number) => ({
        ...strike,
        putOI: 60000 - (index * 8000), // Higher OI at lower strikes
        putOIChange: 6000 - (index * 800), // Positive OI change for lower strikes
        putVolume: 12000 - (index * 1500),
        putLTP: (index * 25) + 150 // Increasing premium as strikes decrease
      }));

      const patterns = await patternDetector.detectPatterns('NIFTY', optionChain, 24200);
      const putBuildupPattern = patterns.find(p => p.type === 'PUT_LONG_BUILDUP');

      expect(putBuildupPattern).toBeDefined();
      expect(putBuildupPattern?.confidence).toBeGreaterThan(0.6);
      expect(putBuildupPattern?.signal).toBe('BEARISH');
    });
  });

  describe('Short Covering Detection', () => {
    test('should detect call short covering', async () => {
      const optionChain = mockOptionChain.strikes.map((strike: any, index: number) => ({
        ...strike,
        callOI: 80000 - (index * 5000), // Decreasing OI
        callOIChange: -(3000 + (index * 500)), // Negative OI change
        callVolume: 15000 + (index * 1000), // High volume despite OI decrease
        callLTP: 180 + (index * 20) // Rising premiums
      }));

      const patterns = await patternDetector.detectPatterns('NIFTY', optionChain, 24200);
      const shortCoveringPattern = patterns.find(p => p.type === 'CALL_SHORT_COVERING');

      expect(shortCoveringPattern).toBeDefined();
      expect(shortCoveringPattern?.confidence).toBeGreaterThan(0.5);
      expect(shortCoveringPattern?.signal).toBe('BULLISH');
    });

    test('should detect put short covering', async () => {
      const optionChain = mockOptionChain.strikes.map((strike: any, index: number) => ({
        ...strike,
        putOI: 70000 + (index * 3000), // Higher OI at higher strikes
        putOIChange: -(2000 + (index * 300)), // Negative OI change
        putVolume: 14000 - (index * 800),
        putLTP: 300 - (index * 35) // Falling premiums
      }));

      const patterns = await patternDetector.detectPatterns('NIFTY', optionChain, 24200);
      const putShortCoveringPattern = patterns.find(p => p.type === 'PUT_SHORT_COVERING');

      expect(putShortCoveringPattern).toBeDefined();
      expect(putShortCoveringPattern?.confidence).toBeGreaterThan(0.5);
      expect(putShortCoveringPattern?.signal).toBe('BEARISH');
    });
  });

  describe('Max Pain Calculation', () => {
    test('should calculate max pain correctly', async () => {
      const optionChain = [
        { strike: 24000, callOI: 50000, putOI: 20000, callLTP: 250, putLTP: 50 },
        { strike: 24100, callOI: 60000, putOI: 40000, callLTP: 180, putLTP: 80 },
        { strike: 24200, callOI: 80000, putOI: 80000, callLTP: 120, putLTP: 120 },
        { strike: 24300, callOI: 40000, putOI: 60000, callLTP: 80, putLTP: 180 },
        { strike: 24400, callOI: 20000, putOI: 50000, callLTP: 50, putLTP: 250 }
      ];

      const patterns = await patternDetector.detectPatterns('NIFTY', optionChain, 24200);
      const maxPainPattern = patterns.find(p => p.type === 'MAX_PAIN');

      expect(maxPainPattern).toBeDefined();
      expect(maxPainPattern?.metadata).toHaveProperty('maxPainStrike');
      expect(typeof maxPainPattern?.metadata.maxPainStrike).toBe('number');
      expect(maxPainPattern?.metadata.maxPainStrike).toBeGreaterThanOrEqual(24000);
      expect(maxPainPattern?.metadata.maxPainStrike).toBeLessThanOrEqual(24400);
    });
  });

  describe('Gamma Squeeze Detection', () => {
    test('should detect gamma squeeze conditions', async () => {
      const optionChain = mockOptionChain.strikes.map((strike: any, index: number) => ({
        ...strike,
        callOI: index === 2 ? 150000 : 30000, // Heavy OI concentration at ATM
        callVolume: index === 2 ? 50000 : 8000, // High volume at ATM
        putOI: index === 2 ? 120000 : 25000,
        putVolume: index === 2 ? 40000 : 6000,
        callLTP: index === 2 ? 180 : (180 - Math.abs(index - 2) * 40),
        putLTP: index === 2 ? 180 : (180 - Math.abs(index - 2) * 40)
      }));

      const patterns = await patternDetector.detectPatterns('NIFTY', optionChain, 24200);
      const gammaSqueezePattern = patterns.find(p => p.type === 'GAMMA_SQUEEZE');

      expect(gammaSqueezePattern).toBeDefined();
      expect(gammaSqueezePattern?.confidence).toBeGreaterThan(0.7);
      expect(gammaSqueezePattern?.metadata).toHaveProperty('gammaStrike');
    });
  });

  describe('Unusual Activity Detection', () => {
    test('should detect unusual volume spikes', async () => {
      const optionChain = mockOptionChain.strikes.map((strike: any, index: number) => ({
        ...strike,
        callVolume: index === 1 ? 80000 : 10000, // Unusual spike at one strike
        putVolume: index === 3 ? 75000 : 8000, // Unusual spike at another strike
        callOI: 50000,
        putOI: 45000
      }));

      const patterns = await patternDetector.detectPatterns('NIFTY', optionChain, 24200);
      const unusualActivityPattern = patterns.find(p => p.type === 'UNUSUAL_ACTIVITY');

      expect(unusualActivityPattern).toBeDefined();
      expect(unusualActivityPattern?.confidence).toBeGreaterThan(0.6);
      expect(unusualActivityPattern?.metadata).toHaveProperty('unusualStrikes');
      expect(Array.isArray(unusualActivityPattern?.metadata.unusualStrikes)).toBe(true);
    });
  });
});

describe('Strategy Engine - AI Insights', () => {
  beforeEach(() => {
    // Reset AI insights engine state
    aiInsightsEngine.stop();
  });

  describe('Trading Insights Generation', () => {
    test('should generate trading insights from market data', async () => {
      await aiInsightsEngine.initialize();
      
      // Allow some time for initial analysis
      await global.testUtils.waitFor(1000);
      
      const insights = aiInsightsEngine.getInsights('NIFTY');
      
      expect(Array.isArray(insights)).toBe(true);
      
      if (insights.length > 0) {
        const insight = insights[0];
        expect(insight).toHaveProperty('id');
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('underlying');
        expect(insight).toHaveProperty('confidence');
        expect(insight).toHaveProperty('recommendation');
        
        expect(['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILITY', 'ARBITRAGE']).toContain(insight.type);
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      }
    });

    test('should generate market sentiment analysis', async () => {
      await aiInsightsEngine.initialize();
      await global.testUtils.waitFor(1000);
      
      const sentiment = aiInsightsEngine.getMarketSentiment();
      
      if (sentiment) {
        expect(sentiment).toHaveProperty('overall');
        expect(sentiment).toHaveProperty('putCallRatio');
        expect(sentiment).toHaveProperty('volatilityIndex');
        expect(sentiment).toHaveProperty('marketRegime');
        
        expect(sentiment.overall).toBeGreaterThanOrEqual(-1);
        expect(sentiment.overall).toBeLessThanOrEqual(1);
        expect(['TRENDING', 'RANGING', 'VOLATILE', 'CALM']).toContain(sentiment.marketRegime);
      }
    });

    test('should generate AI recommendations', async () => {
      await aiInsightsEngine.initialize();
      await global.testUtils.waitFor(1500);
      
      const recommendations = aiInsightsEngine.getRecommendations('NIFTY');
      
      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        const recommendation = recommendations[0];
        expect(recommendation).toHaveProperty('id');
        expect(recommendation).toHaveProperty('strategy');
        expect(recommendation).toHaveProperty('action');
        expect(recommendation).toHaveProperty('confidence');
        expect(recommendation).toHaveProperty('riskReward');
        expect(recommendation).toHaveProperty('execution');
        
        expect(['ENTRY', 'EXIT', 'ADJUST', 'MONITOR']).toContain(recommendation.action);
        expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
        expect(recommendation.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Analytics and Metrics', () => {
    test('should provide AI analytics', async () => {
      await aiInsightsEngine.initialize();
      await global.testUtils.waitFor(1000);
      
      const analytics = aiInsightsEngine.getAIAnalytics();
      
      expect(analytics).toHaveProperty('totalInsights');
      expect(analytics).toHaveProperty('totalRecommendations');
      expect(analytics).toHaveProperty('averageConfidence');
      expect(analytics).toHaveProperty('patternDistribution');
      
      expect(typeof analytics.totalInsights).toBe('number');
      expect(typeof analytics.totalRecommendations).toBe('number');
      expect(analytics.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(analytics.averageConfidence).toBeLessThanOrEqual(1);
    });
  });
});

describe('Strategy Engine - Integration Tests', () => {
  test('should integrate pattern detection with AI insights', async () => {
    const patternDetector = new PatternDetector();
    const mockOptionChain = global.testUtils.createMockOptionChain('NIFTY');
    
    // Generate patterns
    const patterns = await patternDetector.detectPatterns('NIFTY', mockOptionChain.strikes, 24200);
    
    // Initialize AI engine
    await aiInsightsEngine.initialize();
    await global.testUtils.waitFor(1000);
    
    // Get AI insights
    const insights = aiInsightsEngine.getInsights('NIFTY');
    
    // Verify integration
    expect(patterns.length).toBeGreaterThan(0);
    expect(insights.length).toBeGreaterThan(0);
    
    // Check if patterns influence insights
    const bullishPatterns = patterns.filter(p => p.signal === 'BULLISH');
    const bearishPatterns = patterns.filter(p => p.signal === 'BEARISH');
    
    if (bullishPatterns.length > bearishPatterns.length) {
      const bullishInsights = insights.filter(i => i.type === 'BULLISH');
      expect(bullishInsights.length).toBeGreaterThan(0);
    }
  });

  test('should handle multiple symbols simultaneously', async () => {
    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    const patternDetector = new PatternDetector();
    
    const allPatterns = await Promise.all(
      symbols.map(async symbol => {
        const mockOptionChain = global.testUtils.createMockOptionChain(symbol);
        return patternDetector.detectPatterns(symbol, mockOptionChain.strikes, 24200);
      })
    );
    
    expect(allPatterns).toHaveLength(3);
    allPatterns.forEach(patterns => {
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  test('should maintain performance under load', async () => {
    const patternDetector = new PatternDetector();
    const iterations = 10;
    const promises = [];
    
    for (let i = 0; i < iterations; i++) {
      const mockOptionChain = global.testUtils.createMockOptionChain('NIFTY');
      promises.push(
        patternDetector.detectPatterns('NIFTY', mockOptionChain.strikes, 24200)
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    expect(results).toHaveLength(iterations);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    results.forEach(patterns => {
      expect(Array.isArray(patterns)).toBe(true);
    });
  });
});