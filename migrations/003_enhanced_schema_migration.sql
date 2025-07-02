-- Enhanced Options Intelligence Platform Schema Migration
-- Adds future-ready tables for orders, payments, subscriptions, and enhanced market data

-- ===============================
-- DROP EXISTING TABLES (if needed for clean migration)
-- ===============================

-- ===============================
-- CREATE ENHANCED TABLES
-- ===============================

-- Update symbols table with enhanced fields
ALTER TABLE symbols 
ADD COLUMN IF NOT EXISTS symbol_token VARCHAR(50),
ADD COLUMN IF NOT EXISTS lot_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS tick_size DECIMAL(10,4) DEFAULT 0.05;

-- Update users table with enhanced fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(15),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS subscription_id INTEGER,
ADD COLUMN IF NOT EXISTS total_balance DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_balance DECIMAL(15,2) DEFAULT 0;

-- Create future-ready trading tables
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    strategy_id INTEGER,
    symbol_id INTEGER NOT NULL,
    order_type VARCHAR(20) NOT NULL, -- BUY, SELL, STOP_LOSS, TARGET
    product_type VARCHAR(20) NOT NULL, -- MIS, CNC, NRML
    quantity INTEGER NOT NULL,
    price DECIMAL(12,4),
    trigger_price DECIMAL(12,4),
    status VARCHAR(20) DEFAULT 'pending', -- pending, placed, executed, cancelled, failed
    filled_quantity INTEGER DEFAULT 0,
    average_price DECIMAL(12,4),
    broker_order_id VARCHAR(100),
    broker VARCHAR(50) DEFAULT 'angel-one',
    exchange VARCHAR(10),
    remarks TEXT,
    placed_at TIMESTAMP,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (strategy_id) REFERENCES strategies(id),
    FOREIGN KEY (symbol_id) REFERENCES symbols(id)
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_strategy_idx ON orders(strategy_id);
CREATE INDEX IF NOT EXISTS orders_symbol_idx ON orders(symbol_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_broker_order_idx ON orders(broker_order_id);
CREATE INDEX IF NOT EXISTS orders_placed_at_idx ON orders(placed_at);

-- Create order audit log table
CREATE TABLE IF NOT EXISTS order_audit_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- CREATED, UPDATED, CANCELLED, EXECUTED
    previous_state TEXT, -- JSON previous order state
    new_state TEXT, -- JSON new order state
    remarks TEXT,
    changed_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS order_audit_order_idx ON order_audit_log(order_id);
CREATE INDEX IF NOT EXISTS order_audit_user_idx ON order_audit_log(user_id);
CREATE INDEX IF NOT EXISTS order_audit_changed_at_idx ON order_audit_log(changed_at);

-- Create trade executions table
CREATE TABLE IF NOT EXISTS trade_executions (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    symbol_id INTEGER NOT NULL,
    execution_time TIMESTAMP NOT NULL,
    execution_price DECIMAL(12,4) NOT NULL,
    executed_quantity INTEGER NOT NULL,
    pnl DECIMAL(15,2),
    fees DECIMAL(10,2) DEFAULT 0,
    taxes DECIMAL(10,2) DEFAULT 0,
    broker_execution_id VARCHAR(100),
    exchange VARCHAR(10),
    settlement_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (symbol_id) REFERENCES symbols(id)
);

CREATE INDEX IF NOT EXISTS trade_executions_order_idx ON trade_executions(order_id);
CREATE INDEX IF NOT EXISTS trade_executions_user_idx ON trade_executions(user_id);
CREATE INDEX IF NOT EXISTS trade_executions_symbol_idx ON trade_executions(symbol_id);
CREATE INDEX IF NOT EXISTS trade_executions_execution_time_idx ON trade_executions(execution_time);

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    billing_cycle VARCHAR(20) NOT NULL, -- MONTHLY, QUARTERLY, YEARLY
    max_backtests INTEGER DEFAULT 10,
    max_alerts INTEGER DEFAULT 50,
    max_strategies INTEGER DEFAULT 5,
    live_access_enabled BOOLEAN DEFAULT false,
    advanced_features_enabled BOOLEAN DEFAULT false,
    api_access_enabled BOOLEAN DEFAULT false,
    features TEXT, -- JSON list of features
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_name_idx ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS subscription_plans_is_active_idx ON subscription_plans(is_active);

-- Create user subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired, suspended
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    current_usage TEXT, -- JSON usage statistics
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX IF NOT EXISTS user_subscriptions_user_idx ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_plan_idx ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS user_subscriptions_end_date_idx ON user_subscriptions(end_date);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    subscription_id INTEGER,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    payment_gateway VARCHAR(50) NOT NULL, -- STRIPE, RAZORPAY, PAYTM
    gateway_transaction_id VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    payment_method VARCHAR(50), -- card, upi, netbanking, wallet
    invoice_url VARCHAR(500),
    receipt_url VARCHAR(500),
    failure_reason TEXT,
    paid_at TIMESTAMP,
    refunded_at TIMESTAMP,
    metadata TEXT, -- JSON additional payment data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id)
);

CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_subscription_idx ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_idx ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON payments(paid_at);

-- Create user saved scans table
CREATE TABLE IF NOT EXISTS user_saved_scans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    scan_type VARCHAR(50) NOT NULL, -- TECHNICAL, FUNDAMENTAL, OPTIONS
    criteria TEXT NOT NULL, -- JSON scan criteria
    symbols TEXT, -- JSON array of symbols to scan
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS user_saved_scans_user_idx ON user_saved_scans(user_id);
CREATE INDEX IF NOT EXISTS user_saved_scans_scan_type_idx ON user_saved_scans(scan_type);

