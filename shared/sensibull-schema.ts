import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, date, index, unique, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ================================
// MASTER DATA TABLES (Sensibull Style)
// ================================

// Symbols table - Core F&O instruments with normalized structure
export const symbols = pgTable("symbols", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // NIFTY, BANKNIFTY, RELIANCE, etc.
  type: text("type", { enum: ["INDEX", "STOCK", "COMMODITY", "CURRENCY"] }).notNull(),
  expiry: timestamp("expiry"), // For F&O instruments
  strike: decimal("strike", { precision: 10, scale: 2 }), // For options
  optionType: text("option_type", { enum: ["CE", "PE"] }), // Call/Put
  underlyingSymbol: text("underlying_symbol"), // For derivatives
  tickSize: decimal("tick_size", { precision: 10, scale: 2 }).default("0.05"),
  lotSize: integer("lot_size").default(25),
  isActive: boolean("is_active").notNull().default(true),
  exchange: text("exchange", { enum: ["NSE", "BSE", "MCX", "NCDEX"] }).notNull().default("NSE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  nameIdx: index("symbols_name_idx").on(table.name),
  typeIdx: index("symbols_type_idx").on(table.type),
  expiryIdx: index("symbols_expiry_idx").on(table.expiry),
  underlyingIdx: index("symbols_underlying_idx").on(table.underlyingSymbol),
  uniqueSymbol: unique("symbols_unique").on(table.name, table.expiry, table.strike, table.optionType),
}));

// Users table - Enhanced with subscription plans
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["Admin", "Retail", "Institutional"] }).notNull().default("Retail"),
  plan: text("plan", { enum: ["Free", "Pro", "Enterprise"] }).notNull().default("Free"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ================================
// MARKET DATA TABLES (High Performance)
// ================================

// LiveMarketSnapshots - Updated every 5 seconds
export const liveMarketSnapshots = pgTable("live_market_snapshots", {
  id: serial("id").primaryKey(),
  symbolId: integer("symbol_id").notNull().references(() => symbols.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  volume: integer("volume").notNull().default(0),
  oi: integer("oi").notNull().default(0), // Open Interest
  iv: decimal("iv", { precision: 5, scale: 2 }), // Implied Volatility
  changeOi: integer("change_oi").notNull().default(0),
  bid: decimal("bid", { precision: 10, scale: 2 }),
  ask: decimal("ask", { precision: 10, scale: 2 }),
  change: decimal("change", { precision: 10, scale: 2 }).notNull().default("0"),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  dataSource: text("data_source", { enum: ["angel-one", "dhan", "nse", "yahoo", "mock"] }).notNull(),
}, (table) => ({
  symbolTimestampIdx: index("live_symbol_timestamp_idx").on(table.symbolId, table.timestamp),
  timestampIdx: index("live_timestamp_idx").on(table.timestamp),
  uniqueSnapshot: unique("live_unique_snapshot").on(table.symbolId, table.timestamp),
}));

// HistoricalCandleData - Multiple timeframes
export const historicalCandleData = pgTable("historical_candle_data", {
  id: serial("id").primaryKey(),
  symbolId: integer("symbol_id").notNull().references(() => symbols.id),
  timeframe: text("timeframe", { enum: ["1min", "5min", "15min", "1hr", "1d"] }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 10, scale: 2 }).notNull(),
  high: decimal("high", { precision: 10, scale: 2 }).notNull(),
  low: decimal("low", { precision: 10, scale: 2 }).notNull(),
  close: decimal("close", { precision: 10, scale: 2 }).notNull(),
  volume: integer("volume").notNull().default(0),
  dataSource: text("data_source", { enum: ["angel-one", "dhan", "nse", "yahoo", "mock"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  symbolTimeframeIdx: index("historical_symbol_timeframe_idx").on(table.symbolId, table.timeframe),
  timestampIdx: index("historical_timestamp_idx").on(table.timestamp),
  uniqueCandle: unique("historical_unique_candle").on(table.symbolId, table.timeframe, table.timestamp),
}));

// HistoricalOptionChain - Updated every 15 minutes & EOD
export const historicalOptionChain = pgTable("historical_option_chain", {
  id: serial("id").primaryKey(),
  symbolId: integer("symbol_id").notNull().references(() => symbols.id),
  timestamp: timestamp("timestamp").notNull(),
  ltp: decimal("ltp", { precision: 10, scale: 2 }).notNull(), // Last Traded Price
  iv: decimal("iv", { precision: 5, scale: 2 }), // Implied Volatility
  delta: decimal("delta", { precision: 5, scale: 4 }),
  gamma: decimal("gamma", { precision: 8, scale: 6 }),
  theta: decimal("theta", { precision: 8, scale: 6 }),
  vega: decimal("vega", { precision: 8, scale: 6 }),
  pcr: decimal("pcr", { precision: 5, scale: 2 }), // Put-Call Ratio
  oiChange: integer("oi_change").notNull().default(0),
  volume: integer("volume").notNull().default(0),
  openInterest: integer("open_interest").notNull().default(0),
  dataSource: text("data_source", { enum: ["angel-one", "dhan", "nse", "yahoo", "mock"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  symbolTimestampIdx: index("option_chain_symbol_timestamp_idx").on(table.symbolId, table.timestamp),
  timestampIdx: index("option_chain_timestamp_idx").on(table.timestamp),
}));

// ================================
// STRATEGY & ANALYSIS TABLES
// ================================

// Strategies - User-defined trading strategies
export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("strategies_user_idx").on(table.userId),
  nameIdx: index("strategies_name_idx").on(table.name),
}));

// StrategyConditions - Strategy rules (e.g., OI > 200 AND PCR > 1.2)
export const strategyConditions = pgTable("strategy_conditions", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull().references(() => strategies.id),
  parameter: text("parameter").notNull(), // 'oi', 'pcr', 'iv', 'price', etc.
  operator: text("operator", { enum: [">", "<", ">=", "<=", "=", "!="] }).notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  logicalOperator: text("logical_operator", { enum: ["AND", "OR"] }).default("AND"),
  order: integer("order").notNull().default(1), // Condition execution order
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  strategyIdx: index("strategy_conditions_strategy_idx").on(table.strategyId),
}));

