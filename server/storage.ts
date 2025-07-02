import { users, instruments, optionData, marketSignals, userAlerts, subscriptionPlans, userSubscriptions, serviceProviders, serviceProviderProfiles, featurePermissions, userBrokerCredentials, type User, type InsertUser, type Instrument, type InsertInstrument, type OptionData, type InsertOptionData, type MarketSignal, type InsertMarketSignal, type UserAlert, type InsertUserAlert, type SubscriptionPlan, type InsertSubscriptionPlan, type UserSubscription, type InsertUserSubscription, type ServiceProvider, type InsertServiceProvider, type ServiceProviderProfile, type InsertServiceProviderProfile, type FeaturePermission, type InsertFeaturePermission } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;
  
  // Instrument methods
  getInstruments(): Promise<Instrument[]>;
  getInstrument(id: number): Promise<Instrument | undefined>;
  getInstrumentBySymbol(symbol: string): Promise<Instrument | undefined>;
  createInstrument(instrument: InsertInstrument): Promise<Instrument>;
  updateInstrumentPrice(symbol: string, price: string): Promise<void>;
  
  // Option data methods
  getOptionData(instrumentId: number): Promise<OptionData[]>;
  insertOptionData(data: InsertOptionData): Promise<OptionData>;
  
  // Market signals methods
  getRecentSignals(limit?: number): Promise<MarketSignal[]>;
  insertSignal(signal: InsertMarketSignal): Promise<MarketSignal>;
  
  // User alerts methods
  getUserAlerts(userId: number): Promise<UserAlert[]>;
  createUserAlert(alert: InsertUserAlert): Promise<UserAlert>;
  
  // Subscription methods
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: number, updates: Partial<UserSubscription>): Promise<UserSubscription>;
  
  // Service provider methods
  getServiceProviders(): Promise<ServiceProvider[]>;
  getServiceProviderByName(name: string): Promise<ServiceProvider | undefined>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  getServiceProviderProfiles(providerId: number): Promise<ServiceProviderProfile[]>;
  createServiceProviderProfile(profile: InsertServiceProviderProfile): Promise<ServiceProviderProfile>;
  
  // User broker credentials methods
  saveUserBrokerCredentials(credentials: any): Promise<void>;
  getUserBrokerCredentials(userId: number, brokerType: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        role: "USER",
        status: "ACTIVE",
        emailVerified: false,
        twoFactorEnabled: false,
      })
      .returning();
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getInstruments(): Promise<Instrument[]> {
    return await db.select().from(instruments).where(eq(instruments.isActive, true));
  }

  async getInstrument(id: number): Promise<Instrument | undefined> {
    const [instrument] = await db.select().from(instruments).where(eq(instruments.id, id));
    return instrument || undefined;
  }

  async getInstrumentBySymbol(symbol: string): Promise<Instrument | undefined> {
    const [instrument] = await db.select().from(instruments).where(eq(instruments.symbol, symbol));
    return instrument || undefined;
  }

  async createInstrument(insertInstrument: InsertInstrument): Promise<Instrument> {
    const [instrument] = await db
      .insert(instruments)
      .values(insertInstrument)
      .returning();
    return instrument;
  }

  async updateInstrumentPrice(symbol: string, price: string): Promise<void> {
    await db
      .update(instruments)
      .set({ underlyingPrice: price, updatedAt: new Date() })
      .where(eq(instruments.symbol, symbol));
  }

  async getOptionData(instrumentId: number): Promise<OptionData[]> {
    return await db
      .select()
      .from(optionData)
      .where(eq(optionData.instrumentId, instrumentId))
      .orderBy(desc(optionData.timestamp));
  }

  async insertOptionData(data: InsertOptionData): Promise<OptionData> {
    const [optionRecord] = await db
      .insert(optionData)
      .values(data)
      .returning();
    return optionRecord;
  }

  async getRecentSignals(limit: number = 20): Promise<MarketSignal[]> {
    return await db
      .select()
      .from(marketSignals)
      .where(eq(marketSignals.isActive, true))
      .orderBy(desc(marketSignals.createdAt))
      .limit(limit);
  }

  async insertSignal(signal: InsertMarketSignal): Promise<MarketSignal> {
    const [signalRecord] = await db
      .insert(marketSignals)
      .values(signal)
      .returning();
    return signalRecord;
  }

  async getUserAlerts(userId: number): Promise<UserAlert[]> {
    return await db
      .select()
      .from(userAlerts)
      .where(and(eq(userAlerts.userId, userId), eq(userAlerts.isActive, true)))
      .orderBy(desc(userAlerts.createdAt));
  }

  async createUserAlert(alert: InsertUserAlert): Promise<UserAlert> {
    const [alertRecord] = await db
      .insert(userAlerts)
      .values(alert)
      .returning();
    return alertRecord;
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [planRecord] = await db
      .insert(subscriptionPlans)
      .values(plan)
      .returning();
    return planRecord;
  }

  async getUserSubscription(userId: number): Promise<UserSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, "ACTIVE")
      ))
      .orderBy(desc(userSubscriptions.createdAt));
    return subscription || undefined;
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return plan || undefined;
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [subscriptionRecord] = await db
      .insert(userSubscriptions)
      .values(subscription)
      .returning();
    return subscriptionRecord;
  }

  async updateUserSubscription(id: number, updates: Partial<UserSubscription>): Promise<UserSubscription> {
    const [updated] = await db
      .update(userSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return updated;
  }

  async getServiceProviders(): Promise<ServiceProvider[]> {
    return await db
      .select()
      .from(serviceProviders)
      .where(eq(serviceProviders.isActive, true))
      .orderBy(serviceProviders.priority);
  }

  async getServiceProviderByName(name: string): Promise<ServiceProvider | undefined> {
    const [provider] = await db
      .select()
      .from(serviceProviders)
      .where(and(
        eq(serviceProviders.providerName, name),
        eq(serviceProviders.isActive, true)
      ));
    return provider || undefined;
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const [providerRecord] = await db
      .insert(serviceProviders)
      .values(provider)
      .returning();
    return providerRecord;
  }

  async getServiceProviderProfiles(providerId: number): Promise<ServiceProviderProfile[]> {
    return await db
      .select()
      .from(serviceProviderProfiles)
      .where(and(
        eq(serviceProviderProfiles.providerId, providerId),
        eq(serviceProviderProfiles.isActive, true)
      ))
      .orderBy(desc(serviceProviderProfiles.createdAt));
  }

  async createServiceProviderProfile(profile: InsertServiceProviderProfile): Promise<ServiceProviderProfile> {
    const [profileRecord] = await db
      .insert(serviceProviderProfiles)
      .values(profile)
      .returning();
    return profileRecord;
  }

  // User broker credentials methods
  async saveUserBrokerCredentials(credentials: any): Promise<void> {
    await db
      .insert(userBrokerCredentials)
      .values({
        userId: credentials.userId,
        brokerType: credentials.brokerType,
        clientId: credentials.clientId,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        pin: credentials.pin,
        totpKey: credentials.totpKey,
        isActive: credentials.isActive || true
      })
      .onConflictDoUpdate({
        target: [userBrokerCredentials.userId, userBrokerCredentials.brokerType],
        set: {
          clientId: credentials.clientId,
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          pin: credentials.pin,
          totpKey: credentials.totpKey,
          isActive: credentials.isActive || true,
          updatedAt: new Date()
        }
      });
  }

  async getUserBrokerCredentials(userId: number, brokerType: string): Promise<any> {
    const [credentials] = await db
      .select()
      .from(userBrokerCredentials)
      .where(and(
        eq(userBrokerCredentials.userId, userId),
        eq(userBrokerCredentials.brokerType, brokerType),
        eq(userBrokerCredentials.isActive, true)
      ));
    return credentials;
  }
}

export const storage = new DatabaseStorage();
