import { db } from './db';
import { sql } from 'drizzle-orm';

export class DatabaseCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Initialize the cleanup service with automated scheduling
   */
  async initialize(): Promise<void> {
    console.log('🧹 Initializing Database Cleanup Service...');
    
    // Run initial cleanup
    await this.performCleanup();
    
    // Schedule cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 60 * 60 * 1000); // 1 hour
    
    this.isRunning = true;
    console.log('✅ Database Cleanup Service initialized - running every hour');
  }

  /**
   * Perform comprehensive database cleanup
   */
  async performCleanup(): Promise<{
    realtime_deleted: number;
    intraday_deleted: number;
    price_deleted: number;
    total_deleted: number;
  }> {
    if (this.isRunning) {
      console.log('⏳ Cleanup already in progress, skipping...');
      return { realtime_deleted: 0, intraday_deleted: 0, price_deleted: 0, total_deleted: 0 };
    }

    this.isRunning = true;
    console.log('🧹 Starting database cleanup...');

    try {
      // Clean realtime data older than 48 hours using SQL
      const realtimeResult = await db.execute(sql`
        DELETE FROM realtime_data_snapshots 
        WHERE last_updated < NOW() - INTERVAL '48 hours'
      `);

      // Clean intraday OI data older than 7 days
      const intradayResult = await db.execute(sql`
        DELETE FROM intraday_option_oi 
        WHERE timestamp < NOW() - INTERVAL '7 days'
      `);

      // Clean price data older than 48 hours (keep recent for real-time analysis)
      const priceResult = await db.execute(sql`
        DELETE FROM price_data 
        WHERE timestamp < NOW() - INTERVAL '48 hours'
      `);

      const stats = {
        realtime_deleted: realtimeResult.rowCount || 0,
        intraday_deleted: intradayResult.rowCount || 0,
        price_deleted: priceResult.rowCount || 0,
        total_deleted: (realtimeResult.rowCount || 0) + (intradayResult.rowCount || 0) + (priceResult.rowCount || 0)
      };

      console.log(`✅ Cleanup completed:`, stats);
      return stats;

    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Refresh materialized views for performance
   */
  async refreshMaterializedViews(): Promise<void> {
    try {
      console.log('🔄 Refreshing materialized views...');
      
      // Refresh market overview materialized view
      await db.execute(`REFRESH MATERIALIZED VIEW market_overview`);
      
      console.log('✅ Materialized views refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh materialized views:', error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    realtime_count: number;
    intraday_count: number;
    price_count: number;
    last_cleanup: Date | null;
  }> {
    try {
      // Get table counts using SQL
      const realtimeResult = await db.execute(sql`SELECT COUNT(*) as count FROM realtime_data_snapshots`);
      const intradayResult = await db.execute(sql`SELECT COUNT(*) as count FROM intraday_option_oi`);
      const priceResult = await db.execute(sql`SELECT COUNT(*) as count FROM price_data`);

      return {
        realtime_count: Number(realtimeResult.rows[0]?.count || 0),
        intraday_count: Number(intradayResult.rows[0]?.count || 0),
        price_count: Number(priceResult.rows[0]?.count || 0),
        last_cleanup: new Date() // Would track this in a separate table in production
      };
    } catch (error) {
      console.error('❌ Failed to get cleanup stats:', error);
      throw error;
    }
  }

  /**
   * Manual cleanup trigger
   */
  async triggerManualCleanup(): Promise<any> {
    console.log('🔧 Manual cleanup triggered');
    return await this.performCleanup();
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Database Cleanup Service stopped');
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    hasScheduler: boolean;
    nextCleanup: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      hasScheduler: this.cleanupInterval !== null,
      nextCleanup: this.cleanupInterval ? new Date(Date.now() + 60 * 60 * 1000) : null
    };
  }
}

export const databaseCleanupService = new DatabaseCleanupService();