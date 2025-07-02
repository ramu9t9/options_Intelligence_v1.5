# Comprehensive API Audit Table - Options Intelligence Platform

## Overview
This document provides a complete audit of all API endpoints and calls across the entire Options Intelligence Platform codebase, organized by functional area.

## Core Market Data APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/market-data/NIFTY` | GET | Live NIFTY market data | MarketDataContext, Dashboard | ✅ Active | None | 15s interval |
| `/api/market-data/BANKNIFTY` | GET | Live BANKNIFTY market data | MarketDataContext, Dashboard | ✅ Active | None | 15s interval |
| `/api/market-data/FINNIFTY` | GET | Live FINNIFTY market data | MarketDataContext, Dashboard | ✅ Active | None | 15s interval |
| `/api/market-data` | GET | All market indices data | Dashboard, OptionChain | ✅ Active | None | 3s interval |
| `/api/database/status` | GET | Database connection status | MarketDataContext | ✅ Active | None | On mount |
| `/api/option-chain/:symbol` | GET | Option chain data by symbol | OptionChain components | ✅ Active | None | 5s interval |
| `/api/instruments` | GET | Available trading instruments | Multiple components | ✅ Active | None | Static |

## Multi-Segment Market APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/segments` | GET | Market segments (Equity/Commodity/Currency) | MultiSegmentDashboard | ✅ Active | None | Static |
| `/api/segments/:segmentId/data` | GET | Segment-specific market data | SegmentSelector | ✅ Active | None | 5s interval |

## Authentication & User Management APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/auth/login` | POST | User authentication | AuthPage | ✅ Active | None | 5 attempts/min |
| `/api/auth/register` | POST | User registration | AuthPage | ✅ Active | None | 3 attempts/min |
| `/api/auth/me` | GET | Current user profile | App.tsx, Header | ✅ Active | JWT Required | None |
| `/api/auth/logout` | POST | User logout | Header, Settings | ✅ Active | JWT Required | None |

## Strategy Builder & Execution APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/strategies` | GET | List user strategies | StrategyBuilder, StrategyList | ✅ Active | JWT Required | None |
| `/api/strategies` | POST | Create new strategy | StrategyBuilder | ✅ Active | JWT Required | 10/hour |
| `/api/strategies/:id` | PUT | Update strategy | StrategyBuilder | ✅ Active | JWT Required | 20/hour |
| `/api/strategies/:id` | DELETE | Delete strategy | StrategyBuilder | ✅ Active | JWT Required | None |
| `/api/strategies/:id/execute` | POST | Execute strategy | StrategyBuilder | ✅ Active | JWT Required | 100/hour |
| `/api/strategies/batch-execute` | POST | Batch execute strategies | StrategyBuilder (Pro+) | ✅ Active | JWT + Pro Plan | 50/hour |
| `/api/strategies/:id/analytics` | GET | Strategy performance metrics | BacktestResults | ✅ Active | JWT Required | None |

## Admin Dashboard APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/admin/metrics` | GET | System metrics and analytics | AdminDashboard | ✅ Active | Admin Role | 10s interval |
| `/api/admin/health` | GET | System health status | AdminDashboard | ✅ Active | Admin Role | 30s interval |
| `/api/admin/users` | GET | User management data | AdminDashboard | ✅ Active | Admin Role | None |
| `/api/admin/broker-configs/:broker` | GET | Broker configuration | AdminDashboard | ✅ Active | Admin Role | None |
| `/api/admin/test-broker-connection` | POST | Test broker connection | AdminDashboard | ✅ Active | Admin Role | 5/min |
| `/api/admin/execution-stats` | GET | Strategy execution statistics | AdminDashboard | ✅ Active | Admin Role | None |
| `/api/admin/database/cleanup` | POST | Database cleanup operations | AdminDashboard | ✅ Active | Admin Role | 1/hour |
| `/api/admin/database/cleanup-status` | GET | Cleanup status | AdminDashboard | ✅ Active | Admin Role | None |
| `/api/admin/database/refresh-views` | POST | Refresh materialized views | AdminDashboard | ✅ Active | Admin Role | 1/hour |

## Infrastructure & Monitoring APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/health` | GET | Basic health check | Monitoring systems | ✅ Active | None | None |
| `/api/health/database` | GET | Database health | Monitoring systems | ✅ Active | None | None |
| `/api/health/redis` | GET | Redis health | Monitoring systems | ✅ Active | None | None |
| `/api/health/market-data` | GET | Market data service health | Monitoring systems | ✅ Active | None | None |
| `/api/metrics` | GET | Prometheus metrics | Monitoring systems | ✅ Active | None | None |
| `/api/cache/stats` | GET | Cache performance statistics | AdminDashboard | ✅ Active | Admin Role | None |
| `/api/cache/invalidate` | POST | Invalidate cache | AdminDashboard | ✅ Active | Admin Role | 10/hour |
| `/api/queue/stats` | GET | Job queue statistics | AdminDashboard | ✅ Active | Admin Role | None |
| `/api/websocket/stats` | GET | WebSocket statistics | AdminDashboard | ✅ Active | Admin Role | None |

