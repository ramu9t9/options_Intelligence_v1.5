-- ================================================================================
-- PostgreSQL Schema Optimization for Options Trading Platform
-- Production-Ready Enhancements for Real-Time Data Processing
-- ================================================================================

-- 🔧 STEP 1: Add Composite Indexes for High-Performance Real-Time Queries
-- ================================================================================

-- Critical indexes for real-time data access patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_symbol_timestamp 
ON realtime_data_snapshots(symbol, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_latest_data 
ON realtime_data_snapshots(symbol, timestamp DESC) 
WHERE timestamp >= NOW() - INTERVAL '1 hour';

-- Optimize intraday option OI queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oi_symbol_expiry_timestamp 
ON intraday_option_oi(symbol, expiry, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oi_strike_timestamp 
ON intraday_option_oi(symbol, strike, timestamp DESC);

-- Composite index for complex OI queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oi_symbol_strike_expiry 
ON intraday_option_oi(symbol, strike, expiry, timestamp DESC);

-- Strategy performance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_strategy_results_user_time 
ON strategy_results(user_id, timestamp DESC);

-- Alert execution performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_user_active 
ON user_alerts(user_id, instrument_id) 
WHERE priority IN ('HIGH', 'CRITICAL');

-- System health monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_logs_component_time 
ON system_health_logs(component, timestamp DESC);

-- ================================================================================
-- 🧊 STEP 2: Implement Table Partitioning for Scalable Real-Time Data
-- ================================================================================

-- First, create the new partitioned structure for real-time data
CREATE TABLE realtime_data_snapshots_new (
  id UUID DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  ltp DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2),
  change_percent DECIMAL(5,2),
  volume INTEGER,
  data_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for the next 6 months
CREATE TABLE realtime_data_snapshots_202412 PARTITION OF realtime_data_snapshots_new
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE realtime_data_snapshots_202501 PARTITION OF realtime_data_snapshots_new
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE realtime_data_snapshots_202502 PARTITION OF realtime_data_snapshots_new
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE realtime_data_snapshots_202503 PARTITION OF realtime_data_snapshots_new
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE realtime_data_snapshots_202504 PARTITION OF realtime_data_snapshots_new
FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE realtime_data_snapshots_202505 PARTITION OF realtime_data_snapshots_new
FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE realtime_data_snapshots_202506 PARTITION OF realtime_data_snapshots_new
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Partition intraday_option_oi similarly
CREATE TABLE intraday_option_oi_new (
  id UUID DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  expiry DATE NOT NULL,
  strike DECIMAL(10,2) NOT NULL,
  option_type TEXT CHECK (option_type IN ('CE', 'PE')) NOT NULL,
  oi_current INTEGER NOT NULL,
  oi_change INTEGER DEFAULT 0,
  volume INTEGER DEFAULT 0,
  ltp DECIMAL(10,2),
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for intraday OI data
CREATE TABLE intraday_option_oi_202412 PARTITION OF intraday_option_oi_new
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE intraday_option_oi_202501 PARTITION OF intraday_option_oi_new
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE intraday_option_oi_202502 PARTITION OF intraday_option_oi_new
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE intraday_option_oi_202503 PARTITION OF intraday_option_oi_new
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE intraday_option_oi_202504 PARTITION OF intraday_option_oi_new
FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE intraday_option_oi_202505 PARTITION OF intraday_option_oi_new
FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE intraday_option_oi_202506 PARTITION OF intraday_option_oi_new
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- Add indexes to partitioned tables
CREATE INDEX idx_realtime_new_symbol_ts ON realtime_data_snapshots_new(symbol, timestamp DESC);
CREATE INDEX idx_oi_new_symbol_expiry_ts ON intraday_option_oi_new(symbol, expiry, timestamp DESC);

-- Function to automatically create future partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYYMM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date);
    
    -- Add indexes to new partition
    EXECUTE format('CREATE INDEX %I ON %I(symbol, timestamp DESC)',
        'idx_' || partition_name || '_symbol_ts', partition_name);
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- 📊 STEP 3: Create Minute-Level Historical Data for Comprehensive Backtesting
-- ================================================================================

CREATE TABLE historical_minute_data (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open_price DECIMAL(10,2) NOT NULL,
    high_price DECIMAL(10,2) NOT NULL,
    low_price DECIMAL(10,2) NOT NULL,
    close_price DECIMAL(10,2) NOT NULL,
    volume INTEGER DEFAULT 0,
    vwap DECIMAL(10,2), -- Volume Weighted Average Price
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(symbol, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for historical minute data (quarterly partitions for efficiency)
CREATE TABLE historical_minute_data_2024q4 PARTITION OF historical_minute_data
FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

CREATE TABLE historical_minute_data_2025q1 PARTITION OF historical_minute_data
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE historical_minute_data_2025q2 PARTITION OF historical_minute_data
FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Indexes for backtesting queries
CREATE INDEX idx_historical_minute_symbol_time ON historical_minute_data(symbol, timestamp DESC);
CREATE INDEX idx_historical_minute_time_range ON historical_minute_data(timestamp) 
WHERE timestamp >= NOW() - INTERVAL '30 days';

-- Enhanced historical option chain with minute-level granularity
CREATE TABLE historical_option_chain_detailed (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    expiry_date DATE NOT NULL,
    strike_price DECIMAL(10,2) NOT NULL,
    underlying_price DECIMAL(10,2),
    
    -- Call option detailed data
    ce_ltp DECIMAL(10,2),
    ce_bid DECIMAL(10,2),
    ce_ask DECIMAL(10,2),
    ce_volume INTEGER DEFAULT 0,
    ce_oi INTEGER DEFAULT 0,
    ce_oi_change INTEGER DEFAULT 0,
    ce_iv DECIMAL(5,2), -- Implied Volatility
    ce_delta DECIMAL(5,4),
    ce_gamma DECIMAL(6,4),
    ce_theta DECIMAL(6,4),
    ce_vega DECIMAL(6,4),
    
    -- Put option detailed data
    pe_ltp DECIMAL(10,2),
    pe_bid DECIMAL(10,2),
    pe_ask DECIMAL(10,2),
    pe_volume INTEGER DEFAULT 0,
    pe_oi INTEGER DEFAULT 0,
    pe_oi_change INTEGER DEFAULT 0,
    pe_iv DECIMAL(5,2),
    pe_delta DECIMAL(5,4),
    pe_gamma DECIMAL(6,4),
    pe_theta DECIMAL(6,4),
    pe_vega DECIMAL(6,4),
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(symbol, timestamp, expiry_date, strike_price)
) PARTITION BY RANGE (timestamp);

-- Create partitions for detailed option chain data
CREATE TABLE historical_option_chain_detailed_2025q1 PARTITION OF historical_option_chain_detailed
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE historical_option_chain_detailed_2025q2 PARTITION OF historical_option_chain_detailed
FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Composite indexes for option chain queries
CREATE INDEX idx_historical_chain_symbol_expiry_strike ON historical_option_chain_detailed(symbol, expiry_date, strike_price, timestamp DESC);

-- ================================================================================
-- 📅 STEP 4: Daily OI Snapshots for Trend Analysis and EOD Processing
-- ================================================================================

CREATE TABLE daily_option_oi_snapshots (
    id SERIAL PRIMARY KEY,
    trading_date DATE NOT NULL,
    symbol TEXT NOT NULL,
    expiry DATE NOT NULL,
    strike DECIMAL(10,2) NOT NULL,
    underlying_close DECIMAL(10,2),
    
    -- Call option daily summary
    ce_oi INTEGER DEFAULT 0,
    ce_oi_change INTEGER DEFAULT 0,
    ce_volume INTEGER DEFAULT 0,
    ce_turnover DECIMAL(15,2),
    ce_closing_price DECIMAL(10,2),
    ce_avg_iv DECIMAL(5,2),
    
    -- Put option daily summary
    pe_oi INTEGER DEFAULT 0,
    pe_oi_change INTEGER DEFAULT 0,
    pe_volume INTEGER DEFAULT 0,
    pe_turnover DECIMAL(15,2),
    pe_closing_price DECIMAL(10,2),
    pe_avg_iv DECIMAL(5,2),
    
    -- Analytics fields
    pcr_oi DECIMAL(6,4), -- Put-Call Ratio by OI
    pcr_volume DECIMAL(6,4), -- Put-Call Ratio by Volume
    max_pain_proximity DECIMAL(5,2), -- Distance from max pain
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(trading_date, symbol, expiry, strike)
);

-- Indexes for daily snapshot queries
CREATE INDEX idx_daily_snapshots_symbol_date ON daily_option_oi_snapshots(symbol, trading_date DESC);
CREATE INDEX idx_daily_snapshots_expiry_date ON daily_option_oi_snapshots(expiry, trading_date DESC);
CREATE INDEX idx_daily_snapshots_pcr ON daily_option_oi_snapshots(symbol, trading_date DESC, pcr_oi);

-- Weekly OI change analysis table
CREATE TABLE weekly_oi_analysis (
    id SERIAL PRIMARY KEY,
    week_ending DATE NOT NULL,
    symbol TEXT NOT NULL,
    expiry DATE NOT NULL,
    total_ce_oi_change BIGINT,
    total_pe_oi_change BIGINT,
    net_oi_flow BIGINT, -- CE - PE OI change
    dominant_strikes JSONB, -- Top 5 strikes by OI change
    unusual_activity_strikes JSONB, -- Strikes with >200% OI change
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(week_ending, symbol, expiry)
);

-- ================================================================================
-- 🧠 STEP 5: Advanced Strategy Evaluation and AI-Ready Infrastructure
-- ================================================================================

-- Enhanced strategy performance tracking
CREATE TABLE strategy_backtest_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    strategy_id INTEGER REFERENCES user_strategies(id) ON DELETE CASCADE,
    backtest_name TEXT,
    run_timestamp TIMESTAMP NOT NULL,
    
    -- Backtest parameters
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_capital DECIMAL(12,2) DEFAULT 100000,
    
    -- Performance metrics
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2),
    avg_return_per_trade DECIMAL(8,4),
    best_trade DECIMAL(8,4),
    worst_trade DECIMAL(8,4),
    
    -- Risk metrics
    total_return DECIMAL(8,4),
    annualized_return DECIMAL(8,4),
    max_drawdown DECIMAL(8,4),
    sharpe_ratio DECIMAL(6,4),
    sortino_ratio DECIMAL(6,4),
    calmar_ratio DECIMAL(6,4),
    
    -- Data quality
    data_coverage_percent DECIMAL(5,2),
    missing_data_days INTEGER DEFAULT 0,
    
    -- Execution details
    execution_time_ms INTEGER,
    trades_data JSONB, -- Detailed trade log
    equity_curve JSONB, -- Daily portfolio values
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(strategy_id, run_timestamp)
);

-- Strategy scorecard for ranking and recommendations
CREATE TABLE strategy_scorecard (
    strategy_id INTEGER PRIMARY KEY REFERENCES user_strategies(id) ON DELETE CASCADE,
    last_evaluation TIMESTAMP NOT NULL,
    
    -- Performance scores (0-100)
    return_score INTEGER CHECK (return_score BETWEEN 0 AND 100),
    consistency_score INTEGER CHECK (consistency_score BETWEEN 0 AND 100),
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    market_adaptability_score INTEGER CHECK (market_adaptability_score BETWEEN 0 AND 100),
    
    -- Overall ranking
    composite_score DECIMAL(5,2) CHECK (composite_score BETWEEN 0 AND 100),
    rank_percentile INTEGER CHECK (rank_percentile BETWEEN 1 AND 100),
    
    -- AI recommendation factors
    suggestion_score DECIMAL(5,2) CHECK (suggestion_score BETWEEN 0 AND 100),
    user_fit_score DECIMAL(5,2), -- Based on user's risk profile
    market_condition_suitability JSONB, -- Performance in different market conditions
    
    -- Recent performance
    last_30_days_return DECIMAL(8,4),
    last_90_days_return DECIMAL(8,4),
    ytd_return DECIMAL(8,4),
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Strategy execution log for real-time monitoring
CREATE TABLE strategy_execution_log (
    id BIGSERIAL PRIMARY KEY,
    strategy_id INTEGER REFERENCES user_strategies(id),
    execution_timestamp TIMESTAMP NOT NULL,
    
    -- Execution context
    market_conditions JSONB,
    trigger_conditions JSONB,
    
    -- Results
    matches_found INTEGER DEFAULT 0,
    instruments_matched JSONB,
    confidence_scores JSONB,
    
    -- Performance tracking
    execution_duration_ms INTEGER,
    data_freshness_seconds INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_details TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (execution_timestamp);

-- Create partitions for execution log
CREATE TABLE strategy_execution_log_2025q1 PARTITION OF strategy_execution_log
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE strategy_execution_log_2025q2 PARTITION OF strategy_execution_log
FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Machine Learning feature store for AI development
CREATE TABLE ml_feature_vectors (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    feature_set_version TEXT NOT NULL,
    
    -- Technical indicators
    rsi_14 DECIMAL(5,2),
    macd_signal DECIMAL(8,4),
    bollinger_position DECIMAL(5,4), -- Position within Bollinger Bands
    volume_sma_ratio DECIMAL(6,4),
    
    -- Options-specific features
    put_call_ratio DECIMAL(6,4),
    max_pain_distance DECIMAL(8,2),
    iv_rank DECIMAL(5,2),
    gamma_exposure DECIMAL(12,2),
    
    -- Market microstructure
    bid_ask_spread_pct DECIMAL(6,4),
    order_flow_imbalance DECIMAL(6,4),
    
    -- Sentiment indicators
    unusual_activity_score DECIMAL(5,2),
    smart_money_flow DECIMAL(8,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(symbol, timestamp, feature_set_version)
) PARTITION BY RANGE (timestamp);

-- Create partitions for ML features
CREATE TABLE ml_feature_vectors_2025q1 PARTITION OF ml_feature_vectors
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

-- Pattern detection results for AI training
CREATE TABLE detected_patterns (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    pattern_type TEXT CHECK (pattern_type IN (
        'CALL_BUILDUP', 'PUT_BUILDUP', 'CALL_UNWINDING', 'PUT_UNWINDING',
        'GAMMA_SQUEEZE', 'MAX_PAIN_MAGNET', 'UNUSUAL_ACTIVITY', 'VOLATILITY_CRUSH'
    )) NOT NULL,
    
    confidence_score DECIMAL(5,4) CHECK (confidence_score BETWEEN 0 AND 1),
    detected_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    
    -- Pattern-specific data
    pattern_metadata JSONB NOT NULL,
    supporting_strikes DECIMAL(10,2)[],
    key_indicators JSONB,
    
    -- Outcome tracking for ML training
    is_active BOOLEAN DEFAULT TRUE,
    outcome_verified BOOLEAN DEFAULT FALSE,
    outcome_success BOOLEAN,
    outcome_magnitude DECIMAL(8,4),
    outcome_duration_hours INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (detected_at);

-- Create partitions for pattern detection
CREATE TABLE detected_patterns_2025q1 PARTITION OF detected_patterns
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

-- ================================================================================
-- 🔄 STEP 6: Data Lifecycle Management and Cleanup Automation
-- ================================================================================

-- Data retention policy table
CREATE TABLE data_retention_policies (
    id SERIAL PRIMARY KEY,
    table_name TEXT UNIQUE NOT NULL,
    retention_days INTEGER NOT NULL,
    partition_strategy TEXT CHECK (partition_strategy IN ('MONTHLY', 'QUARTERLY', 'YEARLY')),
    cleanup_enabled BOOLEAN DEFAULT TRUE,
    last_cleanup TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert retention policies
INSERT INTO data_retention_policies (table_name, retention_days, partition_strategy) VALUES
('realtime_data_snapshots_new', 7, 'MONTHLY'),
('intraday_option_oi_new', 30, 'MONTHLY'),
('historical_minute_data', 365, 'QUARTERLY'),
('strategy_execution_log', 90, 'QUARTERLY'),
('ml_feature_vectors', 180, 'QUARTERLY'),
('detected_patterns', 365, 'QUARTERLY');

-- Cleanup function for old real-time data
CREATE OR REPLACE FUNCTION cleanup_old_realtime_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_time TIMESTAMP;
BEGIN
    -- Delete data older than 48 hours from real-time tables
    cutoff_time := NOW() - INTERVAL '48 hours';
    
    -- Clean realtime snapshots
    DELETE FROM realtime_data_snapshots_new 
    WHERE timestamp < cutoff_time;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean intraday OI data older than 7 days
    DELETE FROM intraday_option_oi_new 
    WHERE timestamp < NOW() - INTERVAL '7 days';
    
    -- Log cleanup operation
    INSERT INTO system_health_logs (component, status, timestamp, details)
    VALUES ('data_cleanup', 'SUCCESS', NOW(), 
            jsonb_build_object('deleted_rows', deleted_count, 'cutoff_time', cutoff_time));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Archive function to move real-time data to historical tables
CREATE OR REPLACE FUNCTION archive_to_historical()
RETURNS VOID AS $$
BEGIN
    -- Archive minute-level data from realtime snapshots
    INSERT INTO historical_minute_data (symbol, timestamp, open_price, high_price, low_price, close_price, volume, vwap)
    SELECT 
        symbol,
        date_trunc('minute', timestamp) as minute_timestamp,
        first_value(ltp) OVER w as open_price,
        max(ltp) OVER w as high_price,
        min(ltp) OVER w as low_price,
        last_value(ltp) OVER w as close_price,
        max(volume) OVER w as volume,
        avg(ltp) OVER w as vwap
    FROM realtime_data_snapshots_new
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
    AND timestamp < NOW() - INTERVAL '5 minutes' -- Ensure data completeness
    WINDOW w AS (PARTITION BY symbol, date_trunc('minute', timestamp) 
                 ORDER BY timestamp 
                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
    ON CONFLICT (symbol, timestamp) DO NOTHING;
    
    -- Archive daily OI snapshots
    INSERT INTO daily_option_oi_snapshots (
        trading_date, symbol, expiry, strike, 
        ce_oi, pe_oi, ce_volume, pe_volume,
        ce_closing_price, pe_closing_price
    )
    SELECT 
        CURRENT_DATE,
        symbol,
        expiry,
        strike,
        max(CASE WHEN option_type = 'CE' THEN oi_current END) as ce_oi,
        max(CASE WHEN option_type = 'PE' THEN oi_current END) as pe_oi,
        max(CASE WHEN option_type = 'CE' THEN volume END) as ce_volume,
        max(CASE WHEN option_type = 'PE' THEN volume END) as pe_volume,
        max(CASE WHEN option_type = 'CE' THEN ltp END) as ce_closing_price,
        max(CASE WHEN option_type = 'PE' THEN ltp END) as pe_closing_price
    FROM intraday_option_oi_new
    WHERE timestamp >= CURRENT_DATE
    AND timestamp < CURRENT_DATE + INTERVAL '1 day'
    GROUP BY symbol, expiry, strike
    ON CONFLICT (trading_date, symbol, expiry, strike) 
    DO UPDATE SET
        ce_oi = EXCLUDED.ce_oi,
        pe_oi = EXCLUDED.pe_oi,
        ce_volume = EXCLUDED.ce_volume,
        pe_volume = EXCLUDED.pe_volume,
        ce_closing_price = EXCLUDED.ce_closing_price,
        pe_closing_price = EXCLUDED.pe_closing_price;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- 🎯 Performance Optimization Views and Materialized Views
-- ================================================================================

-- Real-time market overview materialized view
CREATE MATERIALIZED VIEW market_overview AS
SELECT 
    symbol,
    max(timestamp) as last_update,
    last_value(ltp ORDER BY timestamp) as current_price,
    last_value(change_percent ORDER BY timestamp) as change_percent,
    last_value(volume ORDER BY timestamp) as volume,
    count(*) as update_count_today
FROM realtime_data_snapshots_new
WHERE timestamp >= CURRENT_DATE
GROUP BY symbol;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_market_overview_symbol ON market_overview(symbol);

-- Option chain summary view for quick access
CREATE MATERIALIZED VIEW current_option_chain_summary AS
SELECT 
    symbol,
    expiry,
    strike,
    max(CASE WHEN option_type = 'CE' THEN oi_current END) as ce_oi,
    max(CASE WHEN option_type = 'PE' THEN oi_current END) as pe_oi,
    max(CASE WHEN option_type = 'CE' THEN ltp END) as ce_ltp,
    max(CASE WHEN option_type = 'PE' THEN ltp END) as pe_ltp,
    max(timestamp) as last_update
FROM intraday_option_oi_new
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY symbol, expiry, strike;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_option_chain_summary_unique ON current_option_chain_summary(symbol, expiry, strike);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_market_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY market_overview;
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_option_chain_summary;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- 📊 Performance Monitoring and Query Optimization
-- ================================================================================

-- Query performance tracking
CREATE TABLE query_performance_log (
    id BIGSERIAL PRIMARY KEY,
    query_hash TEXT NOT NULL,
    query_text TEXT,
    execution_time_ms INTEGER NOT NULL,
    rows_returned INTEGER,
    user_id INTEGER,
    endpoint TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create partition for current quarter
CREATE TABLE query_performance_log_2025q1 PARTITION OF query_performance_log
FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

-- Database statistics view
CREATE VIEW db_performance_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ================================================================================
-- 🔧 Helper Functions and Utilities
-- ================================================================================

-- Function to get latest market data for a symbol
CREATE OR REPLACE FUNCTION get_latest_market_data(p_symbol TEXT)
RETURNS TABLE (
    symbol TEXT,
    current_price DECIMAL(10,2),
    change_percent DECIMAL(5,2),
    volume INTEGER,
    last_update TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.symbol,
        r.ltp,
        r.change_percent,
        r.volume,
        r.timestamp
    FROM realtime_data_snapshots_new r
    WHERE r.symbol = p_symbol
    ORDER BY r.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate Put-Call Ratio for a symbol
CREATE OR REPLACE FUNCTION calculate_pcr(p_symbol TEXT, p_expiry DATE DEFAULT NULL)
RETURNS DECIMAL(6,4) AS $$
DECLARE
    total_ce_oi BIGINT;
    total_pe_oi BIGINT;
    pcr DECIMAL(6,4);
BEGIN
    SELECT 
        sum(CASE WHEN option_type = 'CE' THEN oi_current ELSE 0 END),
        sum(CASE WHEN option_type = 'PE' THEN oi_current ELSE 0 END)
    INTO total_ce_oi, total_pe_oi
    FROM intraday_option_oi_new
    WHERE symbol = p_symbol
    AND (p_expiry IS NULL OR expiry = p_expiry)
    AND timestamp >= NOW() - INTERVAL '15 minutes';
    
    IF total_ce_oi > 0 THEN
        pcr := total_pe_oi::DECIMAL / total_ce_oi::DECIMAL;
    ELSE
        pcr := 0;
    END IF;
    
    RETURN pcr;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================
-- 📋 Data Migration Script (Optional - for existing data)
-- ================================================================================

-- Migrate existing data to new partitioned tables (run carefully in production)
/*
-- Example migration for realtime_data_snapshots
INSERT INTO realtime_data_snapshots_new (symbol, timestamp, ltp, change_amount, change_percent, volume, data_json)
SELECT symbol, timestamp, ltp, 
       NULL as change_amount, 
       NULL as change_percent, 
       NULL as volume, 
       data_json
FROM realtime_data_snapshots
WHERE timestamp >= '2025-01-01';

-- Verify migration
SELECT count(*) FROM realtime_data_snapshots_new;
SELECT count(*) FROM realtime_data_snapshots WHERE timestamp >= '2025-01-01';

-- After verification, rename tables
-- ALTER TABLE realtime_data_snapshots RENAME TO realtime_data_snapshots_old;
-- ALTER TABLE realtime_data_snapshots_new RENAME TO realtime_data_snapshots;
*/

-- ================================================================================
-- ✅ Verification Queries
-- ================================================================================

-- Check partition creation
SELECT 
    schemaname, 
    tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE '%_202%' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index creation
SELECT 
    indexname, 
    tablename, 
    indexdef 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Test queries for performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM realtime_data_snapshots_new 
WHERE symbol = 'NIFTY' 
AND timestamp >= NOW() - INTERVAL '1 hour' 
ORDER BY timestamp DESC 
LIMIT 10;

-- ================================================================================
-- 🎯 Complete - Schema Optimization Applied
-- ================================================================================

-- Summary of optimizations applied:
-- ✅ Composite indexes for high-performance queries
-- ✅ Table partitioning for scalable real-time data
-- ✅ Minute-level historical data for comprehensive backtesting
-- ✅ Daily OI snapshots for trend analysis
-- ✅ Advanced strategy evaluation and AI-ready infrastructure
-- ✅ Data lifecycle management and cleanup automation
-- ✅ Performance monitoring and optimization utilities
-- ✅ Helper functions for common operations

SELECT 'PostgreSQL schema optimization completed successfully!' as status;