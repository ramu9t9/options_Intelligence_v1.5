import React from 'react';

export function Progress({ 
  value, 
  className = '',
  max = 100 
}: { 
  value: number; 
  className?: string;
  max?: number;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`relative h-4 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div 
        className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}