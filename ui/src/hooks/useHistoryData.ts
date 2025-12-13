import { useState, useEffect } from 'react';
import type { HistoryEntry } from '../types';

interface UseHistoryDataResult {
  data: HistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

export function useHistoryData(): UseHistoryDataResult {
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/get-history');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result.history || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, []);

  return { data, isLoading, error };
}
