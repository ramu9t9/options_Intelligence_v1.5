-- Create strategy_backtest_results table for Phase 5 backtesting
CREATE TABLE IF NOT EXISTS strategy_backtest_results (
  id SERIAL PRIMARY KEY,
  strategy_id INTEGER NOT NULL REFERENCES user_strategies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  backtest_name VARCHAR(255),
  symbol VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'RUNNING',
  total_evaluations INTEGER DEFAULT 0,
  matches_found INTEGER DEFAULT 0,
  successful_matches INTEGER DEFAULT 0,
  success_rate VARCHAR(10) DEFAULT '0',
  total_roi VARCHAR(20) DEFAULT '0',
  avg_move_post_match VARCHAR(20) DEFAULT '0',
  max_drawdown VARCHAR(20) DEFAULT '0',
  sharpe_ratio VARCHAR(20) DEFAULT '0',
  execution_time INTEGER DEFAULT 0,
  data_points_analyzed INTEGER DEFAULT 0,
  match_details JSONB DEFAULT '[]'::jsonb,
  performance_chart JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_backtest_strategy_id ON strategy_backtest_results(strategy_id);
CREATE INDEX IF NOT EXISTS idx_backtest_user_id ON strategy_backtest_results(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_symbol ON strategy_backtest_results(symbol);
CREATE INDEX IF NOT EXISTS idx_backtest_created_at ON strategy_backtest_results(created_at);