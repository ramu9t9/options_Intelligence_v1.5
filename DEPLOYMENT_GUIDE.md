# Options Intelligence Platform - Deployment Guide

## Overview

This guide covers the deployment of the Options Intelligence Platform using the new containerized architecture with separate frontend and backend services.

## Architecture

The platform is now organized into two main containers:

### Frontend (React + Vite)
- **Location**: `frontend/`
- **Port**: 3000 (development), 80 (production)
- **Technology**: React 18, Vite, Nginx (production)
- **Build**: Static files served by Nginx

### Backend (Node.js + Express)
- **Location**: `backend/`
- **Port**: 5000
- **Technology**: Node.js 18, Express, TypeScript
- **Services**: API endpoints, WebSocket, database operations

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (provided in docker-compose.yml)
- Redis cache (provided in docker-compose.yml)
- Environment variables configured

## Quick Start

### 1. Development Mode

```bash
# Clone the repository
git clone <repository-url>
cd options-intelligence-platform

# Start all services
docker-compose up --build

# Access the application
Frontend: http://localhost:3000
Backend API: http://localhost:5000
Prometheus: http://localhost:9090
Grafana: http://localhost:3000 (admin/admin)
```

### 2. Production Deployment

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build -d

# Access the application
Application: https://localhost (with SSL)
API Health: https://localhost/api/health
Metrics: https://localhost:9090
Grafana: https://localhost:3001 (admin/admin)
```

## Phase 4: Advanced Features Implemented

### HTTPS Support
Local HTTPS development environment setup:

```bash
# Run the HTTPS setup script
./scripts/setup-https.sh

# This will:
# 1. Install mkcert for local SSL certificates
# 2. Generate certificates for localhost and *.replit.app domains
# 3. Configure the server for HTTPS development
```

After setup, enable HTTPS in your `.env.development`:
```
ENABLE_HTTPS=true
HTTPS_PORT=5001
```

### Backup Automation
Automated backup system for PostgreSQL and Redis:

```bash
# Run the backup automation script
./scripts/backup-automation.sh

# Features:
# - Automated PostgreSQL database backups with compression
# - Redis snapshot backups
# - 30-day retention policy with automatic cleanup
# - Metadata logging for each backup session
# - Cross-platform compatibility (Linux, macOS)
```

Backup files are stored in:
- PostgreSQL: `backups/postgresql/`
- Redis: `backups/redis/`
- Summaries: `backups/backup_summary_*.json`

### Production Monitoring
The platform includes comprehensive monitoring:

#### Health Endpoints
- `/api/health` - Overall system health
- `/api/health/database` - PostgreSQL connection status
- `/api/health/redis` - Redis connection status  
- `/api/health/market-data` - Market data feed status

#### Metrics Collection
- `/api/metrics` - Prometheus-format metrics
- `/api/node-metrics` - Node.js runtime metrics
- Real-time system performance tracking
- Memory, CPU, and connection monitoring

#### Monitoring Stack
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboard visualization and monitoring
- **Built-in Health Checks**: Service status validation
- **Performance Tracking**: Real-time system metrics

### Enterprise Security
Production-ready security features:

#### SSL/TLS Configuration
- Local development HTTPS with mkcert
- Production SSL certificate support
- Secure cookie configuration
- HTTP to HTTPS redirects

#### Security Headers
- Helmet.js security middleware
- CORS protection
- Rate limiting per API endpoint
- Input validation and sanitization

#### Access Control
- Role-based authentication (USER, ADMIN, SUPER_ADMIN)
- API rate limiting (10 req/s default)
- WebSocket rate limiting (5 req/s)
- Audit logging for sensitive operations

### Backup and Recovery
Complete data protection system:

#### Automated Backups
```bash
# Daily automated backups via cron
0 2 * * * /path/to/scripts/backup-automation.sh

# Manual backup
./scripts/backup-automation.sh
```

#### Recovery Process
```bash
# Restore PostgreSQL backup
gunzip backups/postgresql/options_intelligence_YYYYMMDD_HHMMSS.sql.gz
psql -h localhost -U postgres -d options_intelligence < backup.sql

