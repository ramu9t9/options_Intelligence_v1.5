import React from 'react';

export function Badge({ children, className = '', variant = 'default' }: { 
  children: React.ReactNode; 
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}) {
  const baseClasses = 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    secondary: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    destructive: 'bg-red-500/20 text-red-400 border border-red-500/30',
    outline: 'border border-white/20 text-white'
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}