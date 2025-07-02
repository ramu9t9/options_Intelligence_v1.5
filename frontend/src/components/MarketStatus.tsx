import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { MarketType } from '../types/MarketTypes';

interface MarketStatusProps {
  marketType: MarketType;
  dataMode?: 'MOCK' | 'LIVE';
  instrumentName?: string;
}

export function MarketStatus({ marketType, dataMode = 'LIVE', instrumentName }: MarketStatusProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Define trading hours per market type
  const tradingHours = {
    EQUITY: { open: '09:15', close: '15:30' },
    COMMODITY: { open: '09:00', close: '23:30' },
    CURRENCY: { open: '09:00', close: '17:00' }
  };

  // Handle mock data mode
  if (dataMode === 'MOCK') {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
        <AlertCircle className="w-3 h-3" />
        <span>Historical Data Mode Active</span>
      </div>
    );
  }

  const { open, close } = tradingHours[marketType];
  
  // Get current IST time
  const istTime = new Date(currentTime.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const currentHour = istTime.getHours();
  const currentMinute = istTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  // Parse trading hours
  const [openHour, openMinute] = open.split(':').map(Number);
  const [closeHour, closeMinute] = close.split(':').map(Number);
  
  const openTimeMinutes = openHour * 60 + openMinute;
  const closeTimeMinutes = closeHour * 60 + closeMinute;
  
  // Check if market is currently open
  let marketIsOpen = false;
  
  if (closeTimeMinutes > openTimeMinutes) {
    // Normal trading hours (same day)
    marketIsOpen = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
  } else {
    // Overnight trading hours (crosses midnight)
    marketIsOpen = currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
      marketIsOpen
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    }`}>
      <Clock className="w-3 h-3" />
      <span>
        {marketIsOpen ? 'Market Open' : 'Market Closed'} ({open}–{close} IST)
      </span>
    </div>
  );
}