# Options Intelligence Platform - Project Tree

Last Updated: June 30, 2025 at 8:52 AM

## Project Structure

```
Options Intelligence Platform/
├── client/                                    # React Frontend
│   ├── src/
│   │   ├── components/                        # UI Components
│   │   │   ├── ui/                           # shadcn/ui components
│   │   │   ├── Header.tsx                    # Navigation header
│   │   │   ├── OptionChain.tsx               # Live option chain display
│   │   │   ├── PatternAnalysis.tsx           # Pattern detection results
│   │   │   ├── MarketTypeSelector.tsx        # Market mode selection
│   │   │   └── AdminDashboard.tsx            # System administration
│   │   ├── context/                          # React Context Providers
│   │   │   ├── MarketDataContext.tsx         # Real-time market data state
│   │   │   └── AuthContext.tsx               # Authentication state
│   │   ├── hooks/                            # Custom React hooks
│   │   │   ├── useAuth.ts                    # Authentication logic
│   │   │   ├── useMarketData.ts              # Market data management
│   │   │   └── use-toast.ts                  # Toast notifications
│   │   ├── pages/                            # Page components
│   │   │   ├── Landing.tsx                   # Landing page for logged out users
│   │   │   ├── Home.tsx                      # Dashboard for logged in users
│   │   │   ├── SimpleDashboard.tsx           # Main trading interface
│   │   │   └── AdminPage.tsx                 # Admin management interface
│   │   ├── lib/                              # Utility libraries
│   │   │   ├── queryClient.ts                # TanStack Query configuration
│   │   │   ├── authUtils.ts                  # Authentication utilities
│   │   │   └── utils.ts                      # General utilities
│   │   ├── types/                            # TypeScript type definitions
│   │   │   ├── MarketTypes.ts                # Market data interfaces
│   │   │   └── AuthTypes.ts                  # Authentication interfaces
│   │   └── App.tsx                           # Main application component
│   └── index.html                            # HTML entry point
├── server/                                   # Express.js Backend
│   ├── index.ts                              # Server entry point
│   ├── routes.ts                             # API route definitions
│   ├── db.ts                                 # Database connection
│   ├── storage.ts                            # Data storage interface
│   ├── replitAuth.ts                         # Replit authentication
│   ├── aiInsightsEngine.ts                   # AI pattern detection
│   ├── alertSystem.ts                        # Alert management
│   ├── angelOneProvider.ts                   # Angel One API integration
│   ├── centralDataBroadcaster.ts             # Real-time data distribution
│   ├── dataPersistenceService.ts             # Database persistence
│   ├── centralizedDataFeed.ts                # Centralized data management
│   ├── liveDataActivator.ts                  # Live data activation
│   ├── liveDataManager.ts                    # Live data coordination
│   └── activateLiveData.ts                   # Data activation utilities
├── shared/                                   # Shared type definitions
│   └── schema.ts                             # Drizzle ORM schema
├── attached_assets/                          # Project assets and documentation
│   ├── Requirements documents
│   ├── Feature specifications
│   ├── Commercial roadmap
│   └── Implementation screenshots
├── Configuration Files
│   ├── package.json                          # Node.js dependencies
│   ├── tsconfig.json                         # TypeScript configuration
│   ├── vite.config.ts                        # Vite build configuration
│   ├── tailwind.config.ts                    # Tailwind CSS configuration
│   ├── drizzle.config.ts                     # Database configuration
│   ├── components.json                       # shadcn/ui configuration
│   └── .env                                  # Environment variables
└── Documentation
    ├── replit.md                             # Project overview and architecture
    ├── PROJECT_TREE.md                       # This file - project structure
    ├── PLATFORM_FEATURES_STATUS.md          # Feature implementation status
    ├── ROADMAP_STATUS.md                     # Development roadmap progress
    ├── DATA_ARCHITECTURE_SUMMARY.md         # Data architecture overview
    └── CHATGPT_RECOMMENDATIONS_IMPLEMENTATION.md # AI recommendations
```

## Key Architecture Components

### Frontend (React + TypeScript)
- **Real-time Data**: WebSocket connections for live market updates
- **State Management**: React Context API with TanStack Query
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Charts**: Chart.js for market data visualization

### Backend (Node.js + Express)
- **API Layer**: RESTful endpoints with WebSocket broadcasting
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with session management
- **Data Sources**: Angel One API integration with fallback systems

### Real-time Data Flow
1. **Angel One API** → Central Data Broadcaster
2. **Central Data Broadcaster** → WebSocket Server
3. **WebSocket Server** → Frontend Components
4. **Data Persistence** → PostgreSQL Database

### Current System Status
- ✅ Live market data updating every 3 seconds
- ✅ WebSocket broadcasting operational
- ✅ Frontend receiving real-time price updates
- ⚠️ Options chain data display needs investigation
- ⚠️ Database persistence temporarily disabled due to constraint issues

### Development Environment
- **Platform**: Replit
- **Database**: Neon PostgreSQL (serverless)
- **Build Tool**: Vite with hot module replacement
- **Package Manager**: npm

## Recent Changes (Auto-synced)
- Fixed database persistence constraint errors by temporarily disabling problematic upserts
- Implemented live data feed without database persistence errors  
- Real-time market updates functioning properly with 3-second intervals
- Fixed API endpoint data mapping issue (instrumentData.price → instrumentData.ltp)
- Options chain data backend processing active with 11 strikes per instrument
- Live market data flowing correctly: NIFTY ₹25,150, BANKNIFTY ₹53,409, FINNIFTY ₹23,728
- **COMMODITY SEGMENTS INTEGRATION IMPLEMENTED:**
  - Created comprehensive system design document (COMMODITY_SYSTEM_DESIGN.md)
  - Enhanced database schema with 3 new tables: market_segments, commodity_instruments, market_sessions
  - Built multi-segment data manager with support for EQUITY, COMMODITY, CURRENCY segments
  - Added API endpoints: /api/segments and /api/segments/:segmentId/data
  - Created MarketSegmentSelector component for frontend segment switching
  - Commodity instruments: CRUDEOIL, NATURALGAS, GOLD, SILVER with realistic pricing
  - Market hours support: Equity (09:15-15:30), Commodity (09:00-23:30), Currency (09:00-17:00)
- Project tree documentation created and synced with Git