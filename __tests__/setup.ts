import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Set environment to test
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_options_db';
  
  // Suppress console output during tests unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(async () => {
  // Cleanup after all tests
  if (!process.env.VERBOSE_TESTS) {
    jest.restoreAllMocks();
  }
});

beforeEach(() => {
  // Reset any mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  jest.clearAllTimers();
});

// Global test utilities
global.testUtils = {
  createMockOptionChain: (symbol: string, strikes: number[] = [24000, 24100, 24200]) => ({
    symbol,
    expiry: '2025-01-30',
    strikes: strikes.map(strike => ({
      strike,
      callOI: Math.floor(Math.random() * 100000),
      callOIChange: Math.floor(Math.random() * 10000) - 5000,
      callLTP: strike * 0.01 + Math.random() * 50,
      callVolume: Math.floor(Math.random() * 50000),
      putOI: Math.floor(Math.random() * 100000),
      putOIChange: Math.floor(Math.random() * 10000) - 5000,
      putLTP: strike * 0.01 + Math.random() * 50,
      putVolume: Math.floor(Math.random() * 50000)
    }))
  }),

  createMockMarketData: (symbol: string) => ({
    symbol,
    ltp: 24500 + Math.random() * 1000,
    change: Math.random() * 200 - 100,
    changePercent: Math.random() * 4 - 2,
    volume: Math.floor(Math.random() * 1000000),
    openInterest: Math.floor(Math.random() * 500000),
    lastUpdated: new Date()
  }),

  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidOptionChain(): R;
      toBeValidMarketData(): R;
    }
  }
}

expect.extend({
  toBeValidOptionChain(received) {
    const pass = received && 
                 typeof received.symbol === 'string' &&
                 Array.isArray(received.strikes) &&
                 received.strikes.length > 0;
    
    return {
      message: () => `expected ${received} to be a valid option chain`,
      pass
    };
  },

  toBeValidMarketData(received) {
    const pass = received &&
                 typeof received.symbol === 'string' &&
                 typeof received.ltp === 'number' &&
                 typeof received.change === 'number';
    
    return {
      message: () => `expected ${received} to be valid market data`,
      pass
    };
  }
});