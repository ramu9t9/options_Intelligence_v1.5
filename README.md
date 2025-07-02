# Options Intelligence Platform - Sensibull Architecture

![Options Intelligence Platform](https://img.shields.io/badge/Options-Intelligence-blue) ![Sensibull Architecture](https://img.shields.io/badge/Architecture-Sensibull--Style-green) ![Real-time](https://img.shields.io/badge/Data-Real--time-orange)

A comprehensive **Options Trading Intelligence Platform** built with **Sensibull-style scalable architecture**, featuring real-time market data, pattern detection, and robust fallback mechanisms.

## 🏗️ Architecture Overview

### **Central Data Flow Logic**
```
Angel One (Primary) → Dhan → NSE → Yahoo → Mock Data (Fallback Chain)
       ↓                ↓      ↓       ↓         ↓
   Live Updates    Historical   Public   Backup   Demo
   (5 seconds)     (15 mins)    API      Data     Data
       ↓
   PostgreSQL Database (Optimized for Read-Heavy Operations)
       ↓
   Redis Cache (Live Data) + WebSocket (Real-time Streaming)
       ↓
   React Frontend (Real-time UI Updates)
```

### **Core Features**
- ✅ **Real-time Market Data** (5-second updates)
- ✅ **Option Chain Analysis** with live OI tracking
- ✅ **AI Pattern Detection** (Bullish/Bearish signals)
- ✅ **Strategy Builder** with custom conditions
- ✅ **Backtest Engine** for strategy validation
- ✅ **Admin Panel** with system monitoring
- ✅ **Multi-timeframe Charts** (1min to 1day)
- ✅ **WebSocket Streaming** for real-time updates
- ✅ **Fallback Architecture** for 99.9% uptime
- ✅ **Responsive Design** (Mobile + Desktop)

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- Redis (optional - falls back to in-memory)

### **1. Installation**
```bash
git clone <repository>
cd options_intelligence
npm install
```

### **2. Database Setup**
```bash
# Set your database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/options_db"

# Run migrations
npm run migrate
```

### **3. Development**
```bash
# Start development server
npm run dev

# Access application
open http://localhost:5000
```

### **4. Production Build**
```bash
# Build application
npm run build

# Start production server
npm start
```

---

## 📊 Database Schema (Sensibull Style)

### **Master Data Tables**
- **`symbols`** - F&O instruments (normalized structure)
- **`users`** - User management with subscription tiers
- **`data_sources`** - Fallback chain configuration

### **Market Data Tables**
- **`live_market_snapshots`** - 5-second live updates
- **`historical_candle_data`** - Multi-timeframe OHLCV
- **`historical_option_chain`** - 15-minute + EOD option data

### **Strategy & Analysis**
- **`strategies`** - User-defined trading strategies
- **`strategy_conditions`** - Granular strategy rules
- **`strategy_alerts`** - Alert configurations
- **`backtest_runs`** - Backtesting results
- **`pattern_detections`** - AI pattern detection results

### **User Activity**
- **`user_saved_scans`** - Saved scan configurations
- **`login_activity`** - User session tracking

---

## 🔌 API Endpoints

### **Live Market Data**
```http
GET /api/v2/live/:symbol              # Single symbol live data
GET /api/v2/live?symbols=NIFTY,BANKNIFTY  # Multiple symbols
```

### **Historical Data**
```http
GET /api/v2/historical/:symbol?timeframe=1d&from=2024-01-01&to=2024-01-02
```

### **Option Chain**
```http
GET /api/v2/optionchain/:symbol       # Historical option chain
GET /api/v2/optionchain/live/:symbol  # Live option chain
```

### **Pattern Detection**
```http
GET /api/v2/patterns?symbol=NIFTY     # Get pattern detections
POST /api/v2/patterns/detect          # Trigger pattern detection
```

### **Data Source Management**
```http
GET /api/v2/sources                   # Data source health
PUT /api/v2/sources/:sourceName       # Update source status
```

### **System Management**
```http
GET /api/v2/system/health             # System health status
POST /api/v2/system/cleanup           # Trigger data cleanup
```

---

## 🎯 Data Source Fallback Logic

| Priority | Source | Rate Limit | Use Case |
|----------|--------|------------|----------|
| **1** | Angel One | 200/min | Primary live data |
| **2** | Dhan | 150/min | Backup trading data |
| **3** | NSE | 100/min | Official market data |
| **4** | Yahoo Finance | 50/min | International backup |
| **5** | Mock Data | 1000/min | Demo & testing |

### **Automatic Failover**
- Real-time health monitoring
- Automatic source switching on failure
- Rate limit management
- Performance metrics tracking

---

## 🧠 AI Pattern Detection

### **Supported Patterns**
- **Bullish Engulfing** - Reversal signal detection
- **Bearish Engulfing** - Downtrend confirmation
- **Hammer/Doji** - Indecision patterns
- **Volume Surge** - Unusual activity detection
- **OI Build-up** - Interest accumulation

### **Pattern Confidence Scoring**
- **90-100%** - High confidence (strong signal)
- **70-89%** - Medium confidence (watch signal)
- **50-69%** - Low confidence (weak signal)

---

## ⚡ WebSocket Real-time Streaming

### **Connection**
```javascript
const socket = io('ws://localhost:5000');

// Subscribe to live data
socket.emit('subscribe', {
  symbols: ['NIFTY', 'BANKNIFTY'],
  type: 'live'
});

// Listen for updates
socket.on('liveData', (data) => {
  console.log('Live update:', data);
});
```

### **Events**
- **`liveData`** - 5-second market updates
- **`patternUpdate`** - New pattern detections
- **`alertTrigger`** - Strategy alert notifications

---

## 🔧 Configuration

### **Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Server
PORT=5000
NODE_ENV=production

# Data Sources (optional - for live data)
ANGEL_ONE_API_KEY=your_api_key
DHAN_API_KEY=your_api_key
```

### **Data Collection Settings**
- **Live Data**: Every 5 seconds
- **Historical Data**: Every 15 minutes
- **Pattern Detection**: On-demand + scheduled
- **Data Cleanup**: Daily (30+ day old data)

---

## 📱 Frontend Components

### **Core Components**
- **`SensibullOptionChain`** - Real-time option chain display
- **`SensibullDataSources`** - Data source health monitoring
- **`PatternDetection`** - AI pattern visualization
- **`StrategyBuilder`** - Custom strategy creation
- **`BacktestResults`** - Strategy performance analysis

### **Data Integration**
```javascript
import { sensibullDataService } from './services/SensibullDataService';

// Get live data
const liveData = await sensibullDataService.getLiveData('NIFTY');

// Subscribe to real-time updates
sensibullDataService.subscribeToLiveData(['NIFTY'], (data) => {
  updateUI(data);
});
```

---

## 🚀 Deployment

### **Production Deployment**
```bash
# Build for production
npm run build

# Deploy to server
npm start
```

### **Docker Deployment**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### **Health Checks**
- **`/health`** - Application health status
- **`/api/v2/system/health`** - Detailed system metrics

---

## 🧪 Testing

### **API Testing**
```bash
# Test live data endpoint
curl http://localhost:5000/api/v2/live/NIFTY

# Test option chain
curl http://localhost:5000/api/v2/optionchain/NIFTY

# Test pattern detection
curl -X POST http://localhost:5000/api/v2/patterns/detect
```

### **WebSocket Testing**
```bash
# Test WebSocket connection
wscat -c ws://localhost:5000
```

---

## 📈 Performance Optimizations

### **Database Optimizations**
- **Indexes** on `symbol_id`, `timestamp`, `priority`
- **Partitioning** for historical data tables
- **Connection pooling** (max 10 connections)
- **Read replicas** for analytics queries

### **Caching Strategy**
- **Redis** for live market data (5-second TTL)
- **In-memory** fallback when Redis unavailable
- **HTTP caching** for static API responses

### **WebSocket Optimization**
- **Room-based subscriptions** (symbol-specific)
- **Batch updates** for multiple symbols
- **Connection pooling** and auto-reconnection

---

## 🔒 Security Features

- **Rate limiting** per data source
- **Input validation** with Zod schemas
- **CORS configuration** for cross-origin requests
- **Error handling** without sensitive data exposure
- **Graceful shutdown** handling

---

## 🐛 Troubleshooting

### **Common Issues**

1. **Database Connection Failed**
   ```bash
   # Check DATABASE_URL format
   export DATABASE_URL="postgresql://user:pass@host:port/db"
   ```

2. **WebSocket Connection Issues**
   ```bash
   # Check firewall and port accessibility
   netstat -tlnp | grep 5000
   ```

3. **Data Source Failures**
   ```bash
   # Check data source health
   curl http://localhost:5000/api/v2/sources
   ```

### **Debugging**
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check server logs
tail -f logs/app.log
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

---

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Documentation**: [API Documentation](docs/api.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Built with ❤️ for the trading community**

*Transforming options trading with intelligent data and real-time insights.*