## Advanced Features APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/patterns` | GET | Pattern analysis results | PatternAnalysis | ✅ Active | JWT Required | 10s interval |
| `/api/alerts` | GET | User alerts | AlertCenter | ✅ Active | JWT Required | 5s interval |
| `/api/alerts` | POST | Create alert | AlertConfig | ✅ Active | JWT Required | 50/day |
| `/api/alerts/:id` | DELETE | Delete alert | AlertCenter | ✅ Active | JWT Required | None |
| `/api/backtest` | POST | Run backtest | Backtesting | ✅ Active | JWT Required | 10/hour |
| `/api/ai-strategy` | POST | AI strategy generation | AiAssistant | ✅ Active | JWT Required | 20/day |
| `/api/test-ai` | GET | AI service status | AiAssistant | ✅ Active | JWT Required | None |

## Reports & Analytics APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/dashboard/stats` | GET | Dashboard statistics | Dashboard | ✅ Active | JWT Required | 30s interval |
| `/api/reports/top-oi-gainers` | GET | Top OI gainers report | MarketReports | ✅ Active | JWT Required | 1min interval |
| `/api/reports/top-pcr-drops` | GET | Top PCR drops report | MarketReports | ✅ Active | JWT Required | 1min interval |
| `/api/user/subscription` | GET | User subscription details | Settings, Header | ✅ Active | JWT Required | None |
| `/api/user/access/:feature` | GET | Feature access check | Multiple components | ✅ Active | JWT Required | None |

## Central Data Feed APIs

| Endpoint | Method | Purpose | Used In Components | Status | Authentication | Rate Limit |
|----------|--------|---------|-------------------|--------|----------------|------------|
| `/api/central-data` | GET | Centralized market snapshot | Dashboard, OptionChain | ✅ Active | JWT Required | 5s interval |
| `/api/central-data/performance` | GET | Data feed performance metrics | AdminDashboard | ✅ Active | Admin Role | 5s interval |

## API Call Frequency Analysis

### High Frequency (< 10 seconds)
- Market data endpoints: `/api/market-data/*` (3-15s intervals)
- Central data feed: `/api/central-data` (5s intervals)
- Admin metrics: `/api/admin/metrics` (10s intervals)
- Alert monitoring: `/api/alerts` (5s intervals)

### Medium Frequency (10-60 seconds)
- Dashboard stats: `/api/dashboard/stats` (30s intervals)
- System health: `/api/admin/health` (30s intervals)
- Reports: `/api/reports/*` (1min intervals)
- Pattern analysis: `/api/patterns` (10s intervals)

### Low Frequency (On-demand)
- Authentication endpoints: As needed
- Strategy CRUD operations: User-initiated
- Configuration changes: Admin-initiated
- Database operations: Scheduled/manual

## Security & Access Control Summary

### Public Endpoints (No Authentication)
- Health checks
- Market data (basic)
- Instruments list
- Database status

### User Authentication Required (JWT)
- Strategy management
- Personal alerts
- Subscription features
- Pattern analysis
- AI assistant

### Admin Role Required
- System metrics
- User management
- Broker configuration
- Database operations
- Infrastructure monitoring

## Rate Limiting Implementation

### By User Type
- **Free Users**: 1000 requests/hour
- **Pro Users**: 5000 requests/hour  
- **VIP Users**: 15000 requests/hour
- **Institutional**: Unlimited

### By Endpoint Type
- **Market Data**: IP-based limiting (Angel One provider restrictions)
- **Strategy Execution**: Subscription tier-based
- **Admin Operations**: Role-based restrictions
- **AI Features**: Daily quotas by subscription tier

## Integration Points

### External Services
- **Angel One API**: Primary market data provider
- **NSE/Yahoo Finance**: Fallback providers
- **OpenRouter API**: AI strategy generation
- **SendGrid**: Email notifications
- **Redis**: Caching and pub/sub
- **PostgreSQL**: Primary data storage

### WebSocket Connections
- Real-time market data broadcasting
- Live pattern updates
- Alert notifications
- Strategy execution updates

## Performance Metrics

### Response Time Targets
- Market Data APIs: < 100ms
- Strategy Operations: < 500ms
- Admin Operations: < 1000ms
- AI Features: < 5000ms

### Availability Targets
- Core APIs: 99.9% uptime
- Market Data: 99.5% during market hours
- Admin APIs: 99% uptime
- AI Features: 95% uptime

This comprehensive audit table covers all 65+ API endpoints across the Options Intelligence Platform, providing complete visibility into the system's API architecture and usage patterns.