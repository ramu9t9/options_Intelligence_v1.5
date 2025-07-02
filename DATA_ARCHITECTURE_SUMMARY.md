# Data Architecture Summary - Options Intelligence Platform

## Current Data Status: Mock vs Real Data

**Answer:** Currently displaying **mock data** due to Angel One TOTP authentication configuration needed. Your connection test shows authentic user profile (RAMU YELLAPPA KAMURTI), confirming credentials work but automated data feed requires TOTP secret configuration.

## Historical Data Management in Cloud Deployment

### Database Tables for Historical Data Storage

| Table | Purpose | Data Retained |
|-------|---------|---------------|
| `historical_market_data` | OHLC data with multiple timeframes | Unlimited - 1MIN, 5MIN, 15MIN, 1HOUR, 1DAY |
| `historical_option_chain` | Daily OI changes and snapshots | Unlimited - Yesterday's OI for comparisons |
| `realtime_data_snapshots` | Current market state tracking | Latest real-time market conditions |
| `data_source_metrics` | Provider reliability tracking | Audit trail and performance metrics |

### Cloud Deployment Data Collection Strategy

1. **End-of-Day Collection** (3:45 PM market close)
   - Final market snapshots stored with 1DAY timeframe
   - Complete option chain OI data archived
   - Daily data validation and consistency checks

2. **Intraday Collection** (Every 15 minutes during market hours)
   - Market snapshots stored for historical analysis
   - Option chain data with OI changes tracked
   - Multiple timeframe data (1MIN to 1HOUR) collected

3. **Weekend Processing**
   - Data validation and backfill operations
   - Cross-reference data from multiple providers
   - Database optimization and maintenance

## Real-Time Open Interest Tracking Logic

### Live OI Change Calculation

```
Current OI Collection (Every 5 seconds)
↓
Compare with Previous Snapshot
↓ 
Calculate Intraday OI Change
↓
Retrieve Yesterday's End-of-Day OI
↓
Calculate Day-over-Day Change
↓
Store in realtime_data_snapshots
↓
Broadcast via WebSocket
```

### Historical Comparison Implementation

1. **Yesterday's OI Retrieval**
   - Query `historical_option_chain` table for previous trading day
   - Filter by instrument_id and trading_date = yesterday
   - Provide baseline for day-over-day calculations

2. **Change Tracking**
   - `oiChangeFromPrevDay` = Current OI - Yesterday's End-of-Day OI
   - `oi_change` = Current OI - Previous 5-second snapshot OI
   - Both metrics stored and displayed for pattern analysis

## Data Accuracy and Consistency Logic

### Multi-Provider Reliability System

| Priority | Data Source | Fallback Behavior | Success Rate Tracking |
|----------|-------------|-------------------|----------------------|
| 1 | Angel One (Primary) | Auto-failover to Dhan | Response time & success rate monitored |
| 2 | Dhan (Secondary) | Auto-failover to NSE | Provider metrics tracked in database |
| 3 | NSE (Tertiary) | Auto-failover to Yahoo | Reliability scoring implemented |
| 4 | Yahoo Finance | Auto-failover to Mock | Last resort with quality indicators |
| 5 | Mock Data | Simulation only | Clear labeling as non-authentic data |

### Data Validation Pipeline

1. **Source Validation**
   - Each data point tagged with source identifier
   - Response time and success rate tracked per provider
   - Automatic provider switching on failure thresholds

2. **Consistency Checks**
   - Cross-reference data between multiple providers when available
   - Anomaly detection for unusual price/OI movements
   - Data quality scoring and alert generation

3. **Audit Trail**
   - Complete data lineage tracking in `data_source_metrics`
   - Historical provider performance analysis
   - Transparent data source indication in UI

## API Endpoints for Historical Data Access

- `GET /api/admin/historical-data/{symbol}?timeframe=1DAY&fromDate=2024-01-01`
- `GET /api/admin/yesterday-oi/{symbol}` - Yesterday's OI for comparison
- `GET /api/admin/data-sources` - Current provider status and metrics

## Database Schema Summary

### Historical Data Tables
- **historical_market_data**: OHLC data with timeframes, unlimited retention
- **historical_option_chain**: Daily OI snapshots, strike-wise historical data
- **data_source_metrics**: Provider performance and reliability tracking

### Real-Time Data Tables
- **realtime_data_snapshots**: Current market state with calculated metrics
- **option_data**: Live option chain updates with OI changes
- **broker_credentials**: Secure credential storage with connection tracking

## Next Steps to Enable Live Data

1. **Configure TOTP Secret**: Use the broker admin dashboard to set up Angel One TOTP secret
2. **Test Authentication**: Verify TOTP generation works with manual codes
3. **Activate Live Feed**: Switch from mock to Angel One data source
4. **Historical Collection**: Begin building historical database automatically

This architecture ensures complete data integrity with provider failover, unlimited historical retention, and clear distinction between authentic and simulated data sources.