// StrategyAlerts - Alert configurations
export const strategyAlerts = pgTable("strategy_alerts", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull().references(() => strategies.id),
  type: text("type", { enum: ["price", "oi", "volume", "pattern"] }).notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }).notNull(),
  channel: text("channel", { enum: ["email", "sms", "webhook", "push"] }).notNull().default("email"),
  priority: text("priority", { enum: ["high", "medium", "low"] }).notNull().default("medium"),
  isActive: boolean("is_active").notNull().default(true),
  triggered: boolean("triggered").notNull().default(false),
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  strategyIdx: index("strategy_alerts_strategy_idx").on(table.strategyId),
  priorityIdx: index("strategy_alerts_priority_idx").on(table.priority),
}));

// BacktestRuns - Backtesting results
export const backtestRuns = pgTable("backtest_runs", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull().references(() => strategies.id),
  fromDate: timestamp("from_date").notNull(),
  toDate: timestamp("to_date").notNull(),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).notNull().default("0"), // 0-100%
  pnl: decimal("pnl", { precision: 15, scale: 2 }).notNull().default("0"),
  drawdown: decimal("drawdown", { precision: 5, scale: 2 }).notNull().default("0"),
  totalTrades: integer("total_trades").notNull().default(0),
  winningTrades: integer("winning_trades").notNull().default(0),
  losingTrades: integer("losing_trades").notNull().default(0),
  avgWin: decimal("avg_win", { precision: 15, scale: 2 }).notNull().default("0"),
  avgLoss: decimal("avg_loss", { precision: 15, scale: 2 }).notNull().default("0"),
  sharpeRatio: decimal("sharpe_ratio", { precision: 6, scale: 3 }).notNull().default("0"),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull().default("running"),
  detailsJson: jsonb("details_json"), // Detailed backtest results
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  strategyIdx: index("backtest_runs_strategy_idx").on(table.strategyId),
  dateRangeIdx: index("backtest_runs_date_range_idx").on(table.fromDate, table.toDate),
}));

