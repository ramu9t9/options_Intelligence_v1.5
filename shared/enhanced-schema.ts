import { pgTable, serial, text, varchar, timestamp, integer, decimal, boolean, uuid, index, uniqueIndex, foreignKey } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ===============================
// ENHANCED SENSIBULL-STYLE SCHEMA WITH FUTURE-READY TABLES
// ===============================

// ===========================
// MASTER DATA TABLES
// ===========================

export const symbols = pgTable('symbols', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  type: varchar('type', { length: 20 }).notNull(), // INDEX, STOCK, COMMODITY, CURRENCY, CRYPTO
  segment: varchar('segment', { length: 20 }).notNull(), // EQUITY, COMMODITY, CURRENCY, DERIVATIVE
  exchange: varchar('exchange', { length: 10 }).notNull(), // NSE, BSE, MCX, NCDEX
  symbolToken: varchar('symbol_token', { length: 50 }),
  lotSize: integer('lot_size').default(1),
  tickSize: decimal('tick_size', { precision: 10, scale: 4 }).default('0.05'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  nameIdx: index('symbols_name_idx').on(table.name),
  typeIdx: index('symbols_type_idx').on(table.type),
  exchangeIdx: index('symbols_exchange_idx').on(table.exchange)
}));

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  phone: varchar('phone', { length: 15 }),
  status: varchar('status', { length: 20 }).default('active'), // active, suspended, inactive
  role: varchar('role', { length: 20 }).default('user'), // user, admin, premium
  subscriptionId: integer('subscription_id'),
  totalBalance: decimal('total_balance', { precision: 15, scale: 2 }).default('0'),
  availableBalance: decimal('available_balance', { precision: 15, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  statusIdx: index('users_status_idx').on(table.status)
}));

export const dataSources = pgTable('data_sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  type: varchar('type', { length: 20 }).notNull(), // BROKER, EXCHANGE, EXTERNAL_API, MOCK
  priority: integer('priority').notNull(), // 1 = highest priority
  isActive: boolean('is_active').default(true),
  healthStatus: varchar('health_status', { length: 20 }).default('healthy'), // healthy, degraded, down
  lastHealthCheck: timestamp('last_health_check'),
  successRate: decimal('success_rate', { precision: 5, scale: 2 }).default('100.00'),
  avgResponseTime: integer('avg_response_time').default(0), // milliseconds
  rateLimit: integer('rate_limit').default(60), // requests per minute
  currentUsage: integer('current_usage').default(0),
  config: text('config'), // JSON configuration
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  priorityIdx: index('data_sources_priority_idx').on(table.priority),
  healthIdx: index('data_sources_health_idx').on(table.healthStatus)
}));

// ===========================
// LIVE MARKET DATA TABLES
// ===========================

export const liveMarketSnapshots = pgTable('live_market_snapshots', {
  id: serial('id').primaryKey(),
  symbolId: integer('symbol_id').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  price: decimal('price', { precision: 12, scale: 4 }).notNull(),
  volume: integer('volume').default(0),
  oi: integer('oi').default(0), // Open Interest
  changeOi: integer('change_oi').default(0),
  bid: decimal('bid', { precision: 12, scale: 4 }),
  ask: decimal('ask', { precision: 12, scale: 4 }),
  change: decimal('change', { precision: 12, scale: 4 }).default('0'),
  changePercent: decimal('change_percent', { precision: 8, scale: 4 }).default('0'),
  high: decimal('high', { precision: 12, scale: 4 }),
  low: decimal('low', { precision: 12, scale: 4 }),
  dataSource: varchar('data_source', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  symbolTimestampIdx: index('live_snapshots_symbol_timestamp_idx').on(table.symbolId, table.timestamp),
  timestampIdx: index('live_snapshots_timestamp_idx').on(table.timestamp),
  symbolFk: foreignKey({ columns: [table.symbolId], foreignColumns: [symbols.id] })
}));

