import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, RefreshCw } from 'lucide-react';

interface ExpiryDropdownProps {
  expiries: string[];
  selectedExpiry: string;
  onExpiryChange: (expiry: string) => void;
  strikeFilter: 'all' | 'atm' | 'atm-5';
  onStrikeFilterChange: (filter: 'all' | 'atm' | 'atm-5') => void;
  onRefresh?: () => void;
  lastUpdated?: Date;
  loading?: boolean;
}

export function ExpiryDropdown({
  expiries,
  selectedExpiry,
  onExpiryChange,
  strikeFilter,
  onStrikeFilterChange,
  onRefresh,
  lastUpdated,
  loading = false
}: ExpiryDropdownProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStrikeFilterLabel = (filter: string) => {
    switch (filter) {
      case 'atm': return 'ATM Only';
      case 'atm-5': return 'ATM ± 5';
      case 'all': return 'All Strikes';
      default: return 'All Strikes';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left Section - Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Expiry Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select value={selectedExpiry} onValueChange={onExpiryChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Expiry" />
              </SelectTrigger>
              <SelectContent>
                {expiries.map((expiry) => (
                  <SelectItem key={expiry} value={expiry}>
                    {expiry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Strike Filter Buttons */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['all', 'atm', 'atm-5'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={strikeFilter === filter ? "default" : "ghost"}
                  size="sm"
                  className={`text-xs px-3 py-1 ${
                    strikeFilter === filter 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => onStrikeFilterChange(filter)}
                >
                  {getStrikeFilterLabel(filter)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section - Status and Refresh */}
        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last Updated: {formatTime(lastUpdated)}
            </div>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}

          {/* Loading Indicator */}
          {loading && (
            <Badge variant="secondary" className="animate-pulse">
              Updating...
            </Badge>
          )}
        </div>
      </div>

      {/* Mobile-friendly Summary */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>Expiry: <strong>{selectedExpiry}</strong></span>
        <span>•</span>
        <span>Filter: <strong>{getStrikeFilterLabel(strikeFilter)}</strong></span>
        {lastUpdated && (
          <>
            <span>•</span>
            <span>Updated: <strong>{formatTime(lastUpdated)}</strong></span>
          </>
        )}
      </div>
    </div>
  );
}