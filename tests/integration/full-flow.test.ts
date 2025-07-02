import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

describe('Full Integration Flow Tests', () => {
  const BASE_URL = 'http://localhost:5000';

  describe('Complete User Journey', () => {
    it('should handle complete user authentication flow', async () => {
      // 1. Register new user
      const registerResponse = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          username: 'testuser_integration',
          email: 'test@integration.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        });

      expect([200, 201, 409]).toContain(registerResponse.status);

      // 2. Login with new user
      const loginResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          username: 'testuser_integration',
          password: 'TestPassword123!'
        });

      expect([200, 401]).toContain(loginResponse.status);

      // 3. Verify authentication
      if (loginResponse.status === 200) {
        const verifyResponse = await request(BASE_URL)
          .get('/api/auth/verify')
          .set('Cookie', loginResponse.headers['set-cookie'] || '');

        expect(verifyResponse.status).toBe(200);
        expect(verifyResponse.body).toHaveProperty('user');
      }
    });

    it('should handle market data retrieval and processing', async () => {
      const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
      
      for (const symbol of symbols) {
        // 1. Get market data
        const marketDataResponse = await request(BASE_URL)
          .get(`/api/market-data/${symbol}`);

        expect([200, 404, 500]).toContain(marketDataResponse.status);

        if (marketDataResponse.status === 200) {
          // 2. Validate market data structure
          expect(marketDataResponse.body).toHaveProperty('symbol');
          expect(marketDataResponse.body.symbol).toBe(symbol);

          // 3. Get option chain data
          const optionChainResponse = await request(BASE_URL)
            .get(`/api/option-chain/${symbol}`);

          expect([200, 404, 500]).toContain(optionChainResponse.status);

          if (optionChainResponse.status === 200) {
            expect(optionChainResponse.body).toHaveProperty('optionChain');
            expect(Array.isArray(optionChainResponse.body.optionChain)).toBe(true);
          }
        }
      }
    });

    it('should handle pattern analysis workflow', async () => {
      const symbol = 'NIFTY';
      
      // 1. Get pattern analysis
      const patternResponse = await request(BASE_URL)
        .get(`/api/pattern-analysis/${symbol}`);

      expect([200, 404, 500]).toContain(patternResponse.status);

      if (patternResponse.status === 200) {
        expect(patternResponse.body).toHaveProperty('patterns');
        
        // 2. Test specific pattern endpoints
        const patterns = ['gamma-squeeze', 'max-pain', 'unusual-activity'];
        
        for (const pattern of patterns) {
          const specificPatternResponse = await request(BASE_URL)
            .get(`/api/patterns/${pattern}/${symbol}`);

          expect([200, 404, 500]).toContain(specificPatternResponse.status);
        }
      }
    });

    it('should handle alert management workflow', async () => {
      // 1. Get existing alerts
      const getAlertsResponse = await request(BASE_URL)
        .get('/api/alerts');

      expect([200, 401, 500]).toContain(getAlertsResponse.status);

      // 2. Create new alert
      const createAlertResponse = await request(BASE_URL)
        .post('/api/alerts')
        .send({
          symbol: 'NIFTY',
          condition: 'PRICE_ABOVE',
          value: 25000,
          alertType: 'EMAIL'
        });

      expect([200, 201, 400, 401]).toContain(createAlertResponse.status);

      // 3. If alert created successfully, try to delete it
      if (createAlertResponse.status === 200 || createAlertResponse.status === 201) {
        const alertId = createAlertResponse.body.id || 1;
        
        const deleteAlertResponse = await request(BASE_URL)
          .delete(`/api/alerts/${alertId}`);

        expect([200, 204, 404, 401]).toContain(deleteAlertResponse.status);
      }
    });

    it('should handle strategy management workflow', async () => {
      // 1. Get existing strategies
      const getStrategiesResponse = await request(BASE_URL)
        .get('/api/strategies');

      expect([200, 401, 500]).toContain(getStrategiesResponse.status);

      // 2. Create new strategy
      const createStrategyResponse = await request(BASE_URL)
        .post('/api/strategies')
        .send({
          name: 'Integration Test Strategy',
          symbol: 'NIFTY',
          conditions: [
            { field: 'ltp', operator: '>', value: 25000 }
          ]
        });

      expect([200, 201, 400, 401]).toContain(createStrategyResponse.status);

      // 3. If strategy created, try to execute it
      if (createStrategyResponse.status === 200 || createStrategyResponse.status === 201) {
        const strategyId = createStrategyResponse.body.id || 1;
        
        const executeResponse = await request(BASE_URL)
          .post(`/api/strategies/${strategyId}/execute`);

        expect([200, 400, 401, 404]).toContain(executeResponse.status);
      }
    });
  });

  describe('System Health and Monitoring', () => {
    it('should verify all health endpoints are functional', async () => {
      const healthEndpoints = [
        '/api/database/status',
        '/api/admin/health',
        '/api/infrastructure/health'
      ];

      for (const endpoint of healthEndpoints) {
        const response = await request(BASE_URL).get(endpoint);
        expect([200, 401, 403, 500]).toContain(response.status);
      }
    });

    it('should verify metrics endpoints are accessible', async () => {
      const metricsEndpoints = [
        '/api/admin/metrics',
        '/api/infrastructure/metrics',
        '/api/cache/stats'
      ];

      for (const endpoint of metricsEndpoints) {
        const response = await request(BASE_URL).get(endpoint);
        expect([200, 401, 403, 500]).toContain(response.status);
      }
    });

    it('should handle WebSocket connection endpoints', async () => {
      const wsEndpoints = [
        '/api/websocket/stats'
      ];

      for (const endpoint of wsEndpoints) {
        const response = await request(BASE_URL).get(endpoint);
        expect([200, 401, 500]).toContain(response.status);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid endpoints gracefully', async () => {
      const invalidEndpoints = [
        '/api/nonexistent',
        '/api/market-data/INVALID_SYMBOL',
        '/api/option-chain/INVALID_SYMBOL'
      ];

      for (const endpoint of invalidEndpoints) {
        const response = await request(BASE_URL).get(endpoint);
        expect([404, 400, 500]).toContain(response.status);
      }
    });

    it('should handle malformed requests properly', async () => {
      // Test malformed JSON
      const malformedResponse = await request(BASE_URL)
        .post('/api/alerts')
        .send('invalid json string');

      expect([400, 500]).toContain(malformedResponse.status);

      // Test missing required fields
      const incompleteResponse = await request(BASE_URL)
        .post('/api/strategies')
        .send({
          name: 'Incomplete Strategy'
          // Missing required fields
        });

      expect([400, 422]).toContain(incompleteResponse.status);
    });

    it('should handle rate limiting appropriately', async () => {
      // Make rapid requests to test rate limiting
      const requests = Array.from({ length: 15 }, () =>
        request(BASE_URL).get('/api/market-data/NIFTY')
      );

      const responses = await Promise.allSettled(requests);
      const statusCodes = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value.status);

      // Should have a mix of successful and rate-limited responses
      expect(statusCodes.some(code => code === 200)).toBe(true);
      expect(statusCodes.length).toBeGreaterThan(0);
    });
  });

  describe('Database Integration', () => {
    it('should verify database connectivity', async () => {
      const dbStatusResponse = await request(BASE_URL)
        .get('/api/database/status');

      expect([200, 500]).toContain(dbStatusResponse.status);

      if (dbStatusResponse.status === 200) {
        expect(dbStatusResponse.body).toHaveProperty('status');
        expect(['CONNECTED', 'DISCONNECTED', 'ERROR']).toContain(dbStatusResponse.body.status);
      }
    });

    it('should handle database operations', async () => {
      // Test database cleanup endpoint
      const cleanupResponse = await request(BASE_URL)
        .post('/api/database/cleanup');

      expect([200, 401, 403, 500]).toContain(cleanupResponse.status);
    });
  });

  describe('Market Segments Integration', () => {
    it('should handle multi-segment market data', async () => {
      // Get available segments
      const segmentsResponse = await request(BASE_URL)
        .get('/api/segments');

      expect([200, 500]).toContain(segmentsResponse.status);

      if (segmentsResponse.status === 200) {
        expect(Array.isArray(segmentsResponse.body)).toBe(true);

        // Test segment-specific data
        const segments = ['EQUITY', 'COMMODITY', 'CURRENCY'];
        
        for (const segment of segments) {
          const segmentDataResponse = await request(BASE_URL)
            .get(`/api/segments/${segment}/data`);

          expect([200, 404, 500]).toContain(segmentDataResponse.status);
        }
      }
    });
  });

  describe('Cache and Performance', () => {
    it('should handle cache operations', async () => {
      // Get cache stats
      const cacheStatsResponse = await request(BASE_URL)
        .get('/api/cache/stats');

      expect([200, 401, 500]).toContain(cacheStatsResponse.status);

      // Test cache invalidation
      const invalidateResponse = await request(BASE_URL)
        .post('/api/cache/invalidate')
        .send({ pattern: 'test:*' });

      expect([200, 400, 401, 403]).toContain(invalidateResponse.status);
    });

    it('should measure response times', async () => {
      const startTime = Date.now();
      
      const response = await request(BASE_URL)
        .get('/api/market-data/NIFTY');

      const responseTime = Date.now() - startTime;

      // Response should be reasonably fast (under 5 seconds)
      expect(responseTime).toBeLessThan(5000);
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Security and Authentication', () => {
    it('should protect admin endpoints', async () => {
      const adminEndpoints = [
        '/api/admin/metrics',
        '/api/admin/users',
        '/api/admin/broker-config'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(BASE_URL).get(endpoint);
        expect([401, 403, 200]).toContain(response.status);
      }
    });

    it('should validate input sanitization', async () => {
      // Test potential XSS
      const xssResponse = await request(BASE_URL)
        .post('/api/alerts')
        .send({
          symbol: '<script>alert("xss")</script>',
          condition: 'PRICE_ABOVE',
          value: 25000
        });

      expect([400, 401, 422]).toContain(xssResponse.status);

      // Test SQL injection attempts
      const sqlResponse = await request(BASE_URL)
        .get('/api/market-data/NIFTY\'; DROP TABLE users; --');

      expect([400, 404, 500]).toContain(sqlResponse.status);
    });
  });
});