export const historicalCandleData = pgTable('historical_candle_data', {
  id: serial('id').primaryKey(),
  symbolId: integer('symbol_id').notNull(),
  timeframe: varchar('timeframe', { length: 10 }).notNull(), // 1min, 5min, 15min, 1hr, 1d
  timestamp: timestamp('timestamp').notNull(),
  open: decimal('open', { precision: 12, scale: 4 }).notNull(),
  high: decimal('high', { precision: 12, scale: 4 }).notNull(),
  low: decimal('low', { precision: 12, scale: 4 }).notNull(),
  close: decimal('close', { precision: 12, scale: 4 }).notNull(),
  volume: integer('volume').default(0),
  dataSource: varchar('data_source', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  symbolTimeframeTimestampIdx: uniqueIndex('candle_symbol_timeframe_timestamp_idx').on(table.symbolId, table.timeframe, table.timestamp),
  timestampIdx: index('candle_timestamp_idx').on(table.timestamp),
  symbolFk: foreignKey({ columns: [table.symbolId], foreignColumns: [symbols.id] })
}));

export const historicalOptionChain = pgTable('historical_option_chain', {
  id: serial('id').primaryKey(),
  symbolId: integer('symbol_id').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  expiryDate: timestamp('expiry_date').notNull(),
  strikePrice: decimal('strike_price', { precision: 12, scale: 2 }).notNull(),
  optionType: varchar('option_type', { length: 2 }).notNull(), // CE, PE
  ltp: decimal('ltp', { precision: 12, scale: 4 }).notNull(),
  oiChange: integer('oi_change').default(0),
  volume: integer('volume').default(0),
  openInterest: integer('open_interest').default(0),
  impliedVolatility: decimal('implied_volatility', { precision: 8, scale: 4 }),
  delta: decimal('delta', { precision: 8, scale: 4 }),
  gamma: decimal('gamma', { precision: 8, scale: 4 }),
  theta: decimal('theta', { precision: 8, scale: 4 }),
  vega: decimal('vega', { precision: 8, scale: 4 }),
  dataSource: varchar('data_source', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  symbolExpiryStrikeTypeIdx: index('option_chain_symbol_expiry_strike_type_idx').on(table.symbolId, table.expiryDate, table.strikePrice, table.optionType),
  timestampIdx: index('option_chain_timestamp_idx').on(table.timestamp),
  symbolFk: foreignKey({ columns: [table.symbolId], foreignColumns: [symbols.id] })
}));

// ===========================
// STRATEGY & ANALYSIS TABLES
// ===========================

export const strategies = pgTable('strategies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // BULLISH, BEARISH, NEUTRAL, SCALPING, SWING
  symbolId: integer('symbol_id'),
  isActive: boolean('is_active').default(true),
  config: text('config'), // JSON strategy configuration
  performance: text('performance'), // JSON performance metrics
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdx: index('strategies_user_idx').on(table.userId),
  typeIdx: index('strategies_type_idx').on(table.type),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  symbolFk: foreignKey({ columns: [table.symbolId], foreignColumns: [symbols.id] })
}));

export const strategyConditions = pgTable('strategy_conditions', {
  id: serial('id').primaryKey(),
  strategyId: integer('strategy_id').notNull(),
  conditionType: varchar('condition_type', { length: 50 }).notNull(), // ENTRY, EXIT, STOP_LOSS, TARGET
  field: varchar('field', { length: 50 }).notNull(), // price, volume, rsi, macd, etc.
  operator: varchar('operator', { length: 10 }).notNull(), // >, <, =, >=, <=, CROSS_ABOVE, CROSS_BELOW
  value: decimal('value', { precision: 12, scale: 4 }).notNull(),
  logicalOperator: varchar('logical_operator', { length: 10 }), // AND, OR
  priority: integer('priority').default(1),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  strategyIdx: index('strategy_conditions_strategy_idx').on(table.strategyId),
  strategyFk: foreignKey({ columns: [table.strategyId], foreignColumns: [strategies.id] })
}));

