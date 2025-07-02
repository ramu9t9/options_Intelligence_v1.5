import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, Filter } from 'lucide-react';

interface OptionData {
  strike: number;
  callOI: number;
  callOIChange: number;
  callLTP: number;
  callVolume: number;
  callIV: number;
  putOI: number;
  putOIChange: number;
  putLTP: number;
  putVolume: number;
  putIV: number;
}

export function FullOptionChain() {
  const [selectedInstrument, setSelectedInstrument] = useState('NIFTY');
  const [selectedExpiry, setSelectedExpiry] = useState('29-JAN-2025');
  const [optionData, setOptionData] = useState<OptionData[]>([]);
  const [spotPrice, setSpotPrice] = useState(22150);
  const [filterATM, setFilterATM] = useState(false);

  useEffect(() => {
    generateOptionChainData();
  }, [selectedInstrument, selectedExpiry]);

  const generateOptionChainData = () => {
    const strikes = [];
    const baseStrike = Math.floor(spotPrice / 50) * 50;
    
    for (let i = -10; i <= 10; i++) {
      const strike = baseStrike + (i * 50);
      const isITM = selectedInstrument === 'NIFTY' ? strike < spotPrice : strike > spotPrice;
      const distanceFromSpot = Math.abs(strike - spotPrice);
      
      strikes.push({
        strike,
        callOI: Math.floor(Math.random() * 200000) + 50000,
        callOIChange: Math.floor(Math.random() * 40000) - 20000,
        callLTP: Math.max(0.05, (spotPrice - strike + Math.random() * 100)),
        callVolume: Math.floor(Math.random() * 50000),
        callIV: 15 + Math.random() * 20,
        putOI: Math.floor(Math.random() * 150000) + 30000,
        putOIChange: Math.floor(Math.random() * 30000) - 15000,
        putLTP: Math.max(0.05, (strike - spotPrice + Math.random() * 100)),
        putVolume: Math.floor(Math.random() * 40000),
        putIV: 14 + Math.random() * 22,
      });
    }
    
    setOptionData(strikes);
  };

  const getATMStrike = () => {
    return Math.round(spotPrice / 50) * 50;
  };

  const filteredData = filterATM 
    ? optionData.filter(item => Math.abs(item.strike - getATMStrike()) <= 200)
    : optionData;

  const formatNumber = (num: number) => {
    if (num >= 10000000) return (num / 10000000).toFixed(1) + 'Cr';
    if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/'}
                className="p-2 text-white hover:bg-white/10 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-white">Options Chain</h1>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-sm">
                LIVE
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
              >
                <option value="NIFTY">NIFTY</option>
                <option value="BANKNIFTY">BANK NIFTY</option>
                <option value="FINNIFTY">FIN NIFTY</option>
              </select>
              
              <select
                value={selectedExpiry}
                onChange={(e) => setSelectedExpiry(e.target.value)}
                className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-2"
              >
                <option value="29-JAN-2025">29-JAN-2025</option>
                <option value="30-JAN-2025">30-JAN-2025</option>
                <option value="06-FEB-2025">06-FEB-2025</option>
              </select>

              <button
                onClick={() => setFilterATM(!filterATM)}
                className={`flex items-center px-3 py-2 rounded border ${
                  filterATM 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-gray-800 border-gray-600 text-gray-300'
                }`}
              >
                <Filter className="w-4 h-4 mr-2" />
                ATM Only
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Market Info */}
      <div className="container mx-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400">Spot Price</div>
            <div className="text-2xl font-bold text-white">{spotPrice.toFixed(2)}</div>
            <div className="text-sm text-green-400">+125.30 (+0.57%)</div>
          </div>
          
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total Call OI</div>
            <div className="text-xl font-bold text-green-400">
              {formatNumber(optionData.reduce((sum, item) => sum + item.callOI, 0))}
            </div>
          </div>
          
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total Put OI</div>
            <div className="text-xl font-bold text-red-400">
              {formatNumber(optionData.reduce((sum, item) => sum + item.putOI, 0))}
            </div>
          </div>
          
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div className="text-sm text-gray-400">Put/Call Ratio</div>
            <div className="text-xl font-bold text-yellow-400">
              {(optionData.reduce((sum, item) => sum + item.putOI, 0) / 
                optionData.reduce((sum, item) => sum + item.callOI, 0)).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Option Chain Table */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-center text-xs font-medium text-green-400 uppercase tracking-wider p-3" colSpan={5}>
                    CALLS
                  </th>
                  <th className="text-center text-xs font-medium text-white uppercase tracking-wider p-3">
                    STRIKE
                  </th>
                  <th className="text-center text-xs font-medium text-red-400 uppercase tracking-wider p-3" colSpan={5}>
                    PUTS
                  </th>
                </tr>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-xs font-medium text-gray-400 p-2">OI</th>
                  <th className="text-xs font-medium text-gray-400 p-2">Chng</th>
                  <th className="text-xs font-medium text-gray-400 p-2">Vol</th>
                  <th className="text-xs font-medium text-gray-400 p-2">IV</th>
                  <th className="text-xs font-medium text-gray-400 p-2">LTP</th>
                  <th className="text-xs font-medium text-gray-400 p-2">STRIKE</th>
                  <th className="text-xs font-medium text-gray-400 p-2">LTP</th>
                  <th className="text-xs font-medium text-gray-400 p-2">IV</th>
                  <th className="text-xs font-medium text-gray-400 p-2">Vol</th>
                  <th className="text-xs font-medium text-gray-400 p-2">Chng</th>
                  <th className="text-xs font-medium text-gray-400 p-2">OI</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => {
                  const isATM = Math.abs(row.strike - getATMStrike()) <= 25;
                  return (
                    <tr
                      key={row.strike}
                      className={`border-b border-white/5 hover:bg-white/5 ${
                        isATM ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      {/* Call Options */}
                      <td className="text-sm text-green-400 p-2 text-center">
                        {formatNumber(row.callOI)}
                      </td>
                      <td className={`text-sm p-2 text-center ${
                        row.callOIChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {row.callOIChange > 0 ? '+' : ''}{formatNumber(row.callOIChange)}
                      </td>
                      <td className="text-sm text-blue-400 p-2 text-center">
                        {formatNumber(row.callVolume)}
                      </td>
                      <td className="text-sm text-yellow-400 p-2 text-center">
                        {row.callIV.toFixed(1)}%
                      </td>
                      <td className="text-sm text-white font-medium p-2 text-center">
                        {formatPrice(row.callLTP)}
                      </td>
                      
                      {/* Strike */}
                      <td className={`text-sm font-bold p-2 text-center ${
                        isATM ? 'text-blue-400' : 'text-white'
                      }`}>
                        {row.strike}
                      </td>
                      
                      {/* Put Options */}
                      <td className="text-sm text-white font-medium p-2 text-center">
                        {formatPrice(row.putLTP)}
                      </td>
                      <td className="text-sm text-yellow-400 p-2 text-center">
                        {row.putIV.toFixed(1)}%
                      </td>
                      <td className="text-sm text-blue-400 p-2 text-center">
                        {formatNumber(row.putVolume)}
                      </td>
                      <td className={`text-sm p-2 text-center ${
                        row.putOIChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {row.putOIChange > 0 ? '+' : ''}{formatNumber(row.putOIChange)}
                      </td>
                      <td className="text-sm text-red-400 p-2 text-center">
                        {formatNumber(row.putOI)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
          <div>OI: Open Interest</div>
          <div>Chng: OI Change</div>
          <div>Vol: Volume</div>
          <div>IV: Implied Volatility</div>
          <div>LTP: Last Traded Price</div>
          <div className="text-blue-400">ATM: At The Money</div>
        </div>
      </div>
    </div>
  );
}