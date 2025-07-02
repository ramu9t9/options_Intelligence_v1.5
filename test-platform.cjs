#!/usr/bin/env node

/**
 * Options Intelligence Platform - Comprehensive Testing Script
 * Tests all major platform features and API endpoints
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:5000';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Simple HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test helper function
async function runTest(name, testFn) {
  try {
    console.log(`🧪 Testing: ${name}...`);
    await testFn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASS' });
    console.log(`✅ ${name} - PASSED`);
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ ${name} - FAILED: ${error.message}`);
  }
  console.log('');
}

// Individual test functions
async function testHealthCheck() {
  const response = await makeRequest(`${BASE_URL}/api/health`);
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}`);
  }
  
  const data = JSON.parse(response.data);
  if (data.status !== 'ok') {
    throw new Error(`Health check failed: ${data.status}`);
  }
}

async function testInstrumentsAPI() {
  const response = await makeRequest(`${BASE_URL}/api/instruments`);
  if (response.statusCode !== 200) {
    throw new Error(`Expected 200, got ${response.statusCode}`);
  }
  
  const instruments = JSON.parse(response.data);
  if (!Array.isArray(instruments) || instruments.length === 0) {
    throw new Error('No instruments returned');
  }
  
  const expectedSymbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
  const actualSymbols = instruments.map(i => i.symbol);
  
  for (const symbol of expectedSymbols) {
    if (!actualSymbols.includes(symbol)) {
      throw new Error(`Missing instrument: ${symbol}`);
    }
  }
}

async function testOptionChainAPI() {
  const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
  
  for (const symbol of symbols) {
    const response = await makeRequest(`${BASE_URL}/api/option-chain/${symbol}`);
    if (response.statusCode !== 200) {
      throw new Error(`${symbol} option chain failed: ${response.statusCode}`);
    }
    
    const data = JSON.parse(response.data);
    if (data.symbol !== symbol) {
      throw new Error(`Symbol mismatch: expected ${symbol}, got ${data.symbol}`);
    }
    
    if (!data.optionChain || !Array.isArray(data.optionChain)) {
      throw new Error(`${symbol} missing option chain data`);
    }
    
    if (data.optionChain.length === 0) {
      throw new Error(`${symbol} option chain is empty`);
    }
  }
}

async function testMarketDataAPI() {
  const response = await makeRequest(`${BASE_URL}/api/market-data`);
  // Note: This might return HTML if it's a protected route, which is expected
  if (response.statusCode !== 200 && response.statusCode !== 302) {
    throw new Error(`Unexpected status code: ${response.statusCode}`);
  }
}

async function testStaticAssets() {
  // Test if main CSS and JS files are served
  const cssResponse = await makeRequest(`${BASE_URL}/assets/index-CaL8YtUj.css`);
  if (cssResponse.statusCode !== 200) {
    throw new Error(`CSS asset not found: ${cssResponse.statusCode}`);
  }
  
  const jsResponse = await makeRequest(`${BASE_URL}/assets/index-Dupz5gu2.js`);
  if (jsResponse.statusCode !== 200) {
    throw new Error(`JS asset not found: ${jsResponse.statusCode}`);
  }
}

async function testFrontendLoad() {
  const response = await makeRequest(`${BASE_URL}/`);
  if (response.statusCode !== 200) {
    throw new Error(`Frontend failed to load: ${response.statusCode}`);
  }
  
  if (!response.data.includes('<div id="root">')) {
    throw new Error('Frontend HTML structure is invalid');
  }
}

// Main testing function
async function runAllTests() {
  console.log('🚀 Options Intelligence Platform - Comprehensive Testing');
  console.log('=' * 60);
  console.log('');

  // Core API Tests
  await runTest('Health Check API', testHealthCheck);
  await runTest('Instruments API', testInstrumentsAPI);
  await runTest('Option Chain API (All Symbols)', testOptionChainAPI);
  await runTest('Market Data API', testMarketDataAPI);
  
  // Frontend Tests
  await runTest('Frontend Loading', testFrontendLoad);
  await runTest('Static Assets (CSS/JS)', testStaticAssets);

  // Results Summary
  console.log('📊 Test Results Summary:');
  console.log('=' * 40);
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  console.log('');

  // Detailed Results
  if (testResults.failed > 0) {
    console.log('❌ Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    console.log('');
  }

  console.log('✅ Passed Tests:');
  testResults.tests
    .filter(t => t.status === 'PASS')
    .forEach(t => console.log(`   - ${t.name}`));

  console.log('');
  console.log('🎉 Testing Complete!');
  
  if (testResults.failed === 0) {
    console.log('🎊 All tests passed! Your platform is working perfectly.');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error during testing:', error);
  process.exit(1);
});
