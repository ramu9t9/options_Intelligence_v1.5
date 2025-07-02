# Commodity Segments Integration - System Design Document

## Executive Summary

This document outlines the comprehensive system design for integrating commodity segments (Crude Oil, Natural Gas, Gold, Silver) into the Options Intelligence Platform. The design ensures scalable, real-time data processing with proper market hour handling and segment-specific analytics.

## Current State Analysis

### Existing Infrastructure
- ✅ Equity segments fully operational (NIFTY, BANKNIFTY, FINNIFTY)
- ✅ Real-time data feed architecture with Angel One API
- ✅ Pattern detection engine with 8 algorithms
- ✅ Centralized data broadcaster with WebSocket distribution
- ✅ PostgreSQL database with comprehensive schema

### Gaps for Commodity Integration
- ❌ Commodity instruments not in data collection pipeline
- ❌ Different market hours not handled (09:00-23:30 vs 09:15-15:30)
- ❌ Commodity-specific strike intervals not configured
- ❌ Database schema missing commodity instrument records
- ❌ Frontend UI not displaying commodity segments

## System Design Architecture

### 1. Data Collection Layer Enhancement

#### Multi-Segment Data Coordinator
```typescript
interface SegmentConfiguration {
  type: 'EQUITY' | 'COMMODITY' | 'CURRENCY';
  instruments: string[];
  marketHours: { open: string; close: string; timezone: string };
  dataInterval: number; // seconds
  strikeInterval: number; // for options
  maxStrikes: number;
}

class MultiSegmentDataManager {
  private segmentConfigs: Map<string, SegmentConfiguration>;
  private activeCollectors: Map<string, NodeJS.Timeout>;
  
  async initializeSegments(): Promise<void>
  async startSegmentCollection(segment: string): Promise<void>
  async stopSegmentCollection(segment: string): Promise<void>
  private isMarketOpen(segment: string): boolean
}
```

#### Enhanced Angel One Provider
```typescript
class EnhancedAngelOneProvider {
  async getCommodityQuote(symbol: string): Promise<CommodityQuote>
  async getCommodityOptionChain(symbol: string, expiry: string): Promise<CommodityOptionChain>
  private getCommodityToken(symbol: string): Promise<string>
  private formatCommodityData(rawData: any): CommodityQuote
}
```

### 2. Database Schema Enhancements

#### New Tables Required
```sql
-- Commodity-specific instrument tracking
CREATE TABLE commodity_instruments (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  segment VARCHAR(20) NOT NULL DEFAULT 'COMMODITY',
  contract_size INTEGER DEFAULT 1,
  tick_size DECIMAL(10,2) DEFAULT 0.01,
  lot_size INTEGER DEFAULT 1,
  margin_percentage DECIMAL(5,2) DEFAULT 10.00,
  market_open_time TIME DEFAULT '09:00:00',
  market_close_time TIME DEFAULT '23:30:00',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Commodity-specific option data
CREATE TABLE commodity_option_data (
  id SERIAL PRIMARY KEY,
  instrument_id INTEGER REFERENCES commodity_instruments(id),
  strike_price DECIMAL(10,2) NOT NULL,
  expiry_date DATE NOT NULL,
  option_type VARCHAR(4) NOT NULL CHECK (option_type IN ('CALL', 'PUT')),
  open_interest INTEGER DEFAULT 0,
  oi_change INTEGER DEFAULT 0,
  last_traded_price DECIMAL(10,2) DEFAULT 0,
  price_change DECIMAL(10,2) DEFAULT 0,
  volume INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW(),
  UNIQUE(instrument_id, strike_price, expiry_date, option_type)
);

-- Commodity market sessions
CREATE TABLE commodity_market_sessions (
  id SERIAL PRIMARY KEY,
  segment VARCHAR(20) NOT NULL,
  session_date DATE NOT NULL,
  market_open TIMESTAMP NOT NULL,
  market_close TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Real-time Data Pipeline Architecture

#### Segment-aware Data Flow
```
Angel One API
     ↓
Multi-Segment Data Collector
     ↓
┌─────────────┬─────────────┬─────────────┐
│   EQUITY    │  COMMODITY  │  CURRENCY   │
│ (09:15-15:30)│ (09:00-23:30)│ (09:00-17:00)│
└─────────────┴─────────────┴─────────────┘
     ↓
Central Data Broadcaster
     ↓
WebSocket Distribution
     ↓
Frontend Segment Selector
```

#### Enhanced Central Data Broadcaster
```typescript
class EnhancedCentralDataBroadcaster {
  private segmentData: Map<string, SegmentMarketData>;
  private segmentTimers: Map<string, NodeJS.Timeout>;
  