export const strategyAlerts = pgTable('strategy_alerts', {
  id: serial('id').primaryKey(),
  strategyId: integer('strategy_id').notNull(),
  userId: integer('user_id').notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(), // ENTRY_SIGNAL, EXIT_SIGNAL, STOP_LOSS, TARGET_HIT
  message: text('message').notNull(),
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high, critical
  status: varchar('status', { length: 20 }).default('pending'), // pending, sent, failed
  triggerPrice: decimal('trigger_price', { precision: 12, scale: 4 }),
  triggeredAt: timestamp('triggered_at').defaultNow(),
  sentAt: timestamp('sent_at'),
  metadata: text('metadata'), // JSON additional data
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  strategyIdx: index('strategy_alerts_strategy_idx').on(table.strategyId),
  userIdx: index('strategy_alerts_user_idx').on(table.userId),
  statusIdx: index('strategy_alerts_status_idx').on(table.status),
  triggeredAtIdx: index('strategy_alerts_triggered_at_idx').on(table.triggeredAt),
  strategyFk: foreignKey({ columns: [table.strategyId], foreignColumns: [strategies.id] }),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] })
}));

export const backtestRuns = pgTable('backtest_runs', {
  id: serial('id').primaryKey(),
  strategyId: integer('strategy_id').notNull(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  initialCapital: decimal('initial_capital', { precision: 15, scale: 2 }).notNull(),
  finalCapital: decimal('final_capital', { precision: 15, scale: 2 }),
  totalPnl: decimal('total_pnl', { precision: 15, scale: 2 }),
  totalTrades: integer('total_trades').default(0),
  winningTrades: integer('winning_trades').default(0),
  maxDrawdown: decimal('max_drawdown', { precision: 8, scale: 4 }),
  sharpeRatio: decimal('sharpe_ratio', { precision: 8, scale: 4 }),
  status: varchar('status', { length: 20 }).default('pending'), // pending, running, completed, failed
  results: text('results'), // JSON detailed results
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at')
}, (table) => ({
  strategyIdx: index('backtest_runs_strategy_idx').on(table.strategyId),
  userIdx: index('backtest_runs_user_idx').on(table.userId),
  statusIdx: index('backtest_runs_status_idx').on(table.status),
  strategyFk: foreignKey({ columns: [table.strategyId], foreignColumns: [strategies.id] }),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] })
}));

export const patternDetections = pgTable('pattern_detections', {
  id: serial('id').primaryKey(),
  symbolId: integer('symbol_id').notNull(),
  patternType: varchar('pattern_type', { length: 50 }).notNull(), // HEAD_SHOULDERS, TRIANGLE, FLAG, WEDGE, etc.
  confidence: decimal('confidence', { precision: 5, scale: 2 }).notNull(), // 0-100%
  direction: varchar('direction', { length: 10 }).notNull(), // BULLISH, BEARISH, NEUTRAL
  timeframe: varchar('timeframe', { length: 10 }).notNull(),
  startPrice: decimal('start_price', { precision: 12, scale: 4 }),
  endPrice: decimal('end_price', { precision: 12, scale: 4 }),
  targetPrice: decimal('target_price', { precision: 12, scale: 4 }),
  stopLoss: decimal('stop_loss', { precision: 12, scale: 4 }),
  detectedAt: timestamp('detected_at').defaultNow(),
  validUntil: timestamp('valid_until'),
  status: varchar('status', { length: 20 }).default('active'), // active, completed, invalidated
  metadata: text('metadata'), // JSON pattern-specific data
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  symbolIdx: index('pattern_detections_symbol_idx').on(table.symbolId),
  patternTypeIdx: index('pattern_detections_pattern_type_idx').on(table.patternType),
  detectedAtIdx: index('pattern_detections_detected_at_idx').on(table.detectedAt),
  statusIdx: index('pattern_detections_status_idx').on(table.status),
  symbolFk: foreignKey({ columns: [table.symbolId], foreignColumns: [symbols.id] })
}));

