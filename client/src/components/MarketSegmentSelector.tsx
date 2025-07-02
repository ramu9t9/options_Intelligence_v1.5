import React, { useState } from 'react';
import { TrendingUp, Zap, DollarSign, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface MarketSegment {
  id: string;
  name: string;
  type: 'EQUITY' | 'COMMODITY' | 'CURRENCY';
  instruments: string[];
  marketHours: string;
  status: 'OPEN' | 'CLOSED' | 'PRE_OPEN' | 'POST_CLOSE';
  isActive: boolean;
}

interface MarketSegmentSelectorProps {
  segments: MarketSegment[];
  activeSegments: string[];
  onSegmentToggle: (segmentId: string) => void;
  onSegmentChange: (segmentIds: string[]) => void;
}

const segmentIcons = {
  EQUITY: TrendingUp,
  COMMODITY: Zap,
  CURRENCY: DollarSign,
};

const segmentColors = {
  EQUITY: 'bg-blue-500',
  COMMODITY: 'bg-yellow-500',
  CURRENCY: 'bg-green-500',
};

const statusColors = {
  OPEN: 'text-green-500',
  CLOSED: 'text-red-500',
  PRE_OPEN: 'text-yellow-500',
  POST_CLOSE: 'text-gray-500',
};

export function MarketSegmentSelector({
  segments,
  activeSegments,
  onSegmentToggle,
  onSegmentChange
}: MarketSegmentSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSegmentToggle = (segmentId: string) => {
    onSegmentToggle(segmentId);
  };

  const getStatusText = (status: MarketSegment['status']) => {
    switch (status) {
      case 'OPEN': return 'Market Open';
      case 'CLOSED': return 'Market Closed';
      case 'PRE_OPEN': return 'Pre-Market';
      case 'POST_CLOSE': return 'After Hours';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="flex -space-x-2">
            {segments.filter(s => activeSegments.includes(s.id)).map(segment => {
              const Icon = segmentIcons[segment.type];
              return (
                <div
                  key={segment.id}
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm',
                    segmentColors[segment.type],
                    'border-2 border-white dark:border-gray-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
              );
            })}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Market Segments
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeSegments.length} of {segments.length} active
            </p>
          </div>
        </div>
        <ChevronDown 
          className={clsx(
            'w-5 h-5 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4 space-y-3">
            {segments.map(segment => {
              const Icon = segmentIcons[segment.type];
              const isActive = activeSegments.includes(segment.id);
              
              return (
                <div
                  key={segment.id}
                  className={clsx(
                    'p-3 rounded-lg border-2 cursor-pointer transition-all',
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                  onClick={() => handleSegmentToggle(segment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center text-white',
                        segmentColors[segment.type]
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {segment.name}
                          </h4>
                          <span className={clsx(
                            'text-xs font-medium',
                            statusColors[segment.status]
                          )}>
                            {getStatusText(segment.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {segment.instruments.length} instruments • {segment.marketHours}
                        </p>
                      </div>
                    </div>
                    <div className={clsx(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      isActive
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 dark:border-gray-600'
                    )}>
                      {isActive && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {segment.instruments.map(instrument => (
                          <span
                            key={instrument}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {instrument}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex space-x-2">
              <button
                onClick={() => onSegmentChange(segments.map(s => s.id))}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => onSegmentChange([])}
                className="flex-1 px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}