  async initializeSegments(): Promise<void>
  private async collectSegmentData(segment: string): Promise<void>
  private async processEquityData(): Promise<void>
  private async processCommodityData(): Promise<void>
  private broadcastSegmentUpdate(segment: string, data: any): void
}
```

### 4. Frontend Architecture Enhancements

#### Market Segment Selector Component
```typescript
interface SegmentSelectorProps {
  activeSegments: string[];
  onSegmentChange: (segments: string[]) => void;
  marketStatus: Record<string, boolean>;
}

const MarketSegmentSelector: React.FC<SegmentSelectorProps>
```

#### Enhanced Option Chain Component
```typescript
interface EnhancedOptionChainProps {
  segment: 'EQUITY' | 'COMMODITY' | 'CURRENCY';
  instruments: string[];
  strikeConfiguration: {
    interval: number;
    range: number;
  };
}

const EnhancedOptionChain: React.FC<EnhancedOptionChainProps>
```

### 5. Pattern Detection Engine Enhancement

#### Commodity-specific Patterns
```typescript
interface CommodityPatternConfig {
  segment: 'COMMODITY';
  patterns: {
    ENERGY_VOLATILITY_SPIKE: boolean;
    PRECIOUS_METALS_CORRELATION: boolean;
    COMMODITY_SECTOR_ROTATION: boolean;
    FUTURES_OPTIONS_ARBITRAGE: boolean;
  };
  thresholds: {
    volatilitySpike: number;
    correlationStrength: number;
    volumeAnomaly: number;
  };
}

class CommodityPatternDetector {
  async detectEnergyVolatilitySpike(data: CommodityData[]): Promise<PatternResult>
  async detectMetalsCorrelation(goldData: any[], silverData: any[]): Promise<PatternResult>
  async detectSectorRotation(commodityData: Map<string, any[]>): Promise<PatternResult>
}
```

## Implementation Plan

### Phase 1: Database Schema & Backend Infrastructure (Days 1-2)
1. Create commodity instrument tables
2. Seed initial commodity instrument data
3. Enhance Angel One provider for commodity data
4. Update central data broadcaster for multi-segment support

### Phase 2: Real-time Data Collection (Days 3-4)
1. Implement multi-segment data manager
2. Configure commodity market hours handling
3. Add commodity option chain collection
4. Test data flow for all segments

### Phase 3: Frontend Integration (Days 5-6)
1. Create market segment selector component
2. Enhance option chain display for commodities
3. Add commodity-specific market status indicators
4. Implement segment-aware routing

### Phase 4: Pattern Detection & Analytics (Days 7-8)
1. Implement commodity-specific pattern detection
2. Add cross-segment correlation analysis
3. Create commodity market insights dashboard
4. Add commodity-specific alerts

### Phase 5: Testing & Optimization (Days 9-10)
1. End-to-end testing with live commodity data
2. Performance optimization for extended market hours
3. Load testing with multiple segments
4. Documentation and deployment

## Technical Specifications

### Data Collection Intervals
- **Equity Segments**: 3-second intervals (09:15-15:30 IST)
- **Commodity Segments**: 5-second intervals (09:00-23:30 IST)
- **Currency Segments**: 10-second intervals (09:00-17:00 IST)

### Strike Price Configurations
- **Crude Oil**: ₹50 intervals (₹6000-₹7000 range)
- **Natural Gas**: ₹10 intervals (₹200-₹300 range)
- **Gold**: ₹100 intervals (₹60000-₹65000 range)
- **Silver**: ₹500 intervals (₹70000-₹75000 range)

### Performance Requirements
- **Data Latency**: <2 seconds for all segments
- **WebSocket Throughput**: 1000+ concurrent connections
- **Database Performance**: <100ms query response time
- **Memory Usage**: <512MB per segment

## Risk Mitigation

### Data Source Reliability
- Primary: Angel One API for all segments
- Fallback: Mock data generation during API outages
- Monitoring: Real-time API health checks

### Market Hours Complexity
- Automated market session detection
- Graceful handling of market closures
- Historical data replay for closed markets

### Performance Considerations
- Lazy loading for inactive segments
- Database connection pooling
- Redis caching for frequently accessed data

## Success Metrics

### Technical KPIs
- 99.9% uptime for commodity data collection
- <2 second data latency across all segments
- Zero data loss during market transitions
- <1% API failure rate

### Business KPIs
- 50% increase in user engagement with commodity features
- 25% improvement in pattern detection accuracy
- 30% growth in subscription conversions
- 90% user satisfaction score

## Conclusion

This comprehensive system design ensures seamless integration of commodity segments while maintaining the platform's performance, reliability, and user experience standards. The phased implementation approach minimizes risks and allows for iterative improvements based on user feedback and market conditions.