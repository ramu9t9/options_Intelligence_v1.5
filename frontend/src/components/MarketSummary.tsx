import React from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';
import { useMarketData } from '../context/MarketDataContext';
import { MarketType, MARKET_INSTRUMENTS } from '../types/MarketTypes';

interface MarketSummaryProps {
  selectedMarket: string;
  marketType: MarketType;
}

export function MarketSummary({ selectedMarket, marketType }: MarketSummaryProps) {
  const { marketData, signals, prices } = useMarketData();

  const currentData = marketData[selectedMarket] || [];
  const currentPrice = prices[selectedMarket] || 0;
  const selectedInstrument = MARKET_INSTRUMENTS[selectedMarket];

  // Calculate summary statistics
  const calculateSummary = (data: any[]) => {
    if (data.length === 0) return { totalCallOI: 0, totalPutOI: 0, callOIChange: 0, putOIChange: 0, pcr: 0 };
    
    const totalCallOI = data.reduce((sum, item) => sum + item.callOI, 0);
    const totalPutOI = data.reduce((sum, item) => sum + item.putOI, 0);
    const callOIChange = data.reduce((sum, item) => sum + item.callOIChange, 0);
    const putOIChange = data.reduce((sum, item) => sum + item.putOIChange, 0);
    const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

    return { totalCallOI, totalPutOI, callOIChange, putOIChange, pcr };
  };

  const summary = calculateSummary(currentData);
  const recentBullishSignals = signals.filter(s => s.direction === 'BULLISH' && s.underlying === selectedMarket).length;
  const recentBearishSignals = signals.filter(s => s.direction === 'BEARISH' && s.underlying === selectedMarket).length;

  const getMarketTypeColor = (type: MarketType) => {
    switch (type) {
      case 'EQUITY':
        return 'blue';
      case 'COMMODITY':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const color = getMarketTypeColor(marketType);

  const summaryCards = [
    {
      title: `${selectedMarket} Price`,
      value: `₹${currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      change: '',
      changeValue: selectedInstrument?.type || 'Index',
      icon: TrendingUp,
      color: `text-${color}-600`,
      bgColor: `bg-${color}-50 dark:bg-${color}-900/20`
    },
    {
      title: 'Put-Call Ratio',
      value: summary.pcr.toFixed(2),
      change: summary.putOIChange > 0 ? '+' : '',
      changeValue: (summary.putOIChange / 1000).toFixed(0) + 'K',
      icon: Activity,
      color: summary.pcr > 1.2 ? 'text-red-600' : summary.pcr < 0.8 ? 'text-green-600' : `text-${color}-600`,
      bgColor: summary.pcr > 1.2 ? 'bg-red-50 dark:bg-red-900/20' : summary.pcr < 0.8 ? 'bg-green-50 dark:bg-green-900/20' : `bg-${color}-50 dark:bg-${color}-900/20`
    },
    {
      title: 'Bullish Signals',
      value: recentBullishSignals.toString(),
      change: '+',
      changeValue: 'Active',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Bearish Signals',
      value: recentBearishSignals.toString(),
      change: '+',
      changeValue: 'Active',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryCards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} border border-gray-200 dark:border-gray-700 rounded-lg p-6 transition-all duration-200 hover:shadow-md`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {card.title}
              </p>
              <p className={`text-2xl font-bold ${card.color} dark:${card.color.replace('600', '400')}`}>
                {card.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {card.change}{card.changeValue}
              </p>
            </div>
            <div className={`p-3 rounded-full ${card.bgColor}`}>
              <card.icon className={`w-6 h-6 ${card.color} dark:${card.color.replace('600', '400')}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}