-- Create login activity table
CREATE TABLE IF NOT EXISTS login_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    email VARCHAR(255),
    login_time TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    location VARCHAR(100),
    device VARCHAR(50),
    success BOOLEAN DEFAULT true,
    failure_reason TEXT,
    session_id VARCHAR(100),
    logout_time TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS login_activity_user_idx ON login_activity(user_id);
CREATE INDEX IF NOT EXISTS login_activity_email_idx ON login_activity(email);
CREATE INDEX IF NOT EXISTS login_activity_login_time_idx ON login_activity(login_time);
CREATE INDEX IF NOT EXISTS login_activity_ip_address_idx ON login_activity(ip_address);

-- ===============================
-- INSERT INITIAL DATA
-- ===============================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price, billing_cycle, max_backtests, max_alerts, max_strategies, live_access_enabled, advanced_features_enabled, api_access_enabled, features) VALUES
('free', 'Free Plan', 'Basic features for beginners', 0.00, 'MONTHLY', 5, 10, 2, false, false, false, '["Basic Option Chain", "5 Backtests/month", "10 Alerts", "2 Strategies"]'),
('pro', 'Pro Plan', 'Advanced features for serious traders', 999.00, 'MONTHLY', 50, 100, 10, true, true, false, '["Live Market Data", "50 Backtests/month", "100 Alerts", "10 Strategies", "Advanced Patterns", "Real-time Scanning"]'),
('enterprise', 'Enterprise Plan', 'Complete trading suite with API access', 2999.00, 'MONTHLY', -1, -1, -1, true, true, true, '["Unlimited Backtests", "Unlimited Alerts", "Unlimited Strategies", "API Access", "Priority Support", "Custom Indicators"]')
ON CONFLICT (name) DO NOTHING;

-- Insert enhanced data sources with Angel One prioritized
INSERT INTO data_sources (name, display_name, type, priority, is_active, health_status, config) VALUES
('angel-one', 'Angel One', 'BROKER', 1, true, 'healthy', '{"api_url": "https://apiconnect.angelone.in", "rate_limit": 30, "features": ["live_data", "historical_data", "option_chain", "orders"]}'),
('dhan', 'Dhan', 'BROKER', 2, true, 'healthy', '{"api_url": "https://api.dhan.co", "rate_limit": 60, "features": ["live_data", "historical_data", "option_chain"]}'),
('nse', 'NSE Official', 'EXCHANGE', 3, true, 'healthy', '{"api_url": "https://www.nseindia.com", "rate_limit": 10, "features": ["live_data", "option_chain"]}'),
('yahoo', 'Yahoo Finance', 'EXTERNAL_API', 4, true, 'healthy', '{"api_url": "https://query1.finance.yahoo.com", "rate_limit": 100, "features": ["live_data", "historical_data"]}'),
('mock', 'Mock Data', 'MOCK', 5, true, 'healthy', '{"features": ["live_data", "historical_data", "option_chain"], "always_available": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert sample symbols with enhanced data
INSERT INTO symbols (name, display_name, type, segment, exchange, symbol_token, lot_size, tick_size, is_active) VALUES
('NIFTY', 'Nifty 50', 'INDEX', 'DERIVATIVE', 'NSE', '99926000', 25, 0.05, true),
('BANKNIFTY', 'Bank Nifty', 'INDEX', 'DERIVATIVE', 'NSE', '99926009', 25, 0.05, true),
('FINNIFTY', 'Fin Nifty', 'INDEX', 'DERIVATIVE', 'NSE', '99926037', 40, 0.05, true),
('RELIANCE', 'Reliance Industries', 'STOCK', 'EQUITY', 'NSE', '738561', 1, 0.05, true),
('TCS', 'Tata Consultancy Services', 'STOCK', 'EQUITY', 'NSE', '11536', 1, 0.05, true),
('HDFC', 'HDFC Bank', 'STOCK', 'EQUITY', 'NSE', '1333', 1, 0.05, true),
('INFY', 'Infosys Limited', 'STOCK', 'EQUITY', 'NSE', '408065', 1, 0.05, true),
('ITC', 'ITC Limited', 'STOCK', 'EQUITY', 'NSE', '424961', 1, 0.05, true),
('SBIN', 'State Bank of India', 'STOCK', 'EQUITY', 'NSE', '3045', 1, 0.05, true),
('WIPRO', 'Wipro Limited', 'STOCK', 'EQUITY', 'NSE', '3787', 1, 0.05, true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample admin user with enhanced fields
INSERT INTO users (email, name, status, role, total_balance, available_balance) VALUES
('admin@optionsintelligence.com', 'System Administrator', 'active', 'admin', 100000.00, 100000.00)
ON CONFLICT (email) DO NOTHING;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at column
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY['symbols', 'users', 'data_sources', 'strategies', 'orders', 'subscription_plans', 'user_subscriptions', 'payments', 'user_saved_scans'];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', table_name, table_name);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at 
                       BEFORE UPDATE ON %s 
                       FOR EACH ROW 
                       EXECUTE FUNCTION update_updated_at_column()', table_name, table_name);
    END LOOP;
END
$$;

-- ===============================
-- OPTIMIZATION AND PERFORMANCE
-- ===============================

-- Analyze all tables for better query planning
ANALYZE;

-- Success message
SELECT 'Enhanced Options Intelligence Platform schema migration completed successfully!' as status;