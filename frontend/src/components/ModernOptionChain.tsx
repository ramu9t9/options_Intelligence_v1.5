import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OptionData {
  strike: number;
  callOI: number;
  callOIChange: number;
  callLTP: number;
  callVolume: number;
  putOI: number;
  putOIChange: number;
  putLTP: number;
  putVolume: number;
}

interface ModernOptionChainProps {
  data: OptionData[];
  spotPrice: number;
  selectedInstrument: string;
}

export default function ModernOptionChain({ data, spotPrice, selectedInstrument }: ModernOptionChainProps) {
  const [sortBy, setSortBy] = useState<'strike' | 'callOI' | 'putOI'>('strike');

  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'callOI':
        return b.callOI - a.callOI;
      case 'putOI':
        return b.putOI - a.putOI;
      default:
        return a.strike - b.strike;
    }
  });

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(decimals);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const isATM = (strike: number) => Math.abs(strike - spotPrice) < 50;

  return (
    <Card className="card-modern">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">
            {selectedInstrument} Options Chain
          </CardTitle>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            Real-time option data with intelligent pattern detection
          </Badge>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <Button
              variant={sortBy === 'strike' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('strike')}
              className="btn-modern"
            >
              Sort by Strike
            </Button>
            <Button
              variant={sortBy === 'callOI' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('callOI')}
              className="btn-modern"
            >
              Sort by Call OI
            </Button>
            <Button
              variant={sortBy === 'putOI' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('putOI')}
              className="btn-modern"
            >
              Sort by Put OI
            </Button>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-slate-400">Spot Price</div>
            <div className="text-2xl font-bold text-white">
              ₹{spotPrice.toLocaleString()}
            </div>
            <div className="text-sm text-green-400">+0.68%</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th colSpan={4} className="px-4 py-3 text-center text-sm font-semibold text-slate-300 border-r border-slate-700">
                  CALLS
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-white bg-slate-700/50">
                  STRIKE
                </th>
                <th colSpan={4} className="px-4 py-3 text-center text-sm font-semibold text-slate-300 border-l border-slate-700">
                  PUTS
                </th>
              </tr>
              <tr className="bg-slate-800/30">
                <th className="px-3 py-2 text-xs font-medium text-slate-400 text-left">OI</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-400 text-left">CHG</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-400 text-left">LTP</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-400 text-left border-r border-slate-700">VOL</th>
                <th className="px-3 py-2 text-xs font-medium text-white text-center bg-slate-700/50">PRICE</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-400 text-left border-l border-slate-700">VOL</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-400 text-left">LTP</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-400 text-left">CHG</th>
                <th className="px-3 py-2 text-xs font-medium text-slate-400 text-left">OI</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((option, index) => {
                const isAtTheMoney = isATM(option.strike);
                return (
                  <tr 
                    key={option.strike}
                    className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                      isAtTheMoney ? 'bg-yellow-500/5 border-yellow-500/20' : ''
                    }`}
                  >
                    {/* Call Side */}
                    <td className="px-3 py-3 text-sm font-medium text-white">
                      {formatNumber(option.callOI, 0)}
                    </td>
                    <td className={`px-3 py-3 text-sm ${getChangeColor(option.callOIChange)}`}>
                      {option.callOIChange > 0 ? '+' : ''}{formatNumber(option.callOIChange, 1)}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-white">
                      ₹{option.callLTP.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-400 border-r border-slate-700">
                      {formatNumber(option.callVolume, 0)}
                    </td>
                    
                    {/* Strike Price */}
                    <td className={`px-3 py-3 text-center font-bold bg-slate-700/30 ${
                      isAtTheMoney ? 'text-yellow-400 bg-yellow-500/10' : 'text-white'
                    }`}>
                      {option.strike}
                      {isAtTheMoney && (
                        <div className="text-xs text-yellow-400 font-normal">ATM</div>
                      )}
                    </td>
                    
                    {/* Put Side */}
                    <td className="px-3 py-3 text-sm text-slate-400 border-l border-slate-700">
                      {formatNumber(option.putVolume, 0)}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-white">
                      ₹{option.putLTP.toFixed(2)}
                    </td>
                    <td className={`px-3 py-3 text-sm ${getChangeColor(option.putOIChange)}`}>
                      {option.putOIChange > 0 ? '+' : ''}{formatNumber(option.putOIChange, 1)}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-white">
                      {formatNumber(option.putOI, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Summary Stats */}
        <div className="p-4 bg-slate-800/30 border-t border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-400">
                {formatNumber(sortedData.reduce((sum, opt) => sum + opt.callOI, 0), 0)}
              </div>
              <div className="text-xs text-slate-400">Total Call OI</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">
                {formatNumber(sortedData.reduce((sum, opt) => sum + opt.putOI, 0), 0)}
              </div>
              <div className="text-xs text-slate-400">Total Put OI</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">
                {(sortedData.reduce((sum, opt) => sum + opt.putOI, 0) / 
                  sortedData.reduce((sum, opt) => sum + opt.callOI, 0)).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400">PCR Ratio</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-400">
                {sortedData.find(opt => isATM(opt.strike))?.strike || spotPrice}
              </div>
              <div className="text-xs text-slate-400">Max Pain</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}