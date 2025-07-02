-- Live Data Optimization Migration
-- Optimizes database for high-frequency live data insertions and queries

-- ===============================
-- CREATE OPTIMIZED LIVE DATA TABLES
-- ===============================

-- Add partitioning to live_market_snapshots for better performance
-- Convert to partitioned table by date (daily partitions)
DO $$
BEGIN
    -- Check if table exists and is not partitioned
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'live_market_snapshots') THEN
        -- Create new partitioned table
        CREATE TABLE IF NOT EXISTS live_market_snapshots_partitioned (
            LIKE live_market_snapshots INCLUDING ALL
        ) PARTITION BY RANGE (timestamp);
        
        -- Create partitions for current and next few days
        FOR i IN 0..7 LOOP
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS live_market_snapshots_%s 
                PARTITION OF live_market_snapshots_partitioned 
                FOR VALUES FROM (%L) TO (%L)',
                to_char(CURRENT_DATE + i, 'YYYY_MM_DD'),
                quote_literal(CURRENT_DATE + i),
                quote_literal(CURRENT_DATE + i + 1)
            );
        END LOOP;
    END IF;
END
$$;

-- Add additional indexes for live data queries
CREATE INDEX IF NOT EXISTS live_snapshots_symbol_timestamp_desc_idx 
ON live_market_snapshots (symbol_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS live_snapshots_data_source_idx 
ON live_market_snapshots (data_source);

CREATE INDEX IF NOT EXISTS live_snapshots_price_change_idx 
ON live_market_snapshots (symbol_id, change_percent) 
WHERE ABS(change_percent) > 2; -- Index only significant price changes

-- Optimize historical_candle_data table
CREATE INDEX IF NOT EXISTS historical_candle_symbol_timeframe_idx 
ON historical_candle_data (symbol_id, timeframe, timestamp DESC);

CREATE INDEX IF NOT EXISTS historical_candle_volume_idx 
ON historical_candle_data (symbol_id, volume DESC) 
WHERE volume > 0;

-- Optimize historical_option_chain table
CREATE INDEX IF NOT EXISTS option_chain_symbol_expiry_strike_idx 
ON historical_option_chain (symbol_id, expiry_date, strike_price, option_type);

CREATE INDEX IF NOT EXISTS option_chain_oi_change_idx 
ON historical_option_chain (symbol_id, oi_change DESC) 
WHERE ABS(oi_change) > 1000; -- Index only significant OI changes

-- Optimize pattern_detections table
CREATE INDEX IF NOT EXISTS pattern_detections_confidence_idx 
ON pattern_detections (symbol_id, confidence DESC, detected_at DESC) 
WHERE confidence > 70; -- Index only high-confidence patterns

CREATE INDEX IF NOT EXISTS pattern_detections_active_idx 
ON pattern_detections (symbol_id, pattern_type, status) 
WHERE status = 'active';

-- ===============================
-- CREATE MATERIALIZED VIEWS FOR FAST QUERIES
-- ===============================

-- Materialized view for latest market data
CREATE MATERIALIZED VIEW IF NOT EXISTS latest_market_data AS
SELECT DISTINCT ON (lms.symbol_id) 
    s.name as symbol_name,
    s.display_name,
    s.type,
    lms.symbol_id,
    lms.timestamp,
    lms.price,
    lms.volume,
    lms.oi,
    lms.change_oi,
    lms.change,
    lms.change_percent,
    lms.high,
    lms.low,
    lms.data_source
FROM live_market_snapshots lms
JOIN symbols s ON lms.symbol_id = s.id
WHERE s.is_active = true
ORDER BY lms.symbol_id, lms.timestamp DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS latest_market_data_symbol_idx 
ON latest_market_data (symbol_id);

-- Materialized view for active patterns summary
CREATE MATERIALIZED VIEW IF NOT EXISTS active_patterns_summary AS
SELECT 
    s.name as symbol_name,
    pd.symbol_id,
    pd.pattern_type,
    pd.direction,
    pd.confidence,
    pd.timeframe,
    pd.target_price,
    pd.stop_loss,
    pd.detected_at,
    pd.valid_until
FROM pattern_detections pd
JOIN symbols s ON pd.symbol_id = s.id
WHERE pd.status = 'active' 
AND pd.valid_until > NOW()
AND pd.confidence > 70
ORDER BY pd.confidence DESC, pd.detected_at DESC;

-- Create index on patterns materialized view
CREATE INDEX IF NOT EXISTS active_patterns_summary_symbol_idx 
ON active_patterns_summary (symbol_id);

CREATE INDEX IF NOT EXISTS active_patterns_summary_confidence_idx 
ON active_patterns_summary (confidence DESC);

-- ===============================
-- CREATE FUNCTIONS FOR LIVE DATA OPERATIONS
-- ===============================

-- Function to get latest price for a symbol
CREATE OR REPLACE FUNCTION get_latest_price(symbol_name_param TEXT)
RETURNS TABLE(
    symbol_name TEXT,
    price DECIMAL(12,4),
    change_percent DECIMAL(8,4),
    volume INTEGER,
    timestamp TIMESTAMP,
    data_source VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lmd.symbol_name::TEXT,
        lmd.price,
        lmd.change_percent,
        lmd.volume,
        lmd.timestamp,
        lmd.data_source
    FROM latest_market_data lmd
    WHERE lmd.symbol_name = symbol_name_param;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_live_data_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY latest_market_data;
    REFRESH MATERIALIZED VIEW CONCURRENTLY active_patterns_summary;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old live data (keep only last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_live_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM live_market_snapshots 
    WHERE timestamp < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Vacuum the table after cleanup
    PERFORM pg_stat_reset_single_table_counters('live_market_snapshots'::regclass);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- CREATE SCHEDULED JOBS (using pg_cron if available)
-- ===============================

-- Schedule materialized view refresh every 30 seconds during market hours
-- Note: This requires pg_cron extension
DO $$
BEGIN
    -- Check if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule refresh during market hours (9:15 AM to 3:30 PM IST)
        PERFORM cron.schedule('refresh-live-data-views', '*/30 9-15 * * 1-5', 'SELECT refresh_live_data_views();');
        
        -- Schedule cleanup job daily at 6 AM
        PERFORM cron.schedule('cleanup-old-live-data', '0 6 * * *', 'SELECT cleanup_old_live_data();');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- pg_cron not available, skip scheduling
        NULL;
END
$$;

-- ===============================
-- PERFORMANCE OPTIMIZATIONS
-- ===============================

-- Increase work_mem for better sort performance
-- Note: This is session-level, consider setting in postgresql.conf for permanent effect
SET work_mem = '256MB';

-- Enable parallel query execution for better performance
SET max_parallel_workers_per_gather = 4;
SET parallel_tuple_cost = 0.1;
SET parallel_setup_cost = 1000;

-- Update table statistics
ANALYZE live_market_snapshots;
ANALYZE historical_candle_data;
ANALYZE historical_option_chain;
ANALYZE pattern_detections;
ANALYZE symbols;
ANALYZE data_sources;

-- Success message
SELECT 'Live data optimization migration completed successfully!' as status;
SELECT 'Created materialized views: latest_market_data, active_patterns_summary' as info;
SELECT 'Created functions: get_latest_price(), refresh_live_data_views(), cleanup_old_live_data()' as functions;