// ===========================
// FUTURE-READY TRADING TABLES
// ===========================

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  strategyId: integer('strategy_id'),
  symbolId: integer('symbol_id').notNull(),
  orderType: varchar('order_type', { length: 20 }).notNull(), // BUY, SELL, STOP_LOSS, TARGET
  productType: varchar('product_type', { length: 20 }).notNull(), // MIS, CNC, NRML
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 12, scale: 4 }),
  triggerPrice: decimal('trigger_price', { precision: 12, scale: 4 }),
  status: varchar('status', { length: 20 }).default('pending'), // pending, placed, executed, cancelled, failed
  filledQuantity: integer('filled_quantity').default(0),
  averagePrice: decimal('average_price', { precision: 12, scale: 4 }),
  brokerOrderId: varchar('broker_order_id', { length: 100 }),
  broker: varchar('broker', { length: 50 }).default('angel-one'),
  exchange: varchar('exchange', { length: 10 }),
  remarks: text('remarks'),
  placedAt: timestamp('placed_at'),
  executedAt: timestamp('executed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdx: index('orders_user_idx').on(table.userId),
  strategyIdx: index('orders_strategy_idx').on(table.strategyId),
  symbolIdx: index('orders_symbol_idx').on(table.symbolId),
  statusIdx: index('orders_status_idx').on(table.status),
  brokerOrderIdx: index('orders_broker_order_idx').on(table.brokerOrderId),
  placedAtIdx: index('orders_placed_at_idx').on(table.placedAt),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  strategyFk: foreignKey({ columns: [table.strategyId], foreignColumns: [strategies.id] }),
  symbolFk: foreignKey({ columns: [table.symbolId], foreignColumns: [symbols.id] })
}));

export const orderAuditLog = pgTable('order_audit_log', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  userId: integer('user_id').notNull(),
  changeType: varchar('change_type', { length: 50 }).notNull(), // CREATED, UPDATED, CANCELLED, EXECUTED
  previousState: text('previous_state'), // JSON previous order state
  newState: text('new_state'), // JSON new order state
  remarks: text('remarks'),
  changedAt: timestamp('changed_at').defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent')
}, (table) => ({
  orderIdx: index('order_audit_order_idx').on(table.orderId),
  userIdx: index('order_audit_user_idx').on(table.userId),
  changedAtIdx: index('order_audit_changed_at_idx').on(table.changedAt),
  orderFk: foreignKey({ columns: [table.orderId], foreignColumns: [orders.id] }),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] })
}));

export const tradeExecutions = pgTable('trade_executions', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull(),
  userId: integer('user_id').notNull(),
  symbolId: integer('symbol_id').notNull(),
  executionTime: timestamp('execution_time').notNull(),
  executionPrice: decimal('execution_price', { precision: 12, scale: 4 }).notNull(),
  executedQuantity: integer('executed_quantity').notNull(),
  pnl: decimal('pnl', { precision: 15, scale: 2 }),
  fees: decimal('fees', { precision: 10, scale: 2 }).default('0'),
  taxes: decimal('taxes', { precision: 10, scale: 2 }).default('0'),
  brokerExecutionId: varchar('broker_execution_id', { length: 100 }),
  exchange: varchar('exchange', { length: 10 }),
  settlementDate: timestamp('settlement_date'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  orderIdx: index('trade_executions_order_idx').on(table.orderId),
  userIdx: index('trade_executions_user_idx').on(table.userId),
  symbolIdx: index('trade_executions_symbol_idx').on(table.symbolId),
  executionTimeIdx: index('trade_executions_execution_time_idx').on(table.executionTime),
  orderFk: foreignKey({ columns: [table.orderId], foreignColumns: [orders.id] }),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  symbolFk: foreignKey({ columns: [table.symbolId], foreignColumns: [symbols.id] })
}));

