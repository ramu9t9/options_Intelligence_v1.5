export type MarketType = 'EQUITY' | 'COMMODITY' | 'CURRENCY';

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  type: MarketType;
  underlying_price: number;
  expiry_date?: string;
  is_active: boolean;
  market_hours: {
    open: string;
    close: string;
    timezone: string;
  };
  created_at: string;
  updated_at: string;
}

export interface MarketSession {
  name: string;
  open: string;
  close: string;
  isActive: boolean;
}

export interface DataMode {
  mode: 'MOCK' | 'LIVE';
  lastSwitched: string;
  autoSwitch: boolean;
}

export const MARKET_INSTRUMENTS: Record<string, Instrument> = {
  NIFTY: {
    id: '1',
    symbol: 'NIFTY',
    name: 'Nifty 50',
    type: 'EQUITY',
    underlying_price: 0, // NO SIMULATION PRICES - AUTHENTIC DATA ONLY
    is_active: true,
    market_hours: {
      open: '09:15',
      close: '15:30',
      timezone: 'Asia/Kolkata'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  BANKNIFTY: {
    id: '2',
    symbol: 'BANKNIFTY',
    name: 'Bank Nifty',
    type: 'EQUITY',
    underlying_price: 0, // NO SIMULATION PRICES - AUTHENTIC DATA ONLY
    is_active: true,
    market_hours: {
      open: '09:15',
      close: '15:30',
      timezone: 'Asia/Kolkata'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  CRUDEOIL: {
    id: '3',
    symbol: 'CRUDEOIL',
    name: 'Crude Oil',
    type: 'COMMODITY',
    underlying_price: 0, // NO SIMULATION PRICES - AUTHENTIC DATA ONLY
    is_active: true,
    market_hours: {
      open: '09:00',
      close: '23:30',
      timezone: 'Asia/Kolkata'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  NATURALGAS: {
    id: '4',
    symbol: 'NATURALGAS',
    name: 'Natural Gas',
    type: 'COMMODITY',
    underlying_price: 0, // NO SIMULATION PRICES - AUTHENTIC DATA ONLY
    is_active: true,
    market_hours: {
      open: '09:00',
      close: '23:30',
      timezone: 'Asia/Kolkata'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  GOLD: {
    id: '5',
    symbol: 'GOLD',
    name: 'Gold',
    type: 'COMMODITY',
    underlying_price: 0, // NO SIMULATION PRICES - AUTHENTIC DATA ONLY
    is_active: true,
    market_hours: {
      open: '09:00',
      close: '23:30',
      timezone: 'Asia/Kolkata'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  SILVER: {
    id: '6',
    symbol: 'SILVER',
    name: 'Silver',
    type: 'COMMODITY',
    underlying_price: 0, // NO SIMULATION PRICES - AUTHENTIC DATA ONLY
    is_active: true,
    market_hours: {
      open: '09:00',
      close: '23:30',
      timezone: 'Asia/Kolkata'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

export const MARKET_SESSIONS: Record<MarketType, MarketSession> = {
  EQUITY: {
    name: 'Equity Market',
    open: '09:15',
    close: '15:30',
    isActive: false
  },
  COMMODITY: {
    name: 'Commodity Market',
    open: '09:00',
    close: '23:30',
    isActive: false
  },
  CURRENCY: {
    name: 'Currency Market',
    open: '09:00',
    close: '17:00',
    isActive: false
  }
};