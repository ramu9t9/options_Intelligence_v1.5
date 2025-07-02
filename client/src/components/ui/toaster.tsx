import React from 'react';

export function Toaster() {
  return null; // Simplified toaster for now
}

export function useToast() {
  return {
    toast: (options: any) => {
      console.log('Toast:', options);
    }
  };
}