# Restore Redis backup
redis-cli FLUSHALL
redis-cli --rdb backups/redis/redis_YYYYMMDD_HHMMSS.rdb
```

#### Backup Features
- Compressed storage with gzip
- Metadata tracking for each backup
- Automatic old backup cleanup (30+ days)
- Cross-platform shell script compatibility
- Error handling with detailed logging

```bash
# Build and start production containers
docker-compose -f docker-compose.yml up -d --build

# Monitor logs
docker-compose logs -f
```

## Service Configuration

### PostgreSQL Database
- **Connection**: `postgresql://postgres:postgres@postgres:5432/options_intelligence`
- **Port**: 5432
- **Data**: Persisted in `postgres_data` volume

### Redis Cache
- **Connection**: `redis://redis:6379`
- **Port**: 6379
- **Data**: Persisted in `redis_data` volume

### Monitoring Stack
- **Prometheus**: Metrics collection on port 9090
- **Grafana**: Dashboard visualization on port 3000

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/options_intelligence
REDIS_URL=redis://redis:6379
PORT=5000

# API Keys (required for live data)
ANGEL_ONE_API_KEY=your_api_key
ANGEL_ONE_API_SECRET=your_api_secret
ANGEL_ONE_CLIENT_ID=your_client_id
ANGEL_ONE_PIN=your_pin
ANGEL_ONE_TOTP_SECRET=your_totp_secret

# Optional
SESSION_SECRET=your_session_secret
OPENAI_API_KEY=your_openai_key
```

## Health Checks

The deployment includes comprehensive health checks:

### Service Health Endpoints
- **Backend**: `GET /api/health`
- **Database**: `GET /api/health/database`
- **Redis**: `GET /api/health/redis`
- **Market Data**: `GET /api/health/market-data`

### Monitoring
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs frontend

# Check health
curl http://localhost:5000/api/health
```

## Scaling

### Horizontal Scaling
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale frontend instances (behind load balancer)
docker-compose up -d --scale frontend=2
```

### Load Balancing
The nginx configuration in the frontend container provides:
- Static file serving with caching
- API request proxying to backend
- WebSocket support
- Gzip compression

## Security

### Production Security Features
- **HTTPS**: SSL termination at nginx
- **Headers**: Security headers (HSTS, CSP, X-Frame-Options)
- **Rate Limiting**: API and WebSocket rate limits
- **Non-root**: Containers run as non-root users
- **Secrets**: Environment-based secret management

### SSL Configuration
```bash
# Add SSL certificates to nginx
cp your-cert.pem ./ssl/
cp your-key.pem ./ssl/

# Update nginx.conf for HTTPS
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres options_intelligence > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres options_intelligence < backup.sql
```

### Volume Backup
```bash
# Backup volumes
docker run --rm -v options_intelligence_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :5000
   
   # Change ports in docker-compose.yml
   ```

2. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   # Check container resource usage
   docker stats
   ```

3. **Database Connection**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec backend npm run db:push
   ```

### Log Analysis
```bash
# Follow all logs
docker-compose logs -f

# Service-specific logs
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

## Performance Optimization

### Production Optimizations
- **Redis Caching**: Sub-second response times
- **Static Assets**: 1-year browser caching
- **Gzip Compression**: Reduced bandwidth usage
- **Connection Pooling**: Database optimization
- **Load Balancing**: Multiple backend instances

### Monitoring Metrics
- **Response Times**: API endpoint performance
- **Memory Usage**: Container resource consumption
- **Cache Hit Rates**: Redis performance
- **Database Queries**: Query optimization
- **WebSocket Connections**: Real-time performance

## Support

For deployment issues:
1. Check health endpoints
2. Review service logs
3. Verify environment variables
4. Test database connectivity
5. Monitor resource usage

The platform is designed for high availability with automatic failover and graceful degradation when external services are unavailable.