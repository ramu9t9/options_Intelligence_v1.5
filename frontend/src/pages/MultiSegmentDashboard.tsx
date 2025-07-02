import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MarketSegmentSelector, MarketSegment } from '../components/MarketSegmentSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Zap, DollarSign, BarChart3, Activity, Clock, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface SegmentData {
  segment: string;
  instruments: Record<string, {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    optionChain: any[];
    lastRefresh: string;
  }>;
  timestamp: string;
  success: boolean;
}

export default function MultiSegmentDashboard() {
  const [activeSegments, setActiveSegments] = useState<string[]>(['EQUITY']);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('NIFTY');

  // Fetch available market segments
  const { data: segmentsData } = useQuery({
    queryKey: ['/api/segments'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch data for active segments
  const segmentQueries = activeSegments.map(segmentId => 
    useQuery({
      queryKey: [`/api/segments/${segmentId}/data`],
      refetchInterval: 5000, // Refresh every 5 seconds
      enabled: activeSegments.includes(segmentId),
    })
  );

  const handleSegmentToggle = (segmentId: string) => {
    setActiveSegments(prev => {
      if (prev.includes(segmentId)) {
        return prev.filter(id => id !== segmentId);
      } else {
        return [...prev, segmentId];
      }
    });
  };

  const handleSegmentChange = (segmentIds: string[]) => {
    setActiveSegments(segmentIds);
  };

  const getInstrumentIcon = (segment: string) => {
    switch (segment) {
      case 'EQUITY': return TrendingUp;
      case 'COMMODITY': return Zap;
      case 'CURRENCY': return DollarSign;
      default: return BarChart3;
    }
  };

  const formatPrice = (price: number, segment: string) => {
    if (segment === 'CURRENCY') {
      return `₹${price.toFixed(4)}`;
    }
    return `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const renderInstrumentCard = (instrument: any, segment: string) => {
    const Icon = getInstrumentIcon(segment);
    const isSelected = selectedInstrument === instrument.symbol;

    return (
      <Card 
        key={instrument.symbol}
        className={clsx(
          'cursor-pointer transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
        )}
        onClick={() => setSelectedInstrument(instrument.symbol)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Icon className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {instrument.symbol}
              </span>
            </div>
            <Badge variant={instrument.change >= 0 ? 'default' : 'destructive'}>
              {instrument.change >= 0 ? '+' : ''}{instrument.changePercent.toFixed(2)}%
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatPrice(instrument.price, segment)}
            </div>
            <div className={clsx('text-sm font-medium', getChangeColor(instrument.change))}>
              {instrument.change >= 0 ? '+' : ''}{instrument.change.toFixed(2)} 
              ({instrument.change >= 0 ? '+' : ''}{instrument.changePercent.toFixed(2)}%)
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Vol: {instrument.volume.toLocaleString('en-IN')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOptionChain = (instrument: any) => {
    if (!instrument?.optionChain || instrument.optionChain.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>No option chain data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
          <div>Strike</div>
          <div className="text-right">Call OI</div>
          <div className="text-right">Call LTP</div>
          <div className="text-center">Strike</div>
          <div className="text-right">Put LTP</div>
          <div className="text-right">Put OI</div>
          <div className="text-right">Volume</div>
        </div>
        
        {instrument.optionChain.slice(0, 10).map((option: any, index: number) => (
          <div key={index} className="grid grid-cols-7 gap-2 text-sm py-1 border-b border-gray-100 dark:border-gray-700">
            <div className="font-medium">{option.strike}</div>
            <div className="text-right">{option.callOI?.toLocaleString('en-IN') || '-'}</div>
            <div className="text-right">₹{option.callLTP?.toFixed(2) || '-'}</div>
            <div className="text-center font-bold">{option.strike}</div>
            <div className="text-right">₹{option.putLTP?.toFixed(2) || '-'}</div>
            <div className="text-right">{option.putOI?.toLocaleString('en-IN') || '-'}</div>
            <div className="text-right">{(option.callVolume + option.putVolume)?.toLocaleString('en-IN') || '-'}</div>
          </div>
        ))}
      </div>
    );
  };

  const segments = segmentsData?.segments || [];
  const selectedInstrumentData = segmentQueries
    .flatMap(query => query.data ? Object.values(query.data.instruments) : [])
    .find((inst: any) => inst.symbol === selectedInstrument);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Multi-Segment Trading Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time data across Equity, Commodity, and Currency markets
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Market Segment Selector */}
        <MarketSegmentSelector
          segments={segments}
          activeSegments={activeSegments}
          onSegmentToggle={handleSegmentToggle}
          onSegmentChange={handleSegmentChange}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instruments List */}
          <div className="lg:col-span-1 space-y-6">
            {activeSegments.map((segmentId, index) => {
              const segmentQuery = segmentQueries[index];
              const segmentInfo = segments.find((s: MarketSegment) => s.id === segmentId);
              
              if (!segmentQuery?.data || !segmentInfo) return null;

              return (
                <div key={segmentId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {segmentInfo.name}
                    </h3>
                    <Badge variant={segmentInfo.status === 'OPEN' ? 'default' : 'secondary'}>
                      {segmentInfo.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {Object.values(segmentQuery.data.instruments).map((instrument: any) =>
                      renderInstrumentCard(instrument, segmentId)
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Instrument Details */}
          <div className="lg:col-span-2">
            {selectedInstrumentData ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="w-5 h-5" />
                      <span>{selectedInstrumentData.symbol} Options Chain</span>
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(selectedInstrumentData.price, 'EQUITY')}
                      </div>
                      <div className={clsx('text-sm font-medium', getChangeColor(selectedInstrumentData.change))}>
                        {selectedInstrumentData.change >= 0 ? '+' : ''}
                        {selectedInstrumentData.change.toFixed(2)} 
                        ({selectedInstrumentData.change >= 0 ? '+' : ''}
                        {selectedInstrumentData.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="options" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="options">Options Chain</TabsTrigger>
                      <TabsTrigger value="analysis">Technical Analysis</TabsTrigger>
                      <TabsTrigger value="insights">AI Insights</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="options" className="mt-4">
                      {renderOptionChain(selectedInstrumentData)}
                    </TabsContent>
                    
                    <TabsContent value="analysis" className="mt-4">
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                        <p>Technical analysis coming soon</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="insights" className="mt-4">
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2" />
                        <p>AI-powered insights coming soon</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select an Instrument
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose an instrument from the sidebar to view detailed options data
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}