// PatternDetections - AI pattern detection
export const patternDetections = pgTable("pattern_detections", {
  id: serial("id").primaryKey(),
  symbolId: integer("symbol_id").notNull().references(() => symbols.id),
  patternName: text("pattern_name").notNull(), // 'bullish_engulfing', 'hammer', 'doji', etc.
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(), // 0-100%
  timeframe: text("timeframe", { enum: ["1min", "5min", "15min", "1hr", "1d"] }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  direction: text("direction", { enum: ["bullish", "bearish", "neutral"] }).notNull(),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }),
  stopLoss: decimal("stop_loss", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  symbolIdx: index("pattern_detections_symbol_idx").on(table.symbolId),
  timestampIdx: index("pattern_detections_timestamp_idx").on(table.timestamp),
  patternIdx: index("pattern_detections_pattern_idx").on(table.patternName),
}));

// ================================
// USER ACTIVITY TABLES
// ================================

// UserSavedScans - Saved scan configurations
export const userSavedScans = pgTable("user_saved_scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  conditions: jsonb("conditions").notNull(), // Scan criteria JSON
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("user_saved_scans_user_idx").on(table.userId),
}));

// LoginActivity - User login tracking
export const loginActivity = pgTable("login_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  location: text("location"),
  isSuccessful: boolean("is_successful").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("login_activity_user_idx").on(table.userId),
  timestampIdx: index("login_activity_timestamp_idx").on(table.timestamp),
}));

// ================================
// DATA SOURCE MANAGEMENT
// ================================

// DataSources - Fallback chain management
export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  name: text("name", { enum: ["angel-one", "dhan", "nse", "yahoo", "mock"] }).notNull().unique(),
  priority: integer("priority").notNull(), // 1=highest priority (Angel One), 5=lowest (Mock)
  isActive: boolean("is_active").notNull().default(true),
  lastSuccessfulFetch: timestamp("last_successful_fetch"),
  lastFailedFetch: timestamp("last_failed_fetch"),
  totalRequests: integer("total_requests").notNull().default(0),
  successfulRequests: integer("successful_requests").notNull().default(0),
  failedRequests: integer("failed_requests").notNull().default(0),
  avgResponseTime: decimal("avg_response_time", { precision: 8, scale: 2 }), // milliseconds
  rateLimit: integer("rate_limit").default(100), // requests per minute
  currentUsage: integer("current_usage").default(0),
  config: jsonb("config"), // Provider-specific configuration
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  priorityIdx: index("data_sources_priority_idx").on(table.priority),
  nameIdx: index("data_sources_name_idx").on(table.name),
}));

// ================================
// RELATIONSHIPS
// ================================

export const usersRelations = relations(users, ({ many }) => ({
  strategies: many(strategies),
  savedScans: many(userSavedScans),
  loginActivity: many(loginActivity),
}));

export const symbolsRelations = relations(symbols, ({ many }) => ({
  liveSnapshots: many(liveMarketSnapshots),
  historicalCandles: many(historicalCandleData),
  historicalOptionChain: many(historicalOptionChain),
  patternDetections: many(patternDetections),
}));

export const strategiesRelations = relations(strategies, ({ one, many }) => ({
  user: one(users, {
    fields: [strategies.userId],
    references: [users.id],
  }),
  conditions: many(strategyConditions),
  alerts: many(strategyAlerts),
  backtestRuns: many(backtestRuns),
}));

export const strategyConditionsRelations = relations(strategyConditions, ({ one }) => ({
  strategy: one(strategies, {
    fields: [strategyConditions.strategyId],
    references: [strategies.id],
  }),
}));

export const strategyAlertsRelations = relations(strategyAlerts, ({ one }) => ({
  strategy: one(strategies, {
    fields: [strategyAlerts.strategyId],
    references: [strategies.id],
  }),
}));

export const backtestRunsRelations = relations(backtestRuns, ({ one }) => ({
  strategy: one(strategies, {
    fields: [backtestRuns.strategyId],
    references: [strategies.id],
  }),
}));

