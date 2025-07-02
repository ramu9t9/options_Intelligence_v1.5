-- ===========================
-- Data Migration Script
-- Migrate existing data to new schema
-- ===========================

BEGIN;

-- Migrate instruments to symbols
INSERT INTO symbols (
    name, 
    type, 
    expiry, 
    underlying_symbol, 
    tick_size, 
    lot_size, 
    is_active, 
    exchange,
    created_at,
    updated_at
)
SELECT 
    symbol as name,
    CASE 
        WHEN market_type = 'INDEX' THEN 'INDEX'
        WHEN market_type = 'EQUITY' THEN 'STOCK'
        WHEN market_type = 'COMMODITY' THEN 'COMMODITY'
        WHEN market_type = 'CURRENCY' THEN 'CURRENCY'
        ELSE 'STOCK'
    END as type,
    expiry_date as expiry,
    NULL as underlying_symbol, -- Will need manual mapping
    tick_size,
    lot_size,
    is_active,
    'NSE' as exchange,
    created_at,
    updated_at
FROM instruments
WHERE NOT EXISTS (
    SELECT 1 FROM symbols 
    WHERE symbols.name = instruments.symbol
);

-- Migrate option_data to live_market_snapshots
INSERT INTO live_market_snapshots (
    symbol_id,
    timestamp,
    price,
    volume,
    oi,
    change_oi,
    data_source
)
SELECT 
    s.id as symbol_id,
    od.timestamp,
    od.last_traded_price as price,
    COALESCE(od.volume, 0) as volume,
    COALESCE(od.open_interest, 0) as oi,
    COALESCE(od.oi_change, 0) as change_oi,
    'mock' as data_source -- Default source for migrated data
FROM option_data od
INNER JOIN instruments i ON od.instrument_id = i.id
INNER JOIN symbols s ON s.name = i.symbol
WHERE od.timestamp >= NOW() - INTERVAL '7 days' -- Only recent data
ON CONFLICT (symbol_id, timestamp) DO NOTHING;

-- Migrate historical_market_data to historical_candle_data
INSERT INTO historical_candle_data (
    symbol_id,
    timeframe,
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    data_source,
    created_at
)
SELECT 
    s.id as symbol_id,
    CASE 
        WHEN hmd.timeframe = '1MIN' THEN '1min'
        WHEN hmd.timeframe = '5MIN' THEN '5min'
        WHEN hmd.timeframe = '15MIN' THEN '15min'
        WHEN hmd.timeframe = '1HOUR' THEN '1hr'
        WHEN hmd.timeframe = '1DAY' THEN '1d'
        ELSE '1d'
    END as timeframe,
    hmd.trading_date as timestamp,
    hmd.open_price as open,
    hmd.high_price as high,
    hmd.low_price as low,
    hmd.close_price as close,
    COALESCE(hmd.volume, 0) as volume,
    COALESCE(hmd.data_source, 'mock') as data_source,
    hmd.created_at
FROM historical_market_data hmd
INNER JOIN instruments i ON hmd.instrument_id = i.id
INNER JOIN symbols s ON s.name = i.symbol
ON CONFLICT (symbol_id, timeframe, timestamp) DO NOTHING;

-- Migrate historical_option_chain data
INSERT INTO historical_option_chain (
    symbol_id,
    timestamp,
    ltp,
    iv,
    oi_change,
    volume,
    open_interest,
    data_source,
    created_at
)
SELECT 
    s.id as symbol_id,
    hoc.trading_date as timestamp,
    hoc.last_traded_price as ltp,
    hoc.implied_volatility as iv,
    COALESCE(hoc.oi_change_from_prev_day, 0) as oi_change,
    COALESCE(hoc.volume, 0) as volume,
    COALESCE(hoc.open_interest, 0) as open_interest,
    COALESCE(hoc.data_source, 'mock') as data_source,
    hoc.created_at
FROM historical_option_chain hoc
INNER JOIN instruments i ON hoc.instrument_id = i.id
INNER JOIN symbols s ON s.name = i.symbol;

-- Migrate user_strategies to strategies
INSERT INTO strategies (
    user_id,
    name,
    description,
    is_active,
    is_public,
    created_at,
    updated_at
)
SELECT 
    user_id,
    name,
    description,
    is_active,
    is_public,
    created_at,
    updated_at
FROM user_strategies;

-- Create default strategy conditions from existing rules_json
-- This is a simplified migration - manual review may be needed
INSERT INTO strategy_conditions (
    strategy_id,
    parameter,
    operator,
    value,
    "order"
)
SELECT 
    s.id as strategy_id,
    'oi' as parameter,
    '>' as operator,
    1000 as value,
    1 as "order"
FROM strategies s
INNER JOIN user_strategies us ON s.name = us.name AND s.user_id = us.user_id
WHERE us.rules_json IS NOT NULL;

-- Migrate market_signals to pattern_detections
INSERT INTO pattern_detections (
    symbol_id,
    pattern_name,
    confidence,
    timeframe,
    timestamp,
    direction,
    is_active,
    created_at
)
SELECT 
    s.id as symbol_id,
    ms.signal_type as pattern_name,
    ms.confidence_score as confidence,
    '15min' as timeframe, -- Default timeframe
    ms.created_at as timestamp,
    CASE 
        WHEN ms.direction = 'BULLISH' THEN 'bullish'
        WHEN ms.direction = 'BEARISH' THEN 'bearish'
        ELSE 'neutral'
    END as direction,
    ms.is_active,
    ms.created_at
FROM market_signals ms
INNER JOIN instruments i ON ms.instrument_id = i.id
INNER JOIN symbols s ON s.name = i.symbol;

-- Create sample user saved scans
INSERT INTO user_saved_scans (
    user_id,
    name,
    conditions,
    is_active
)
SELECT 
    id as user_id,
    'High Volume Scanner' as name,
    '{"volume": {">" : 10000}, "oi_change": {">" : 5000}}' as conditions,
    true as is_active
FROM users
WHERE role = 'USER'
LIMIT 5;

-- Update data source statistics
UPDATE data_sources SET
    total_requests = 1000,
    successful_requests = 950,
    failed_requests = 50,
    avg_response_time = 150.0,
    current_usage = 0,
    last_successful_fetch = NOW() - INTERVAL '5 minutes'
WHERE name IN ('angel-one', 'dhan', 'nse');

UPDATE data_sources SET
    total_requests = 500,
    successful_requests = 400,
    failed_requests = 100,
    avg_response_time = 300.0,
    current_usage = 0,
    last_successful_fetch = NOW() - INTERVAL '1 hour'
WHERE name = 'yahoo';

UPDATE data_sources SET
    total_requests = 10000,
    successful_requests = 10000,
    failed_requests = 0,
    avg_response_time = 10.0,
    current_usage = 0,
    last_successful_fetch = NOW()
WHERE name = 'mock';

COMMIT;

-- ===========================
-- Data Migration Complete
-- ===========================