-- Strategy Builder MVP Database Tables
-- Phase 3: Strategy Builder Implementation

-- Create user_strategies table
CREATE TABLE IF NOT EXISTS user_strategies (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules_json JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create strategy_execution_logs table
CREATE TABLE IF NOT EXISTS strategy_execution_logs (
  id SERIAL PRIMARY KEY,
  strategy_id INTEGER NOT NULL,
  user_id VARCHAR NOT NULL,
  execution_time TIMESTAMP DEFAULT NOW(),
  matches_found INTEGER DEFAULT 0,
  execution_duration INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'COMPLETED',
  error_message TEXT,
  results_json JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_strategies_user_id_idx ON user_strategies(user_id);
CREATE INDEX IF NOT EXISTS user_strategies_active_idx ON user_strategies(is_active);
CREATE INDEX IF NOT EXISTS strategy_execution_logs_strategy_id_idx ON strategy_execution_logs(strategy_id);
CREATE INDEX IF NOT EXISTS strategy_execution_logs_user_id_idx ON strategy_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS strategy_execution_logs_time_idx ON strategy_execution_logs(execution_time);

-- Add foreign key constraints
ALTER TABLE user_strategies 
ADD CONSTRAINT fk_user_strategies_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE strategy_execution_logs 
ADD CONSTRAINT fk_strategy_execution_logs_strategy_id 
FOREIGN KEY (strategy_id) REFERENCES user_strategies(id) ON DELETE CASCADE;

ALTER TABLE strategy_execution_logs 
ADD CONSTRAINT fk_strategy_execution_logs_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update users table to include subscription tier and role
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER';

-- Insert sample strategy rules for testing
INSERT INTO user_strategies (user_id, name, description, rules_json) VALUES 
('admin', 'High OI Call Build-up Scanner', 'Scans for call options with high open interest build-up', 
'{"conditions":[{"field":"callOI","operator":">","value":"100000"},{"field":"callOIChange","operator":">","value":"50000"}],"logic":"AND"}'),
('admin', 'Put-Call Ratio Alert', 'Alert when PCR drops below threshold indicating bullish sentiment', 
'{"conditions":[{"field":"pcr","operator":"<","value":"0.7"}],"logic":"AND"}'),
('admin', 'Unusual Volume Scanner', 'Detects options with unusually high volume compared to open interest', 
'{"conditions":[{"field":"callVolume","operator":">","value":"50000"},{"field":"volumeOIRatio","operator":">","value":"2"}],"logic":"AND"}');

COMMIT;