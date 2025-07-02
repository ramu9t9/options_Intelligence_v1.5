import React, { useState } from 'react';
import { OptionChain } from './OptionChain';
import { SignalsList } from './SignalsList';
import { ChartView } from './ChartView';
import { MarketSummary } from './MarketSummary';
import { RealTimeDataStatus } from './RealTimeDataStatus';
import { PatternAnalysis } from './PatternAnalysis';
import { MarketTypeSelector } from './MarketTypeSelector';
import { InstrumentSelector } from './InstrumentSelector';
import { AdminPanel } from './AdminPanel';
import { MarketType, MARKET_INSTRUMENTS } from '../types/MarketTypes';

export function Dashboard() {
  const [selectedMarketType, setSelectedMarketType] = useState<MarketType>('EQUITY');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(['NIFTY']);

  const handleInstrumentToggle = (symbol: string) => {
    // For now, single select mode
    setSelectedInstruments([symbol]);
  };

  const primaryInstrument = selectedInstruments[0];
  const selectedInstrument = MARKET_INSTRUMENTS[primaryInstrument];

  return (
    <div className="space-y-6">
      {/* Admin Panel */}
      <AdminPanel />

      {/* Real-Time Data Status */}
      <RealTimeDataStatus />

      {/* Market Type Selector */}
      <MarketTypeSelector 
        selectedMarketType={selectedMarketType}
        onMarketTypeChange={(type) => {
          setSelectedMarketType(type);
          // Auto-select first instrument of the new type
          const firstInstrument = Object.values(MARKET_INSTRUMENTS)
            .find(inst => inst.type === type);
          if (firstInstrument) {
            setSelectedInstruments([firstInstrument.symbol]);
          }
        }}
      />

      {/* Instrument Selector */}
      <InstrumentSelector
        marketType={selectedMarketType}
        selectedInstruments={selectedInstruments}
        onInstrumentToggle={handleInstrumentToggle}
        multiSelect={false}
      />

      {/* Market Summary Cards */}
      <MarketSummary 
        selectedMarket={primaryInstrument}
        marketType={selectedMarketType}
      />

      {/* Main Content */}
      {primaryInstrument && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedInstrument?.name || primaryInstrument} Options Chain
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Real-time option data with intelligent pattern detection
                </p>
              </div>
            </div>

            {/* Option Chain */}
            <div className="p-6">
              <OptionChain underlying={primaryInstrument} />
            </div>
          </div>

          {/* Charts, Patterns, and Signals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Charts */}
            <div className="lg:col-span-2">
              <ChartView underlying={primaryInstrument} />
            </div>

            {/* Pattern Analysis */}
            <div className="lg:col-span-1">
              <PatternAnalysis selectedInstruments={selectedInstruments} />
            </div>
          </div>

          {/* Signals List */}
          <div className="grid grid-cols-1">
            <SignalsList selectedInstruments={selectedInstruments} />
          </div>
        </>
      )}
    </div>
  );
}