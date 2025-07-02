import { useState, useEffect } from 'react';
import { DatabaseService, Instrument, OptionData, MarketSignal } from '../lib/database';

export function useDatabase() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstruments();
  }, []);

  const loadInstruments = async () => {
    try {
      setIsLoading(true);
      const data = await DatabaseService.getInstruments();
      setInstruments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instruments');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    instruments,
    isLoading,
    error,
    refetch: loadInstruments
  };
}

export function useOptionData(instrumentId: string) {
  const [optionData, setOptionData] = useState<OptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instrumentId) return;
    
    loadOptionData();
  }, [instrumentId]);

  const loadOptionData = async () => {
    try {
      setIsLoading(true);
      // For now, return empty array as we're using WebSocket for real-time data
      setOptionData([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load option data');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    optionData,
    isLoading,
    error,
    refetch: loadOptionData
  };
}

export function useMarketSignals() {
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSignals();
  }, []);

  const loadSignals = async () => {
    try {
      setIsLoading(true);
      const data = await DatabaseService.getRecentSignals();
      setSignals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signals,
    isLoading,
    error,
    refetch: loadSignals
  };
}