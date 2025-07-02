/**
 * Environment Configuration Helper
 * Provides type-safe environment variable access with fallback logic
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment-specific configuration
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = `.env.${nodeEnv}`;

// Load the environment-specific file first, then the default .env
config({ path: path.resolve(process.cwd(), envFile) });
config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvironmentConfig {
  // Environment
  NODE_ENV: string;
  
  // Database
  DATABASE_URL: string;
  PGHOST: string;
  PGPORT: number;
  PGUSER: string;
  PGPASSWORD: string;
  PGDATABASE: string;
  
  // Redis
  REDIS_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  
  // Angel One API
  ANGEL_ONE_API_URL: string;
  ANGEL_ONE_API_KEY: string;
  ANGEL_ONE_API_SECRET: string;
  ANGEL_ONE_CLIENT_ID: string;
  ANGEL_ONE_PIN: string;
  ANGEL_ONE_TOTP_SECRET: string;
  
  // Authentication & Security
  JWT_SECRET: string;
  SESSION_SECRET: string;
  BCRYPT_SALT_ROUNDS: number;
  
  // External Services
  OPENAI_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  
  // Server Configuration
  PORT: number;
  HOST: string;
  CORS_ORIGIN: string;
  
  // Logging
  LOG_LEVEL: string;
  LOG_FILE: string;
  
  // Feature Flags
  ENABLE_LIVE_DATA: boolean;
  ENABLE_REDIS: boolean;
  ENABLE_BACKGROUND_JOBS: boolean;
  ENABLE_ANALYTICS: boolean;
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // WebSocket
  WS_HEARTBEAT_INTERVAL: number;
  WS_MAX_CONNECTIONS: number;
  
  // Monitoring
  ENABLE_PROMETHEUS: boolean;
  PROMETHEUS_PORT: number;
  HEALTH_CHECK_INTERVAL: number;
  
  // SSL
  SSL_CERT_PATH?: string;
  SSL_KEY_PATH?: string;
  
  // Backup
  BACKUP_ENABLED?: boolean;
  BACKUP_SCHEDULE?: string;
  BACKUP_RETENTION_DAYS?: number;
  
  // Security
  SECURITY_HEADERS_ENABLED?: boolean;
  CSRF_PROTECTION_ENABLED?: boolean;
}

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get environment variable as number with fallback
 */
function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

/**
 * Get environment variable as boolean with fallback
 */
function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value.toLowerCase() === 'true';
}

/**
 * Validate that required secrets are available
 */
function validateRequiredSecrets(): void {
  const requiredSecrets = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];
  
  const missingSecrets = requiredSecrets.filter(secret => !process.env[secret]);
  
  if (missingSecrets.length > 0) {
    console.warn(`⚠️ Missing required secrets: ${missingSecrets.join(', ')}`);
    console.warn('⚠️ Some features may not work properly without these secrets');
  }
}

/**
 * Environment configuration object
 */
export const env: EnvironmentConfig = {
  // Environment
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  
  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  PGHOST: getEnvVar('PGHOST', 'localhost'),
  PGPORT: getEnvNumber('PGPORT', 5432),
  PGUSER: getEnvVar('PGUSER'),
  PGPASSWORD: getEnvVar('PGPASSWORD'),
  PGDATABASE: getEnvVar('PGDATABASE'),
  
  // Redis
  REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  REDIS_HOST: getEnvVar('REDIS_HOST', 'localhost'),
  REDIS_PORT: getEnvNumber('REDIS_PORT', 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  
  // Angel One API
  ANGEL_ONE_API_URL: getEnvVar('ANGEL_ONE_API_URL', 'https://apiconnect.angelone.in'),
  ANGEL_ONE_API_KEY: getEnvVar('ANGEL_ONE_API_KEY', ''),
  ANGEL_ONE_API_SECRET: getEnvVar('ANGEL_ONE_API_SECRET', ''),
  ANGEL_ONE_CLIENT_ID: getEnvVar('ANGEL_ONE_CLIENT_ID', ''),
  ANGEL_ONE_PIN: getEnvVar('ANGEL_ONE_PIN', ''),
  ANGEL_ONE_TOTP_SECRET: getEnvVar('ANGEL_ONE_TOTP_SECRET', ''),
  
  // Authentication & Security
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  SESSION_SECRET: getEnvVar('SESSION_SECRET'),
  BCRYPT_SALT_ROUNDS: getEnvNumber('BCRYPT_SALT_ROUNDS', 12),
  
  // External Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
  
  // Server Configuration
  PORT: getEnvNumber('PORT', 5000),
  HOST: getEnvVar('HOST', '0.0.0.0'),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:5000'),
  
  // Logging
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
  LOG_FILE: getEnvVar('LOG_FILE', 'logs/app.log'),
  
  // Feature Flags
  ENABLE_LIVE_DATA: getEnvBoolean('ENABLE_LIVE_DATA', false),
  ENABLE_REDIS: getEnvBoolean('ENABLE_REDIS', true),
  ENABLE_BACKGROUND_JOBS: getEnvBoolean('ENABLE_BACKGROUND_JOBS', true),
  ENABLE_ANALYTICS: getEnvBoolean('ENABLE_ANALYTICS', true),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  
  // WebSocket
  WS_HEARTBEAT_INTERVAL: getEnvNumber('WS_HEARTBEAT_INTERVAL', 30000),
  WS_MAX_CONNECTIONS: getEnvNumber('WS_MAX_CONNECTIONS', 1000),
  
  // Monitoring
  ENABLE_PROMETHEUS: getEnvBoolean('ENABLE_PROMETHEUS', false),
  PROMETHEUS_PORT: getEnvNumber('PROMETHEUS_PORT', 9090),
  HEALTH_CHECK_INTERVAL: getEnvNumber('HEALTH_CHECK_INTERVAL', 30000),
  
  // SSL
  SSL_CERT_PATH: process.env.SSL_CERT_PATH,
  SSL_KEY_PATH: process.env.SSL_KEY_PATH,
  
  // Backup
  BACKUP_ENABLED: getEnvBoolean('BACKUP_ENABLED', false),
  BACKUP_SCHEDULE: process.env.BACKUP_SCHEDULE,
  BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS ? getEnvNumber('BACKUP_RETENTION_DAYS') : undefined,
  
  // Security
  SECURITY_HEADERS_ENABLED: getEnvBoolean('SECURITY_HEADERS_ENABLED', true),
  CSRF_PROTECTION_ENABLED: getEnvBoolean('CSRF_PROTECTION_ENABLED', true),
};

/**
 * Validate environment configuration
 */
export function validateEnvironment(): void {
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🗄️ Database: ${env.PGDATABASE} at ${env.PGHOST}:${env.PGPORT}`);
  console.log(`🔥 Redis: ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  console.log(`🔑 Live Data: ${env.ENABLE_LIVE_DATA ? 'Enabled' : 'Disabled'}`);
  console.log(`📊 Analytics: ${env.ENABLE_ANALYTICS ? 'Enabled' : 'Disabled'}`);
  
  // Validate required secrets
  validateRequiredSecrets();
  
  // Environment-specific validations
  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    if (env.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters in production');
    }
    if (!env.SSL_CERT_PATH || !env.SSL_KEY_PATH) {
      console.warn('⚠️ SSL certificates not configured for production');
    }
  }
  
  console.log('✅ Environment configuration validated');
}

export default env;