// ===========================
// SUBSCRIPTION & PAYMENT TABLES
// ===========================

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),
  billingCycle: varchar('billing_cycle', { length: 20 }).notNull(), // MONTHLY, QUARTERLY, YEARLY
  maxBacktests: integer('max_backtests').default(10),
  maxAlerts: integer('max_alerts').default(50),
  maxStrategies: integer('max_strategies').default(5),
  liveAccessEnabled: boolean('live_access_enabled').default(false),
  advancedFeaturesEnabled: boolean('advanced_features_enabled').default(false),
  apiAccessEnabled: boolean('api_access_enabled').default(false),
  features: text('features'), // JSON list of features
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  nameIdx: uniqueIndex('subscription_plans_name_idx').on(table.name),
  isActiveIdx: index('subscription_plans_is_active_idx').on(table.isActive)
}));

export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  planId: integer('plan_id').notNull(),
  status: varchar('status', { length: 20 }).default('active'), // active, cancelled, expired, suspended
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  autoRenew: boolean('auto_renew').default(true),
  currentUsage: text('current_usage'), // JSON usage statistics
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdx: index('user_subscriptions_user_idx').on(table.userId),
  planIdx: index('user_subscriptions_plan_idx').on(table.planId),
  statusIdx: index('user_subscriptions_status_idx').on(table.status),
  endDateIdx: index('user_subscriptions_end_date_idx').on(table.endDate),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  planFk: foreignKey({ columns: [table.planId], foreignColumns: [subscriptionPlans.id] })
}));

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  subscriptionId: integer('subscription_id'),
  transactionId: varchar('transaction_id', { length: 100 }).notNull().unique(),
  paymentGateway: varchar('payment_gateway', { length: 50 }).notNull(), // STRIPE, RAZORPAY, PAYTM
  gatewayTransactionId: varchar('gateway_transaction_id', { length: 100 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),
  status: varchar('status', { length: 20 }).default('pending'), // pending, completed, failed, refunded
  paymentMethod: varchar('payment_method', { length: 50 }), // card, upi, netbanking, wallet
  invoiceUrl: varchar('invoice_url', { length: 500 }),
  receiptUrl: varchar('receipt_url', { length: 500 }),
  failureReason: text('failure_reason'),
  paidAt: timestamp('paid_at'),
  refundedAt: timestamp('refunded_at'),
  metadata: text('metadata'), // JSON additional payment data
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdx: index('payments_user_idx').on(table.userId),
  subscriptionIdx: index('payments_subscription_idx').on(table.subscriptionId),
  statusIdx: index('payments_status_idx').on(table.status),
  transactionIdx: uniqueIndex('payments_transaction_idx').on(table.transactionId),
  paidAtIdx: index('payments_paid_at_idx').on(table.paidAt),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] }),
  subscriptionFk: foreignKey({ columns: [table.subscriptionId], foreignColumns: [userSubscriptions.id] })
}));

// ===========================
// USER ACTIVITY TABLES
// ===========================

export const userSavedScans = pgTable('user_saved_scans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  scanType: varchar('scan_type', { length: 50 }).notNull(), // TECHNICAL, FUNDAMENTAL, OPTIONS
  criteria: text('criteria').notNull(), // JSON scan criteria
  symbols: text('symbols'), // JSON array of symbols to scan
  isActive: boolean('is_active').default(true),
  lastRun: timestamp('last_run'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  userIdx: index('user_saved_scans_user_idx').on(table.userId),
  scanTypeIdx: index('user_saved_scans_scan_type_idx').on(table.scanType),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] })
}));

export const loginActivity = pgTable('login_activity', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  email: varchar('email', { length: 255 }),
  loginTime: timestamp('login_time').defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  location: varchar('location', { length: 100 }),
  device: varchar('device', { length: 50 }),
  success: boolean('success').default(true),
  failureReason: text('failure_reason'),
  sessionId: varchar('session_id', { length: 100 }),
  logoutTime: timestamp('logout_time')
}, (table) => ({
  userIdx: index('login_activity_user_idx').on(table.userId),
  emailIdx: index('login_activity_email_idx').on(table.email),
  loginTimeIdx: index('login_activity_login_time_idx').on(table.loginTime),
  ipAddressIdx: index('login_activity_ip_address_idx').on(table.ipAddress),
  userFk: foreignKey({ columns: [table.userId], foreignColumns: [users.id] })
}));

