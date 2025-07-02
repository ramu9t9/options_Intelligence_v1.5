import React from 'react';

export function OptionChainSkeleton() {
  return (
    <div className="w-full">
      {/* Desktop Skeleton */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-full">
          {/* Header Skeleton */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b">
            <div className="grid grid-cols-7 gap-4">
              {['CE LTP', 'CE OI', 'CE Δ OI', 'STRIKE', 'PE Δ OI', 'PE OI', 'PE LTP'].map((header, index) => (
                <div key={index} className="text-center">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows Skeleton */}
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <div key={rowIndex} className="border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
              <div className="grid grid-cols-7 gap-4 items-center">
                {/* CE LTP */}
                <div className="text-center">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                
                {/* CE OI */}
                <div className="text-center space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
                
                {/* CE Δ OI */}
                <div className="text-center">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                
                {/* STRIKE (highlighted) */}
                <div className="text-center bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">
                  <div className="h-6 bg-yellow-300 dark:bg-yellow-600 rounded animate-pulse"></div>
                </div>
                
                {/* PE Δ OI */}
                <div className="text-center">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                
                {/* PE OI */}
                <div className="text-center space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
                
                {/* PE LTP */}
                <div className="text-center">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: 6 }).map((_, cardIndex) => (
          <div key={cardIndex} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            {/* Strike Badge Skeleton */}
            <div className="text-center mb-3">
              <div className="inline-block h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* CE Side Skeleton */}
              <div className="space-y-3 border-r border-gray-200 dark:border-gray-700 pr-4">
                <div className="text-center">
                  <div className="h-5 bg-green-200 dark:bg-green-800 rounded animate-pulse mb-2"></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    <div className="h-3 w-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                  <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
              </div>

              {/* PE Side Skeleton */}
              <div className="space-y-3 pl-4">
                <div className="text-center">
                  <div className="h-5 bg-red-200 dark:bg-red-800 rounded animate-pulse mb-2"></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    <div className="h-3 w-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-8 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                  <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="text-center mt-6 mb-4">
        <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading option chain data...</span>
        </div>
      </div>
    </div>
  );
}