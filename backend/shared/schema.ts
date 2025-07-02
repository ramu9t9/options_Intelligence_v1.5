import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, date, index, unique, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role", { enum: ["USER", "ADMIN", "SUPER_ADMIN"] }).notNull().default("USER"),
  subscriptionTier: text("subscription_tier", { enum: ["FREE", "PRO", "VIP", "INSTITUTIONAL"] }).notNull().default("FREE"),
  status: text("status", { enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"] }).notNull().default("PENDING_VERIFICATION"),
  emailVerified: boolean("email_verified").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  maxStrategies: integer("max_strategies").notNull().default(3), // FREE: 3, PRO: 10, VIP: 25, INSTITUTIONAL: unlimited
  maxExecutionsPerDay: integer("max_executions_per_day").notNull().default(10), // Rate limiting for strategy execution
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Instruments table for tracking market instruments
export const instruments = pgTable("instruments", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  marketType: text("market_type", { enum: ["EQUITY", "COMMODITY", "CURRENCY", "INDEX"] }).notNull(),
  underlyingPrice: decimal("underlying_price", { precision: 10, scale: 2 }),
  expiryDate: timestamp("expiry_date"),
  contractSize: integer("contract_size").default(1),
  tickSize: decimal("tick_size", { precision: 10, scale: 2 }).default("0.01"),
  lotSize: integer("lot_size").default(1),
  marginPercentage: decimal("margin_percentage", { precision: 5, scale: 2 }).default("10.00"),
  marketOpenTime: text("market_open_time").default("09:15"),
  marketCloseTime: text("market_close_time").default("15:30"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Option data table for real-time option chain data
export const optionData = pgTable("option_data", {
  id: serial("id").primaryKey(),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  strikePrice: decimal("strike_price", { precision: 10, scale: 2 }).notNull(),
  optionType: text("option_type", { enum: ["CE", "PE"] }).notNull(),
  openInterest: integer("open_interest").notNull().default(0),
  oiChange: integer("oi_change").notNull().default(0),
  lastTradedPrice: decimal("last_traded_price", { precision: 10, scale: 2 }).notNull().default("0"),
  ltpChange: decimal("ltp_change", { precision: 10, scale: 2 }).notNull().default("0"),
  volume: integer("volume").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Market signals table for pattern detection results
export const marketSignals = pgTable("market_signals", {
  id: serial("id").primaryKey(),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  strikePrice: decimal("strike_price", { precision: 10, scale: 2 }).notNull(),
  signalType: text("signal_type").notNull(),
  direction: text("direction", { enum: ["BULLISH", "BEARISH"] }).notNull(),
  description: text("description").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User alerts table
export const userAlerts = pgTable("user_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  alertType: text("alert_type").notNull(),
  condition: text("condition").notNull(),
  targetValue: decimal("target_value", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  triggered: boolean("triggered").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle", { enum: ["MONTHLY", "YEARLY"] }).notNull(),
  features: text("features").array().notNull(),
  maxInstruments: integer("max_instruments").notNull().default(2),
  maxAlerts: integer("max_alerts").notNull().default(5),
  realTimeData: boolean("real_time_data").notNull().default(false),
  patternDetectionTypes: text("pattern_detection_types").array().notNull(),
  apiRateLimit: integer("api_rate_limit").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User strategies table - Strategy Builder MVP
export const userStrategies = pgTable("user_strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  rulesJson: text("rules_json").notNull(), // JSON array of strategy rules
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(false),
  backtestResults: text("backtest_results"), // JSON object with performance metrics
  lastExecuted: timestamp("last_executed"),
  totalExecutions: integer("total_executions").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Strategy execution logs table
export const strategyExecutionLogs = pgTable("strategy_execution_logs", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull().references(() => userStrategies.id),
  userId: integer("user_id").notNull().references(() => users.id),
  executionType: text("execution_type", { enum: ["MANUAL", "SCHEDULED", "BACKTEST"] }).notNull(),
  status: text("status", { enum: ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"] }).notNull(),
  resultsJson: text("results_json"), // JSON object with execution results
  matchedInstruments: text("matched_instruments").array(), // Array of matched instrument symbols
  executionTime: integer("execution_time"), // Execution time in milliseconds
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// NEW: Strategy Backtesting Results for Phase 5 Historical Tools
export const strategyBacktestResults = pgTable("strategy_backtest_results", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").notNull().references(() => userStrategies.id),
  userId: integer("user_id").notNull().references(() => users.id),
  backtestName: text("backtest_name").notNull(),
  symbol: text("symbol").notNull(), // NIFTY, BANKNIFTY, etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  timeframe: text("timeframe", { enum: ["1MIN", "5MIN", "15MIN", "1HOUR", "1DAY"] }).notNull(),
  
  // Performance Metrics
  totalEvaluations: integer("total_evaluations").notNull().default(0),
  matchesFound: integer("matches_found").notNull().default(0),
  successfulMatches: integer("successful_matches").notNull().default(0),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).notNull().default("0"), // 0-100%
  
  // Financial Metrics
  totalROI: decimal("total_roi", { precision: 8, scale: 2 }).notNull().default("0"), // Return on Investment %
  avgMovePostMatch: decimal("avg_move_post_match", { precision: 8, scale: 2 }).notNull().default("0"), // Avg % move after match
  maxDrawdown: decimal("max_drawdown", { precision: 8, scale: 2 }).notNull().default("0"), // Maximum loss %
  sharpeRatio: decimal("sharpe_ratio", { precision: 6, scale: 3 }).notNull().default("0"), // Risk-adjusted return
  
  // Execution Details
  executionTime: integer("execution_time").notNull(), // Total backtest runtime in ms
  dataPointsAnalyzed: integer("data_points_analyzed").notNull().default(0),
  matchDetails: jsonb("match_details"), // Detailed match information
  performanceChart: jsonb("performance_chart"), // Chart data points
  
  // Metadata
  status: text("status", { enum: ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"] }).notNull().default("RUNNING"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  strategyIdx: index("backtest_strategy_idx").on(table.strategyId),
  userIdx: index("backtest_user_idx").on(table.userId),
  symbolIdx: index("backtest_symbol_idx").on(table.symbol),
  dateRangeIdx: index("backtest_date_range_idx").on(table.startDate, table.endDate),
}));

// User subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: text("status", { enum: ["ACTIVE", "CANCELLED", "EXPIRED", "TRIAL"] }).notNull(),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Service providers table
export const serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  providerName: text("provider_name").notNull().unique(),
  apiKey: text("api_key"),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  baseUrl: text("base_url"),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Service provider profiles table  
export const serviceProviderProfiles = pgTable("service_provider_profiles", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  email: text("email"),
  phone: text("phone"),
  accountType: text("account_type"),
  profileData: text("profile_data"), // JSON string
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Feature permissions table
export const featurePermissions = pgTable("feature_permissions", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  featureName: text("feature_name").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  limitValue: integer("limit_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Broker credentials table for storing API configurations
export const brokerCredentials = pgTable("broker_credentials", {
  id: serial("id").primaryKey(),
  brokerType: text("broker_type").notNull().unique(), // 'angel-one', 'dhan', etc.
  clientId: text("client_id").notNull(),
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret").notNull(),
  pin: text("pin").notNull(),
  totp: text("totp"), // Optional TOTP key
  isActive: boolean("is_active").notNull().default(true),
  lastConnected: timestamp("last_connected"),
  connectionStatus: text("connection_status", { enum: ["CONNECTED", "DISCONNECTED", "ERROR"] }).default("DISCONNECTED"),
  userProfile: text("user_profile"), // JSON string of user profile data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Historical market data table for storing daily/intraday snapshots
export const historicalMarketData = pgTable("historical_market_data", {
  id: serial("id").primaryKey(),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  tradingDate: timestamp("trading_date").notNull(),
  openPrice: decimal("open_price", { precision: 10, scale: 2 }).notNull(),
  highPrice: decimal("high_price", { precision: 10, scale: 2 }).notNull(),
  lowPrice: decimal("low_price", { precision: 10, scale: 2 }).notNull(),
  closePrice: decimal("close_price", { precision: 10, scale: 2 }).notNull(),
  volume: integer("volume").notNull().default(0),
  openInterest: integer("open_interest").notNull().default(0),
  dataSource: text("data_source").notNull(), // 'angel-one', 'dhan', 'nse', etc.
  timeframe: text("timeframe", { enum: ["1MIN", "5MIN", "15MIN", "1HOUR", "1DAY"] }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Historical option chain data for storing daily OI changes
export const historicalOptionChain = pgTable("historical_option_chain", {
  id: serial("id").primaryKey(),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  tradingDate: timestamp("trading_date").notNull(),
  strikePrice: decimal("strike_price", { precision: 10, scale: 2 }).notNull(),
  optionType: text("option_type", { enum: ["CE", "PE"] }).notNull(),
  openInterest: integer("open_interest").notNull().default(0),
  oiChangeFromPrevDay: integer("oi_change_from_prev_day").notNull().default(0),
  lastTradedPrice: decimal("last_traded_price", { precision: 10, scale: 2 }).notNull().default("0"),
  impliedVolatility: decimal("implied_volatility", { precision: 5, scale: 2 }),
  volume: integer("volume").notNull().default(0),
  totalTradedValue: decimal("total_traded_value", { precision: 15, scale: 2 }),
  dataSource: text("data_source").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Real-time data snapshots for tracking current market state
export const realtimeDataSnapshots = pgTable("realtime_data_snapshots", {
  id: serial("id").primaryKey(),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  changeFromOpen: decimal("change_from_open", { precision: 10, scale: 2 }).notNull().default("0"),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  volume: integer("volume").notNull().default(0),
  marketSentiment: text("market_sentiment", { enum: ["BULLISH", "BEARISH", "NEUTRAL"] }),
  totalCallOI: integer("total_call_oi").notNull().default(0),
  totalPutOI: integer("total_put_oi").notNull().default(0),
  putCallRatio: decimal("put_call_ratio", { precision: 5, scale: 2 }),
  maxPainStrike: decimal("max_pain_strike", { precision: 10, scale: 2 }),
  dataSource: text("data_source").notNull(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Data source tracking for audit and reliability
export const dataSourceMetrics = pgTable("data_source_metrics", {
  id: serial("id").primaryKey(),
  sourceName: text("source_name").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  lastSuccessfulFetch: timestamp("last_successful_fetch"),
  lastFailedFetch: timestamp("last_failed_fetch"),
  totalRequests: integer("total_requests").notNull().default(0),
  successfulRequests: integer("successful_requests").notNull().default(0),
  failedRequests: integer("failed_requests").notNull().default(0),
  avgResponseTime: decimal("avg_response_time", { precision: 8, scale: 2 }),
  priority: integer("priority").notNull().default(1), // 1=highest, 5=lowest
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NEW: Dedicated daily EOD OI table (ChatGPT recommendation)
export const dailyOptionOI = pgTable("daily_option_oi", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  tradingDate: date("trading_date").notNull(),
  strike: decimal("strike", { precision: 10, scale: 2 }).notNull(),
  optionType: text("option_type", { enum: ["CE", "PE"] }).notNull(),
  openInterest: integer("open_interest").notNull().default(0),
  volume: integer("volume").notNull().default(0),
  lastPrice: decimal("last_price", { precision: 10, scale: 2 }).notNull().default("0"),
  impliedVolatility: decimal("implied_volatility", { precision: 5, scale: 2 }),
  delta: decimal("delta", { precision: 5, scale: 4 }),
  gamma: decimal("gamma", { precision: 8, scale: 6 }),
  theta: decimal("theta", { precision: 8, scale: 6 }),
  vega: decimal("vega", { precision: 8, scale: 6 }),
  dataSource: text("data_source").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueDaily: unique().on(table.symbol, table.tradingDate, table.strike, table.optionType),
  dateIdx: index("daily_oi_date_idx").on(table.tradingDate),
  symbolIdx: index("daily_oi_symbol_idx").on(table.symbol),
}));

// NEW: Intraday OI table for high-frequency updates (ChatGPT recommendation)
export const intradayOptionOI = pgTable("intraday_option_oi", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  strike: decimal("strike", { precision: 10, scale: 2 }).notNull(),
  optionType: text("option_type", { enum: ["CE", "PE"] }).notNull(),
  openInterest: integer("open_interest").notNull().default(0),
  oiChange: integer("oi_change").notNull().default(0),
  volume: integer("volume").notNull().default(0),
  lastPrice: decimal("last_price", { precision: 10, scale: 2 }).notNull().default("0"),
  priceChange: decimal("price_change", { precision: 10, scale: 2 }).notNull().default("0"),
  dataSource: text("data_source").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueIntraday: unique().on(table.symbol, table.timestamp, table.strike, table.optionType),
  timestampIdx: index("intraday_oi_timestamp_idx").on(table.timestamp),
  symbolIdx: index("intraday_oi_symbol_idx").on(table.symbol),
}));

// NEW: OI Delta logging for tracking changes (ChatGPT recommendation)
export const oiDeltaLog = pgTable("oi_delta_log", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  strike: decimal("strike", { precision: 10, scale: 2 }).notNull(),
  optionType: text("option_type", { enum: ["CE", "PE"] }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  oldOI: integer("old_oi").notNull().default(0),
  newOI: integer("new_oi").notNull().default(0),
  deltaOI: integer("delta_oi").notNull().default(0),
  percentChange: decimal("percent_change", { precision: 5, scale: 2 }),
  triggerReason: text("trigger_reason").notNull(), // 'scheduled', 'manual_refresh', 'alert_trigger'
  dataSource: text("data_source").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  timestampIdx: index("oi_delta_timestamp_idx").on(table.timestamp),
  symbolIdx: index("oi_delta_symbol_idx").on(table.symbol),
}));

// NEW: Price tick data for high-frequency price tracking (ChatGPT recommendation)
export const priceData = pgTable("price_data", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  volume: integer("volume").notNull().default(0),
  bid: decimal("bid", { precision: 10, scale: 2 }),
  ask: decimal("ask", { precision: 10, scale: 2 }),
  change: decimal("change", { precision: 10, scale: 2 }).notNull().default("0"),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  dataSource: text("data_source").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  timestampIdx: index("price_data_timestamp_idx").on(table.timestamp),
  symbolIdx: index("price_data_symbol_idx").on(table.symbol),
}));

// NEW: Support/Resistance levels table (ChatGPT recommendation)
export const supportResLevels = pgTable("support_res_levels", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  level: decimal("level", { precision: 10, scale: 2 }).notNull(),
  levelType: text("level_type", { enum: ["SUPPORT", "RESISTANCE"] }).notNull(),
  strength: integer("strength").notNull().default(1), // 1-5 strength rating
  timeframe: text("timeframe", { enum: ["1MIN", "5MIN", "15MIN", "1HOUR", "1DAY"] }).notNull(),
  touchCount: integer("touch_count").notNull().default(1),
  lastTouched: timestamp("last_touched").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull().default("0"), // 0-100
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  symbolIdx: index("support_res_symbol_idx").on(table.symbol),
  levelIdx: index("support_res_level_idx").on(table.level),
}));

// NEW: Raw data archive tracking table (ChatGPT recommendation)
export const rawDataArchive = pgTable("raw_data_archive", {
  id: serial("id").primaryKey(),
  archiveDate: date("archive_date").notNull(),
  symbol: text("symbol").notNull(),
  dataType: text("data_type", { enum: ["OPTION_CHAIN", "MARKET_DATA", "PRICE_TICK"] }).notNull(),
  filePath: text("file_path").notNull(), // S3/GCS path or local file path
  fileSize: integer("file_size").notNull().default(0),
  recordCount: integer("record_count").notNull().default(0),
  dataSource: text("data_source").notNull(),
  compressionType: text("compression_type").default("gzip"),
  checksum: text("checksum"), // File integrity check
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  dateIdx: index("raw_archive_date_idx").on(table.archiveDate),
  typeIdx: index("raw_archive_type_idx").on(table.dataType),
}));

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  alerts: many(userAlerts),
  subscriptions: many(userSubscriptions),
  strategies: many(userStrategies),
  strategyExecutions: many(strategyExecutionLogs),
}));

export const instrumentsRelations = relations(instruments, ({ many }) => ({
  optionData: many(optionData),
  signals: many(marketSignals),
  alerts: many(userAlerts),
}));

export const optionDataRelations = relations(optionData, ({ one }) => ({
  instrument: one(instruments, {
    fields: [optionData.instrumentId],
    references: [instruments.id],
  }),
}));

export const marketSignalsRelations = relations(marketSignals, ({ one }) => ({
  instrument: one(instruments, {
    fields: [marketSignals.instrumentId],
    references: [instruments.id],
  }),
}));

export const userAlertsRelations = relations(userAlerts, ({ one }) => ({
  user: one(users, {
    fields: [userAlerts.userId],
    references: [users.id],
  }),
  instrument: one(instruments, {
    fields: [userAlerts.instrumentId],
    references: [instruments.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(userSubscriptions),
  permissions: many(featurePermissions),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const serviceProvidersRelations = relations(serviceProviders, ({ many }) => ({
  profiles: many(serviceProviderProfiles),
}));

export const serviceProviderProfilesRelations = relations(serviceProviderProfiles, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [serviceProviderProfiles.providerId],
    references: [serviceProviders.id],
  }),
}));

export const userStrategiesRelations = relations(userStrategies, ({ one, many }) => ({
  user: one(users, {
    fields: [userStrategies.userId],
    references: [users.id],
  }),
  executionLogs: many(strategyExecutionLogs),
}));

export const strategyExecutionLogsRelations = relations(strategyExecutionLogs, ({ one }) => ({
  strategy: one(userStrategies, {
    fields: [strategyExecutionLogs.strategyId],
    references: [userStrategies.id],
  }),
  user: one(users, {
    fields: [strategyExecutionLogs.userId],
    references: [users.id],
  }),
}));

export const featurePermissionsRelations = relations(featurePermissions, ({ one }) => ({
  plan: one(subscriptionPlans, {
    fields: [featurePermissions.planId],
    references: [subscriptionPlans.id],
  }),
}));

// Type exports for new tables (ChatGPT recommendations)
export type DailyOptionOI = typeof dailyOptionOI.$inferSelect;
export type InsertDailyOptionOI = typeof dailyOptionOI.$inferInsert;
export type IntradayOptionOI = typeof intradayOptionOI.$inferSelect;
export type InsertIntradayOptionOI = typeof intradayOptionOI.$inferInsert;
export type OIDeltaLog = typeof oiDeltaLog.$inferSelect;
export type InsertOIDeltaLog = typeof oiDeltaLog.$inferInsert;
export type PriceData = typeof priceData.$inferSelect;
export type InsertPriceData = typeof priceData.$inferInsert;
export type SupportResLevels = typeof supportResLevels.$inferSelect;
export type InsertSupportResLevels = typeof supportResLevels.$inferInsert;
export type RawDataArchive = typeof rawDataArchive.$inferSelect;
export type InsertRawDataArchive = typeof rawDataArchive.$inferInsert;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
});

export const insertInstrumentSchema = createInsertSchema(instruments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptionDataSchema = createInsertSchema(optionData).omit({
  id: true,
  timestamp: true,
});

export const insertMarketSignalSchema = createInsertSchema(marketSignals).omit({
  id: true,
  createdAt: true,
});

export const insertUserAlertSchema = createInsertSchema(userAlerts).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceProviderProfileSchema = createInsertSchema(serviceProviderProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeaturePermissionSchema = createInsertSchema(featurePermissions).omit({
  id: true,
  createdAt: true,
});

export const insertBrokerCredentialsSchema = createInsertSchema(brokerCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Instrument = typeof instruments.$inferSelect;
export type InsertInstrument = z.infer<typeof insertInstrumentSchema>;

export type OptionData = typeof optionData.$inferSelect;
export type InsertOptionData = z.infer<typeof insertOptionDataSchema>;

export type MarketSignal = typeof marketSignals.$inferSelect;
export type InsertMarketSignal = z.infer<typeof insertMarketSignalSchema>;

export type UserAlert = typeof userAlerts.$inferSelect;
export type InsertUserAlert = z.infer<typeof insertUserAlertSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;

export type ServiceProviderProfile = typeof serviceProviderProfiles.$inferSelect;
export type InsertServiceProviderProfile = z.infer<typeof insertServiceProviderProfileSchema>;

export type FeaturePermission = typeof featurePermissions.$inferSelect;
export type InsertFeaturePermission = z.infer<typeof insertFeaturePermissionSchema>;

export type BrokerCredentials = typeof brokerCredentials.$inferSelect;
export type InsertBrokerCredentials = z.infer<typeof insertBrokerCredentialsSchema>;

// NEW: Market segment configuration for different asset classes
export const marketSegments = pgTable("market_segments", {
  id: serial("id").primaryKey(),
  segmentType: text("segment_type", { enum: ["EQUITY", "COMMODITY", "CURRENCY"] }).notNull().unique(),
  marketOpenTime: text("market_open_time").notNull(),
  marketCloseTime: text("market_close_time").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  dataCollectionInterval: integer("data_collection_interval").notNull().default(3), // seconds
  maxStrikes: integer("max_strikes").notNull().default(11),
  isActive: boolean("is_active").notNull().default(true),
  extendedHours: boolean("extended_hours").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NEW: Commodity-specific instrument configurations
export const commodityInstruments = pgTable("commodity_instruments", {
  id: serial("id").primaryKey(),
  instrumentId: integer("instrument_id").notNull().references(() => instruments.id),
  contractSize: integer("contract_size").notNull().default(1),
  tickSize: decimal("tick_size", { precision: 10, scale: 2 }).notNull().default("0.01"),
  lotSize: integer("lot_size").notNull().default(1),
  strikeInterval: decimal("strike_interval", { precision: 10, scale: 2 }).notNull().default("50"),
  marginPercentage: decimal("margin_percentage", { precision: 5, scale: 2 }).notNull().default("10.00"),
  deliveryUnit: text("delivery_unit").default("BARREL"), // BARREL, TROY_OUNCE, MMBtu, etc.
  qualitySpecs: text("quality_specs"), // JSON string for commodity specifications
  storageLocation: text("storage_location"),
  isPhysicalDelivery: boolean("is_physical_delivery").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// NEW: Market session tracking for different segments
export const marketSessions = pgTable("market_sessions", {
  id: serial("id").primaryKey(),
  segmentType: text("segment_type", { enum: ["EQUITY", "COMMODITY", "CURRENCY"] }).notNull(),
  sessionDate: date("session_date").notNull(),
  actualOpenTime: timestamp("actual_open_time"),
  actualCloseTime: timestamp("actual_close_time"),
  scheduledOpenTime: timestamp("scheduled_open_time").notNull(),
  scheduledCloseTime: timestamp("scheduled_close_time").notNull(),
  sessionStatus: text("session_status", { enum: ["SCHEDULED", "OPEN", "CLOSED", "HOLIDAY", "EMERGENCY_CLOSURE"] }).notNull().default("SCHEDULED"),
  totalVolume: integer("total_volume").default(0),
  totalTurnover: decimal("total_turnover", { precision: 15, scale: 2 }).default("0"),
  activeInstruments: integer("active_instruments").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  sessionDateIdx: index("market_sessions_date_idx").on(table.sessionDate),
  segmentTypeIdx: index("market_sessions_segment_idx").on(table.segmentType),
  uniqueSession: unique().on(table.segmentType, table.sessionDate),
}));

// Relations for new tables
export const marketSegmentsRelations = relations(marketSegments, ({ many }) => ({
  sessions: many(marketSessions),
}));

export const commodityInstrumentsRelations = relations(commodityInstruments, ({ one }) => ({
  instrument: one(instruments, {
    fields: [commodityInstruments.instrumentId],
    references: [instruments.id],
  }),
}));

export const marketSessionsRelations = relations(marketSessions, ({ one }) => ({
  segment: one(marketSegments, {
    fields: [marketSessions.segmentType],
    references: [marketSegments.segmentType],
  }),
}));

// Type exports for new commodity tables
export type MarketSegment = typeof marketSegments.$inferSelect;
export type InsertMarketSegment = typeof marketSegments.$inferInsert;
export type CommodityInstrument = typeof commodityInstruments.$inferSelect;
export type InsertCommodityInstrument = typeof commodityInstruments.$inferInsert;
export type MarketSession = typeof marketSessions.$inferSelect;
export type InsertMarketSession = typeof marketSessions.$inferInsert;

// Insert schemas for new tables
export const insertMarketSegmentSchema = createInsertSchema(marketSegments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommodityInstrumentSchema = createInsertSchema(commodityInstruments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMarketSessionSchema = createInsertSchema(marketSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Strategy Builder Schemas
export const insertUserStrategySchema = createInsertSchema(userStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastExecuted: true,
  totalExecutions: true,
});

export const insertStrategyExecutionLogSchema = createInsertSchema(strategyExecutionLogs).omit({
  id: true,
  createdAt: true,
  executionTime: true,
});

// Strategy Builder Types
export type UserStrategy = typeof userStrategies.$inferSelect;
export type InsertUserStrategy = z.infer<typeof insertUserStrategySchema>;
export type StrategyExecutionLog = typeof strategyExecutionLogs.$inferSelect;
export type InsertStrategyExecutionLog = z.infer<typeof insertStrategyExecutionLogSchema>;

// Phase 5: Backtesting Types
export type StrategyBacktestResult = typeof strategyBacktestResults.$inferSelect;
export type InsertStrategyBacktestResult = typeof strategyBacktestResults.$inferInsert;

// Strategy Rule JSON Schema
export const strategyRuleSchema = z.object({
  field: z.enum(["OI", "OI_CHANGE", "LTP", "VOLUME", "PCR", "IV", "DELTA", "GAMMA", "THETA", "VEGA"]),
  operator: z.enum([">", "<", ">=", "<=", "==", "!="]),
  value: z.number(),
  logicalOperator: z.enum(["AND", "OR"]).optional(),
});

export const strategyRulesSchema = z.object({
  rules: z.array(strategyRuleSchema).min(1).max(10),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export type StrategyRule = z.infer<typeof strategyRuleSchema>;
export type StrategyRules = z.infer<typeof strategyRulesSchema>;