// ===========================
// INSERT/SELECT SCHEMAS FOR TYPE SAFETY
// ===========================

// Symbol schemas
export const insertSymbolSchema = createInsertSchema(symbols);
export const selectSymbolSchema = createSelectSchema(symbols);
export type InsertSymbol = z.infer<typeof insertSymbolSchema>;
export type SelectSymbol = z.infer<typeof selectSymbolSchema>;

// User schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;

// Data source schemas
export const insertDataSourceSchema = createInsertSchema(dataSources);
export const selectDataSourceSchema = createSelectSchema(dataSources);
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type SelectDataSource = z.infer<typeof selectDataSourceSchema>;

// Live market data schemas
export const insertLiveMarketSnapshotSchema = createInsertSchema(liveMarketSnapshots);
export const selectLiveMarketSnapshotSchema = createSelectSchema(liveMarketSnapshots);
export type InsertLiveMarketSnapshot = z.infer<typeof insertLiveMarketSnapshotSchema>;
export type SelectLiveMarketSnapshot = z.infer<typeof selectLiveMarketSnapshotSchema>;

// Historical data schemas
export const insertHistoricalCandleDataSchema = createInsertSchema(historicalCandleData);
export const selectHistoricalCandleDataSchema = createSelectSchema(historicalCandleData);
export type InsertHistoricalCandleData = z.infer<typeof insertHistoricalCandleDataSchema>;
export type SelectHistoricalCandleData = z.infer<typeof selectHistoricalCandleDataSchema>;

// Option chain schemas
export const insertHistoricalOptionChainSchema = createInsertSchema(historicalOptionChain);
export const selectHistoricalOptionChainSchema = createSelectSchema(historicalOptionChain);
export type InsertHistoricalOptionChain = z.infer<typeof insertHistoricalOptionChainSchema>;
export type SelectHistoricalOptionChain = z.infer<typeof selectHistoricalOptionChainSchema>;

// Strategy schemas
export const insertStrategySchema = createInsertSchema(strategies);
export const selectStrategySchema = createSelectSchema(strategies);
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type SelectStrategy = z.infer<typeof selectStrategySchema>;

// Pattern detection schemas
export const insertPatternDetectionSchema = createInsertSchema(patternDetections);
export const selectPatternDetectionSchema = createSelectSchema(patternDetections);
export type InsertPatternDetection = z.infer<typeof insertPatternDetectionSchema>;
export type SelectPatternDetection = z.infer<typeof selectPatternDetectionSchema>;

// Order schemas
export const insertOrderSchema = createInsertSchema(orders);
export const selectOrderSchema = createSelectSchema(orders);
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type SelectOrder = z.infer<typeof selectOrderSchema>;

// Order audit schemas
export const insertOrderAuditLogSchema = createInsertSchema(orderAuditLog);
export const selectOrderAuditLogSchema = createSelectSchema(orderAuditLog);
export type InsertOrderAuditLog = z.infer<typeof insertOrderAuditLogSchema>;
export type SelectOrderAuditLog = z.infer<typeof selectOrderAuditLogSchema>;

// Trade execution schemas
export const insertTradeExecutionSchema = createInsertSchema(tradeExecutions);
export const selectTradeExecutionSchema = createSelectSchema(tradeExecutions);
export type InsertTradeExecution = z.infer<typeof insertTradeExecutionSchema>;
export type SelectTradeExecution = z.infer<typeof selectTradeExecutionSchema>;

// Subscription plan schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const selectSubscriptionPlanSchema = createSelectSchema(subscriptionPlans);
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SelectSubscriptionPlan = z.infer<typeof selectSubscriptionPlanSchema>;

// Payment schemas
export const insertPaymentSchema = createInsertSchema(payments);
export const selectPaymentSchema = createSelectSchema(payments);
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type SelectPayment = z.infer<typeof selectPaymentSchema>;