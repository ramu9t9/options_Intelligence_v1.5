-- ===========================
-- Sensibull-Style Schema Migration
-- Phase 1: Create New Tables
-- ===========================

-- Create new symbols table (replacing instruments)
CREATE TABLE IF NOT EXISTS symbols (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('INDEX', 'STOCK', 'COMMODITY', 'CURRENCY')),
    expiry TIMESTAMP WITH TIME ZONE,
    strike DECIMAL(10, 2),
    option_type TEXT CHECK (option_type IN ('CE', 'PE')),
    underlying_symbol TEXT,
    tick_size DECIMAL(10, 2) DEFAULT 0.05,
    lot_size INTEGER DEFAULT 25,
    is_active BOOLEAN NOT NULL DEFAULT true,
    exchange TEXT NOT NULL DEFAULT 'NSE' CHECK (exchange IN ('NSE', 'BSE', 'MCX', 'NCDEX')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for symbols
CREATE INDEX IF NOT EXISTS symbols_name_idx ON symbols(name);
CREATE INDEX IF NOT EXISTS symbols_type_idx ON symbols(type);
CREATE INDEX IF NOT EXISTS symbols_expiry_idx ON symbols(expiry);
CREATE INDEX IF NOT EXISTS symbols_underlying_idx ON symbols(underlying_symbol);
CREATE UNIQUE INDEX IF NOT EXISTS symbols_unique ON symbols(name, expiry, strike, option_type);

-- Create live_market_snapshots table (5-second updates)
CREATE TABLE IF NOT EXISTS live_market_snapshots (
    id SERIAL PRIMARY KEY,
    symbol_id INTEGER NOT NULL REFERENCES symbols(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    price DECIMAL(10, 2) NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    oi INTEGER NOT NULL DEFAULT 0,
    iv DECIMAL(5, 2),
    change_oi INTEGER NOT NULL DEFAULT 0,
    bid DECIMAL(10, 2),
    ask DECIMAL(10, 2),
    change DECIMAL(10, 2) NOT NULL DEFAULT 0,
    change_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    data_source TEXT NOT NULL CHECK (data_source IN ('angel-one', 'dhan', 'nse', 'yahoo', 'mock'))
);

-- Create indexes for live_market_snapshots
CREATE INDEX IF NOT EXISTS live_symbol_timestamp_idx ON live_market_snapshots(symbol_id, timestamp);
CREATE INDEX IF NOT EXISTS live_timestamp_idx ON live_market_snapshots(timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS live_unique_snapshot ON live_market_snapshots(symbol_id, timestamp);

-- Create historical_candle_data table (multiple timeframes)
CREATE TABLE IF NOT EXISTS historical_candle_data (
    id SERIAL PRIMARY KEY,
    symbol_id INTEGER NOT NULL REFERENCES symbols(id),
    timeframe TEXT NOT NULL CHECK (timeframe IN ('1min', '5min', '15min', '1hr', '1d')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open DECIMAL(10, 2) NOT NULL,
    high DECIMAL(10, 2) NOT NULL,
    low DECIMAL(10, 2) NOT NULL,
    close DECIMAL(10, 2) NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    data_source TEXT NOT NULL CHECK (data_source IN ('angel-one', 'dhan', 'nse', 'yahoo', 'mock')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for historical_candle_data
CREATE INDEX IF NOT EXISTS historical_symbol_timeframe_idx ON historical_candle_data(symbol_id, timeframe);
CREATE INDEX IF NOT EXISTS historical_timestamp_idx ON historical_candle_data(timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS historical_unique_candle ON historical_candle_data(symbol_id, timeframe, timestamp);

-- Create historical_option_chain table (15min & EOD updates)
CREATE TABLE IF NOT EXISTS historical_option_chain (
    id SERIAL PRIMARY KEY,
    symbol_id INTEGER NOT NULL REFERENCES symbols(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ltp DECIMAL(10, 2) NOT NULL,
    iv DECIMAL(5, 2),
    delta DECIMAL(5, 4),
    gamma DECIMAL(8, 6),
    theta DECIMAL(8, 6),
    vega DECIMAL(8, 6),
    pcr DECIMAL(5, 2),
    oi_change INTEGER NOT NULL DEFAULT 0,
    volume INTEGER NOT NULL DEFAULT 0,
    open_interest INTEGER NOT NULL DEFAULT 0,
    data_source TEXT NOT NULL CHECK (data_source IN ('angel-one', 'dhan', 'nse', 'yahoo', 'mock')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for historical_option_chain
CREATE INDEX IF NOT EXISTS option_chain_symbol_timestamp_idx ON historical_option_chain(symbol_id, timestamp);
CREATE INDEX IF NOT EXISTS option_chain_timestamp_idx ON historical_option_chain(timestamp);

-- Update users table to match new structure
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Free' CHECK (plan IN ('Free', 'Pro', 'Enterprise'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create strategies table (enhanced strategy builder)
CREATE TABLE IF NOT EXISTS strategies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for strategies
CREATE INDEX IF NOT EXISTS strategies_user_idx ON strategies(user_id);
CREATE INDEX IF NOT EXISTS strategies_name_idx ON strategies(name);

-- Create strategy_conditions table (granular strategy rules)
CREATE TABLE IF NOT EXISTS strategy_conditions (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    parameter TEXT NOT NULL,
    operator TEXT NOT NULL CHECK (operator IN ('>', '<', '>=', '<=', '=', '!=')),
    value DECIMAL(15, 2) NOT NULL,
    logical_operator TEXT DEFAULT 'AND' CHECK (logical_operator IN ('AND', 'OR')),
    "order" INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for strategy_conditions
CREATE INDEX IF NOT EXISTS strategy_conditions_strategy_idx ON strategy_conditions(strategy_id);

-- Create strategy_alerts table
CREATE TABLE IF NOT EXISTS strategy_alerts (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    type TEXT NOT NULL CHECK (type IN ('price', 'oi', 'volume', 'pattern')),
    target_value DECIMAL(15, 2) NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'webhook', 'push')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    triggered BOOLEAN NOT NULL DEFAULT false,
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for strategy_alerts
CREATE INDEX IF NOT EXISTS strategy_alerts_strategy_idx ON strategy_alerts(strategy_id);
CREATE INDEX IF NOT EXISTS strategy_alerts_priority_idx ON strategy_alerts(priority);

-- Create backtest_runs table
CREATE TABLE IF NOT EXISTS backtest_runs (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL REFERENCES strategies(id),
    from_date TIMESTAMP WITH TIME ZONE NOT NULL,
    to_date TIMESTAMP WITH TIME ZONE NOT NULL,
    win_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    pnl DECIMAL(15, 2) NOT NULL DEFAULT 0,
    drawdown DECIMAL(5, 2) NOT NULL DEFAULT 0,
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    losing_trades INTEGER NOT NULL DEFAULT 0,
    avg_win DECIMAL(15, 2) NOT NULL DEFAULT 0,
    avg_loss DECIMAL(15, 2) NOT NULL DEFAULT 0,
    sharpe_ratio DECIMAL(6, 3) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    details_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for backtest_runs
CREATE INDEX IF NOT EXISTS backtest_runs_strategy_idx ON backtest_runs(strategy_id);
CREATE INDEX IF NOT EXISTS backtest_runs_date_range_idx ON backtest_runs(from_date, to_date);

-- Create pattern_detections table (AI pattern detection)
CREATE TABLE IF NOT EXISTS pattern_detections (
    id SERIAL PRIMARY KEY,
    symbol_id INTEGER NOT NULL REFERENCES symbols(id),
    pattern_name TEXT NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    timeframe TEXT NOT NULL CHECK (timeframe IN ('1min', '5min', '15min', '1hr', '1d')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('bullish', 'bearish', 'neutral')),
    target_price DECIMAL(10, 2),
    stop_loss DECIMAL(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for pattern_detections
CREATE INDEX IF NOT EXISTS pattern_detections_symbol_idx ON pattern_detections(symbol_id);
CREATE INDEX IF NOT EXISTS pattern_detections_timestamp_idx ON pattern_detections(timestamp);
CREATE INDEX IF NOT EXISTS pattern_detections_pattern_idx ON pattern_detections(pattern_name);

-- Create user_saved_scans table
CREATE TABLE IF NOT EXISTS user_saved_scans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    conditions JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for user_saved_scans
CREATE INDEX IF NOT EXISTS user_saved_scans_user_idx ON user_saved_scans(user_id);

-- Create login_activity table
CREATE TABLE IF NOT EXISTS login_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    location TEXT,
    is_successful BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for login_activity
CREATE INDEX IF NOT EXISTS login_activity_user_idx ON login_activity(user_id);
CREATE INDEX IF NOT EXISTS login_activity_timestamp_idx ON login_activity(timestamp);

-- Create data_sources table (fallback chain management)
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (name IN ('angel-one', 'dhan', 'nse', 'yahoo', 'mock')),
    priority INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_successful_fetch TIMESTAMP WITH TIME ZONE,
    last_failed_fetch TIMESTAMP WITH TIME ZONE,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    avg_response_time DECIMAL(8, 2),
    rate_limit INTEGER DEFAULT 100,
    current_usage INTEGER DEFAULT 0,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for data_sources
CREATE INDEX IF NOT EXISTS data_sources_priority_idx ON data_sources(priority);
CREATE INDEX IF NOT EXISTS data_sources_name_idx ON data_sources(name);

-- Insert default data sources with fallback priority
INSERT INTO data_sources (name, priority, is_active, rate_limit) VALUES
('angel-one', 1, true, 200),
('dhan', 2, true, 150),
('nse', 3, true, 100),
('yahoo', 4, true, 50),
('mock', 5, true, 1000)
ON CONFLICT (name) DO NOTHING;

-- Insert some sample symbols for testing
INSERT INTO symbols (name, type, underlying_symbol, exchange) VALUES
('NIFTY', 'INDEX', NULL, 'NSE'),
('BANKNIFTY', 'INDEX', NULL, 'NSE'),
('RELIANCE', 'STOCK', NULL, 'NSE'),
('TCS', 'STOCK', NULL, 'NSE'),
('HDFC', 'STOCK', NULL, 'NSE')
ON CONFLICT DO NOTHING;

-- Create update_timestamp function for automatic updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_symbols_timestamp
    BEFORE UPDATE ON symbols
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_strategies_timestamp
    BEFORE UPDATE ON strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_saved_scans_timestamp
    BEFORE UPDATE ON user_saved_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_data_sources_timestamp
    BEFORE UPDATE ON data_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ===========================
-- Migration Complete
-- ===========================

COMMIT;