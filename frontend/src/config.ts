/**
 * Application Configuration
 * 
 * This file contains centralized configuration settings for the Options Intelligence Platform.
 * It includes API endpoints, WebSocket configuration, and default settings.
 */

// API Configuration
export const API_CONFIG = {
  // Base URL for API requests - uses Vite proxy in development
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  
  // WebSocket URL - uses Vite proxy in development
  socketUrl: import.meta.env.VITE_SOCKET_URL || '/',
  
  // API endpoints
  endpoints: {
    health: '/health',
    stats: '/stats',
    instruments: '/instruments',
    optionChain: '/option-chain',
    signals: '/signals',
    centralizedStatus: '/centralized/status',
    centralizedSetup: '/centralized/setup'
  },
  
  // Default request headers
  headers: {
    'Content-Type': 'application/json'
  }
};

// Data Provider Configuration
export const PROVIDER_CONFIG = {
  // Default update interval in milliseconds
  updateInterval: 5000,
  
  // Maximum retry attempts for provider connections
  maxRetryAttempts: 3,
  
  // Cache timeout in milliseconds
  cacheTimeout: 30000,
  
  // Default Angel One credentials (pre-configured)
  angelOne: {
    apiKey: 'P9ErUZG0',
    clientId: 'R117172',
    clientSecret: '7fcb7f2a-fd0a-4d12-a010-16d37fbdbd6e'
  },
  
  // Provider priority order
  providerPriority: ['angel', 'nse', 'yahoo', 'mock']
};

// Pattern Detection Configuration
export const PATTERN_CONFIG = {
  // Thresholds for pattern detection
  thresholds: {
    oiChangeThreshold: 5000,
    premiumChangeThreshold: 5,
    volumeThreshold: 10000,
    confidenceHigh: 0.8,
    confidenceMedium: 0.6,
    confidenceLow: 0.4,
    volatilitySpikeThreshold: 2.0,
    unusualVolumeMultiplier: 3.0,
    gammaSqueezeThreshold: 0.7,
    maxPainDeviationThreshold: 2.0
  },
  
  // Maximum patterns to display
  maxPatternsToShow: 15,
  
  // Pattern refresh interval in milliseconds
  refreshInterval: 5000
};

// UI Configuration
export const UI_CONFIG = {
  // Theme settings
  theme: {
    defaultTheme: 'light',
    storageKey: 'options-intelligence-theme'
  },
  
  // Table settings
  table: {
    pageSize: 20,
    maxHeight: '600px'
  },
  
  // Chart settings
  chart: {
    colors: {
      callOI: 'rgb(34, 197, 94)',
      putOI: 'rgb(239, 68, 68)',
      price: 'rgb(59, 130, 246)'
    },
    timeFormats: {
      minute: 'HH:mm',
      hour: 'HH:mm',
      day: 'dd MMM'
    }
  },
  
  // Date formatting
  dateFormat: 'dd MMM yyyy HH:mm:ss'
};

// System Configuration
export const SYSTEM_CONFIG = {
  // Maximum concurrent users
  maxConcurrentUsers: 10000,
  
  // Database connection pool size
  dbPoolSize: 10,
  
  // WebSocket ping interval in milliseconds
  wsPingInterval: 30000,
  
  // Default market types
  marketTypes: ['EQUITY', 'COMMODITY'],
  
  // Default instruments
  defaultInstruments: ['NIFTY', 'BANKNIFTY']
};

// Export default configuration
export default {
  api: API_CONFIG,
  provider: PROVIDER_CONFIG,
  pattern: PATTERN_CONFIG,
  ui: UI_CONFIG,
  system: SYSTEM_CONFIG
};