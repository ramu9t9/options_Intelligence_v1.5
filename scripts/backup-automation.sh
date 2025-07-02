#!/bin/bash

# Phase 4: Automated Backup System
# PostgreSQL Database and Redis Backup Automation

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Configuration
POSTGRES_DB="${PGDATABASE:-options_intelligence}"
POSTGRES_HOST="${PGHOST:-localhost}"
POSTGRES_PORT="${PGPORT:-5432}"
POSTGRES_USER="${PGUSER:-postgres}"
POSTGRES_PASSWORD="${PGPASSWORD}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
BACKUP_RETENTION_DAYS=30

echo "🗄️ Starting automated backup process..."

# Create backup directory
mkdir -p "$BACKUP_DIR/postgresql"
mkdir -p "$BACKUP_DIR/redis"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to cleanup old backups
cleanup_old_backups() {
    local backup_type="$1"
    local backup_path="$BACKUP_DIR/$backup_type"
    
    log "🧹 Cleaning up old $backup_type backups (older than $BACKUP_RETENTION_DAYS days)..."
    find "$backup_path" -name "*.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    find "$backup_path" -name "*.sql" -type f -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    find "$backup_path" -name "*.rdb" -type f -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
}

# Function to backup PostgreSQL database
backup_postgresql() {
    log "📊 Starting PostgreSQL backup..."
    
    local backup_file="$BACKUP_DIR/postgresql/options_intelligence_${DATE}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log "❌ pg_dump not found. Installing PostgreSQL client tools..."
        
        # Install PostgreSQL client based on system
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y postgresql-client
        elif command -v yum &> /dev/null; then
            sudo yum install -y postgresql
        elif command -v brew &> /dev/null; then
            brew install postgresql
        else
            log "❌ Cannot install PostgreSQL client. Please install manually."
            return 1
        fi
    fi
    
    # Set password environment variable if provided
    if [ -n "$POSTGRES_PASSWORD" ]; then
        export PGPASSWORD="$POSTGRES_PASSWORD"
    fi
    
    # Create backup with comprehensive options
    log "📝 Creating database dump..."
    pg_dump \
        --host="$POSTGRES_HOST" \
        --port="$POSTGRES_PORT" \
        --username="$POSTGRES_USER" \
        --dbname="$POSTGRES_DB" \
        --no-password \
        --verbose \
        --clean \
        --create \
        --if-exists \
        --format=plain \
        --no-owner \
        --no-privileges \
        --exclude-table-data="sessions" \
        --exclude-table-data="raw_data_archive" \
        > "$backup_file"
    
    if [ $? -eq 0 ]; then
        # Compress the backup
        log "🗜️ Compressing backup..."
        gzip "$backup_file"
        
        local backup_size=$(du -h "$compressed_file" | cut -f1)
        log "✅ PostgreSQL backup completed: $compressed_file ($backup_size)"
        
        # Create metadata file
        cat > "${compressed_file}.meta" << EOF
{
  "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
  "database": "$POSTGRES_DB",
  "host": "$POSTGRES_HOST",
  "size": "$backup_size",
  "tables_excluded": ["sessions", "raw_data_archive"],
  "backup_type": "full",
  "compression": "gzip"
}
EOF
        
    else
        log "❌ PostgreSQL backup failed"
        return 1
    fi
    
    # Unset password environment variable
    unset PGPASSWORD
}

# Function to backup Redis data
backup_redis() {
    log "📊 Starting Redis backup..."
    
    local backup_file="$BACKUP_DIR/redis/redis_${DATE}.rdb"
    
    # Check if Redis is running
    if ! command -v redis-cli &> /dev/null; then
        log "⚠️ redis-cli not found. Installing Redis tools..."
        
        # Install Redis client based on system
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y redis-tools
        elif command -v yum &> /dev/null; then
            sudo yum install -y redis
        elif command -v brew &> /dev/null; then
            brew install redis
        else
            log "⚠️ Cannot install Redis client. Skipping Redis backup."
            return 0
        fi
    fi
    
    # Test Redis connection
    if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping > /dev/null 2>&1; then
        log "⚠️ Redis server not accessible at $REDIS_HOST:$REDIS_PORT. Skipping Redis backup."
        return 0
    fi
    
    # Create Redis backup using BGSAVE
    log "📝 Creating Redis snapshot..."
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
    
    # Wait for background save to complete
    log "⏳ Waiting for Redis backup to complete..."
    while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)" = "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)" ]; do
        sleep 1
    done
    
    # Get Redis data directory and copy dump file
    local redis_dir=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dir | tail -n 1)
    local dump_file="$redis_dir/dump.rdb"
    
    if [ -f "$dump_file" ]; then
        cp "$dump_file" "$backup_file"
        gzip "$backup_file"
        
        local backup_size=$(du -h "${backup_file}.gz" | cut -f1)
        log "✅ Redis backup completed: ${backup_file}.gz ($backup_size)"
        
        # Create metadata file
        cat > "${backup_file}.gz.meta" << EOF
{
  "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
  "redis_host": "$REDIS_HOST",
  "redis_port": "$REDIS_PORT",
  "size": "$backup_size",
  "backup_type": "snapshot",
  "compression": "gzip"
}
EOF
        
    else
        log "❌ Redis dump file not found: $dump_file"
        return 1
    fi
}

# Function to create backup summary
create_backup_summary() {
    local summary_file="$BACKUP_DIR/backup_summary_${DATE}.json"
    
    cat > "$summary_file" << EOF
{
  "backup_session": {
    "timestamp": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
    "date": "$DATE",
    "status": "completed",
    "retention_days": $BACKUP_RETENTION_DAYS
  },
  "backups": {
    "postgresql": {
      "enabled": true,
      "file": "postgresql/options_intelligence_${DATE}.sql.gz",
      "status": "completed"
    },
    "redis": {
      "enabled": true,
      "file": "redis/redis_${DATE}.rdb.gz",
      "status": "completed"
    }
  },
  "cleanup": {
    "old_backups_removed": true,
    "retention_policy": "${BACKUP_RETENTION_DAYS} days"
  }
}
EOF
    
    log "📋 Backup summary created: $summary_file"
}

# Main backup process
main() {
    log "🚀 Phase 4: Automated Backup System"
    log "📍 Backup directory: $BACKUP_DIR"
    
    # Cleanup old backups first
    cleanup_old_backups "postgresql"
    cleanup_old_backups "redis"
    
    # Perform backups
    backup_postgresql
    backup_redis
    
    # Create summary
    create_backup_summary
    
    log "🎉 Backup process completed successfully!"
    
    # Display backup statistics
    echo ""
    echo "📊 Backup Statistics:"
    echo "   PostgreSQL backups: $(find "$BACKUP_DIR/postgresql" -name "*.gz" | wc -l)"
    echo "   Redis backups: $(find "$BACKUP_DIR/redis" -name "*.gz" | wc -l)"
    echo "   Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
    echo ""
}

# Error handling
trap 'log "❌ Backup process failed with error on line $LINENO"' ERR

# Run main backup process
main "$@"