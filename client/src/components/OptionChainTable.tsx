import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OiBar } from './OiBar';

interface OptionData {
  strike: number;
  ceLtp: number;
  ceOi: number;
  ceDeltaOi: number;
  peLtp: number;
  peOi: number;
  peDeltaOi: number;
  ceVolume?: number;
  peVolume?: number;
}

interface OptionChainTableProps {
  data: OptionData[];
  loading?: boolean;
  atmStrike?: number;
}

export function OptionChainTable({ data, loading = false, atmStrike }: OptionChainTableProps) {
  // Calculate max OI for relative bar sizing
  const maxOi = React.useMemo(() => {
    if (!data.length) return 0;
    return Math.max(
      ...data.map(row => Math.max(row.ceOi, row.peOi))
    );
  }, [data]);

  const formatNumber = (num: number) => {
    if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-500';
    if (delta < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const isAtmStrike = (strike: number) => atmStrike && Math.abs(strike - atmStrike) < 50;

  return (
    <div className="w-full overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800">
              <TableHead className="text-center font-semibold">CE LTP</TableHead>
              <TableHead className="text-center font-semibold">CE OI</TableHead>
              <TableHead className="text-center font-semibold">CE Δ OI</TableHead>
              <TableHead className="text-center font-bold bg-yellow-100 dark:bg-yellow-900">STRIKE</TableHead>
              <TableHead className="text-center font-semibold">PE Δ OI</TableHead>
              <TableHead className="text-center font-semibold">PE OI</TableHead>
              <TableHead className="text-center font-semibold">PE LTP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow 
                key={row.strike}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  isAtmStrike(row.strike) ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400' : ''
                }`}
              >
                <TableCell className="text-center font-mono">
                  {row.ceLtp.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <span className="font-mono text-sm">{formatNumber(row.ceOi)}</span>
                    <OiBar value={row.ceOi} delta={row.ceDeltaOi} maxValue={maxOi} />
                  </div>
                </TableCell>
                <TableCell className={`text-center font-mono ${getDeltaColor(row.ceDeltaOi)}`}>
                  {row.ceDeltaOi > 0 ? '+' : ''}{formatNumber(row.ceDeltaOi)}
                </TableCell>
                <TableCell className="text-center font-bold text-lg bg-yellow-100 dark:bg-yellow-900">
                  {row.strike}
                </TableCell>
                <TableCell className={`text-center font-mono ${getDeltaColor(row.peDeltaOi)}`}>
                  {row.peDeltaOi > 0 ? '+' : ''}{formatNumber(row.peDeltaOi)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <span className="font-mono text-sm">{formatNumber(row.peOi)}</span>
                    <OiBar value={row.peOi} delta={row.peDeltaOi} maxValue={maxOi} />
                  </div>
                </TableCell>
                <TableCell className="text-center font-mono">
                  {row.peLtp.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div 
            key={row.strike}
            className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
              isAtmStrike(row.strike) ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="text-center mb-3">
              <Badge variant={isAtmStrike(row.strike) ? "default" : "secondary"} className="text-lg font-bold">
                {row.strike}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* CE Side */}
              <div className="space-y-2 border-r border-gray-200 dark:border-gray-700 pr-4">
                <h4 className="font-semibold text-green-600 text-center">CALL</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">LTP:</span>
                    <span className="font-mono font-bold">{row.ceLtp.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">OI:</span>
                    <span className="font-mono">{formatNumber(row.ceOi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Δ OI:</span>
                    <span className={`font-mono ${getDeltaColor(row.ceDeltaOi)}`}>
                      {row.ceDeltaOi > 0 ? '+' : ''}{formatNumber(row.ceDeltaOi)}
                    </span>
                  </div>
                  <OiBar value={row.ceOi} delta={row.ceDeltaOi} maxValue={maxOi} />
                </div>
              </div>

              {/* PE Side */}
              <div className="space-y-2 pl-4">
                <h4 className="font-semibold text-red-600 text-center">PUT</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">LTP:</span>
                    <span className="font-mono font-bold">{row.peLtp.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">OI:</span>
                    <span className="font-mono">{formatNumber(row.peOi)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Δ OI:</span>
                    <span className={`font-mono ${getDeltaColor(row.peDeltaOi)}`}>
                      {row.peDeltaOi > 0 ? '+' : ''}{formatNumber(row.peDeltaOi)}
                    </span>
                  </div>
                  <OiBar value={row.peOi} delta={row.peDeltaOi} maxValue={maxOi} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}