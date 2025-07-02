import React from 'react';

interface OiBarProps {
  value: number;
  maxValue: number;
  color?: 'green' | 'red' | 'blue' | 'gray';
  height?: 'sm' | 'md' | 'lg';
}

export function OiBar({ value, maxValue, color = 'blue', height = 'md' }: OiBarProps) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  
  const colorClasses = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-400'
  };
  
  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  return (
    <div className={`w-full bg-gray-200 rounded-full ${heightClasses[height]} relative overflow-hidden`}>
      <div
        className={`${colorClasses[color]} ${heightClasses[height]} rounded-full transition-all duration-300 ease-in-out`}
        style={{ width: `${percentage}%` }}
      />
      {percentage > 50 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white">
            {value > 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}