export const liveMarketSnapshotsRelations = relations(liveMarketSnapshots, ({ one }) => ({
  symbol: one(symbols, {
    fields: [liveMarketSnapshots.symbolId],
    references: [symbols.id],
  }),
}));

export const historicalCandleDataRelations = relations(historicalCandleData, ({ one }) => ({
  symbol: one(symbols, {
    fields: [historicalCandleData.symbolId],
    references: [symbols.id],
  }),
}));

export const historicalOptionChainRelations = relations(historicalOptionChain, ({ one }) => ({
  symbol: one(symbols, {
    fields: [historicalOptionChain.symbolId],
    references: [symbols.id],
  }),
}));

export const patternDetectionsRelations = relations(patternDetections, ({ one }) => ({
  symbol: one(symbols, {
    fields: [patternDetections.symbolId],
    references: [symbols.id],
  }),
}));

export const userSavedScansRelations = relations(userSavedScans, ({ one }) => ({
  user: one(users, {
    fields: [userSavedScans.userId],
    references: [users.id],
  }),
}));

export const loginActivityRelations = relations(loginActivity, ({ one }) => ({
  user: one(users, {
    fields: [loginActivity.userId],
    references: [users.id],
  }),
}));

// ================================
// TYPE EXPORTS
// ================================

export type Symbol = typeof symbols.$inferSelect;
export type InsertSymbol = typeof symbols.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LiveMarketSnapshot = typeof liveMarketSnapshots.$inferSelect;
export type InsertLiveMarketSnapshot = typeof liveMarketSnapshots.$inferInsert;
export type HistoricalCandleData = typeof historicalCandleData.$inferSelect;
export type InsertHistoricalCandleData = typeof historicalCandleData.$inferInsert;
export type HistoricalOptionChain = typeof historicalOptionChain.$inferSelect;
export type InsertHistoricalOptionChain = typeof historicalOptionChain.$inferInsert;
export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = typeof strategies.$inferInsert;
export type StrategyCondition = typeof strategyConditions.$inferSelect;
export type InsertStrategyCondition = typeof strategyConditions.$inferInsert;
export type StrategyAlert = typeof strategyAlerts.$inferSelect;
export type InsertStrategyAlert = typeof strategyAlerts.$inferInsert;
export type BacktestRun = typeof backtestRuns.$inferSelect;
export type InsertBacktestRun = typeof backtestRuns.$inferInsert;
export type PatternDetection = typeof patternDetections.$inferSelect;
export type InsertPatternDetection = typeof patternDetections.$inferInsert;
export type UserSavedScan = typeof userSavedScans.$inferSelect;
export type InsertUserSavedScan = typeof userSavedScans.$inferInsert;
export type LoginActivity = typeof loginActivity.$inferSelect;
export type InsertLoginActivity = typeof loginActivity.$inferInsert;
export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = typeof dataSources.$inferInsert;

// ================================
// INSERT SCHEMAS
// ================================

export const insertSymbolSchema = createInsertSchema(symbols).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLiveMarketSnapshotSchema = createInsertSchema(liveMarketSnapshots).omit({
  id: true,
  timestamp: true,
});

export const insertHistoricalCandleDataSchema = createInsertSchema(historicalCandleData).omit({
  id: true,
  createdAt: true,
});

export const insertHistoricalOptionChainSchema = createInsertSchema(historicalOptionChain).omit({
  id: true,
  createdAt: true,
});

export const insertStrategySchema = createInsertSchema(strategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStrategyConditionSchema = createInsertSchema(strategyConditions).omit({
  id: true,
  createdAt: true,
});

export const insertStrategyAlertSchema = createInsertSchema(strategyAlerts).omit({
  id: true,
  createdAt: true,
});

export const insertBacktestRunSchema = createInsertSchema(backtestRuns).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertPatternDetectionSchema = createInsertSchema(patternDetections).omit({
  id: true,
  createdAt: true,
});

export const insertUserSavedScanSchema = createInsertSchema(userSavedScans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoginActivitySchema = createInsertSchema(loginActivity).omit({
  id: true,
  timestamp: true,
  createdAt: true,
});

export const insertDataSourceSchema = createInsertSchema(dataSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});