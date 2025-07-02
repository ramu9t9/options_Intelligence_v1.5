import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import { registerRoutes } from '../server/routes';

let app: express.Application;
let server: any;

beforeAll(async () => {
  app = express();
  server = await registerRoutes(app);
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

describe('Option Chain API', () => {
  describe('GET /api/option-chain/:symbol', () => {
    test('should return option chain data for valid symbol', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('symbol', 'NIFTY');
      expect(response.body.data).toHaveProperty('optionChain');
      expect(Array.isArray(response.body.data.optionChain)).toBe(true);

      if (response.body.data.optionChain.length > 0) {
        const optionData = response.body.data.optionChain[0];
        expect(optionData).toHaveProperty('strike');
        expect(optionData).toHaveProperty('callOI');
        expect(optionData).toHaveProperty('putOI');
        expect(optionData).toHaveProperty('callLTP');
        expect(optionData).toHaveProperty('putLTP');
        expect(typeof optionData.strike).toBe('number');
        expect(typeof optionData.callOI).toBe('number');
        expect(typeof optionData.putOI).toBe('number');
      }
    });

    test('should return 404 for invalid symbol', async () => {
      const response = await request(app)
        .get('/api/option-chain/INVALID')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should handle expiry parameter', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY?expiry=2025-01-30')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('expiry');
    });

    test('should validate strike range parameter', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY?strikeRange=10')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      if (response.body.data.optionChain.length > 0) {
        expect(response.body.data.optionChain.length).toBeLessThanOrEqual(21); // 10 strikes above and below ATM + ATM
      }
    });

    test('should return market data with option chain', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY')
        .expect(200);

      expect(response.body.data).toHaveProperty('ltp');
      expect(response.body.data).toHaveProperty('change');
      expect(response.body.data).toHaveProperty('changePercent');
      expect(typeof response.body.data.ltp).toBe('number');
      expect(typeof response.body.data.change).toBe('number');
      expect(typeof response.body.data.changePercent).toBe('number');
    });
  });

  describe('GET /api/option-chain/:symbol/strikes', () => {
    test('should return available strikes for symbol', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY/strikes')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('strikes');
      expect(Array.isArray(response.body.strikes)).toBe(true);
      
      if (response.body.strikes.length > 0) {
        expect(typeof response.body.strikes[0]).toBe('number');
      }
    });

    test('should handle expiry filter for strikes', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY/strikes?expiry=2025-01-30')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('expiry', '2025-01-30');
    });
  });

  describe('Option Chain Data Validation', () => {
    test('should have consistent data structure across all strikes', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY')
        .expect(200);

      const optionChain = response.body.data.optionChain;
      
      if (optionChain.length > 1) {
        const firstStrike = optionChain[0];
        const requiredFields = ['strike', 'callOI', 'putOI', 'callLTP', 'putLTP', 'callVolume', 'putVolume'];
        
        optionChain.forEach((strike: any, index: number) => {
          requiredFields.forEach(field => {
            expect(strike).toHaveProperty(field);
            expect(typeof strike[field]).toBe('number');
          });
        });
      }
    });

    test('should have strikes in ascending order', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY')
        .expect(200);

      const optionChain = response.body.data.optionChain;
      
      if (optionChain.length > 1) {
        for (let i = 1; i < optionChain.length; i++) {
          expect(optionChain[i].strike).toBeGreaterThan(optionChain[i-1].strike);
        }
      }
    });

    test('should have non-negative OI and volume values', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY')
        .expect(200);

      const optionChain = response.body.data.optionChain;
      
      optionChain.forEach((strike: any) => {
        expect(strike.callOI).toBeGreaterThanOrEqual(0);
        expect(strike.putOI).toBeGreaterThanOrEqual(0);
        expect(strike.callVolume).toBeGreaterThanOrEqual(0);
        expect(strike.putVolume).toBeGreaterThanOrEqual(0);
      });
    });

    test('should have positive LTP values for ITM options', async () => {
      const response = await request(app)
        .get('/api/option-chain/NIFTY')
        .expect(200);

      const { ltp, optionChain } = response.body.data;
      
      // Find ITM calls (strike < current price) and ITM puts (strike > current price)
      const itmCalls = optionChain.filter((strike: any) => strike.strike < ltp);
      const itmPuts = optionChain.filter((strike: any) => strike.strike > ltp);
      
      itmCalls.forEach((strike: any) => {
        expect(strike.callLTP).toBeGreaterThan(0);
      });
      
      itmPuts.forEach((strike: any) => {
        expect(strike.putLTP).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Caching', () => {
    test('should respond within acceptable time limit', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/option-chain/NIFTY')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        request(app).get('/api/option-chain/NIFTY')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      // Test with malformed parameters
      const response = await request(app)
        .get('/api/option-chain/NIFTY?strikeRange=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should return proper error for unsupported symbols', async () => {
      const response = await request(app)
        .get('/api/option-chain/UNSUPPORTED_SYMBOL')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('not found');
    });
  });
});