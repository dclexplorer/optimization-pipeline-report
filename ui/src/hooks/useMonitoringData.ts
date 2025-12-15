import { useState, useEffect, useCallback } from 'react';
import type { MonitoringData } from '../types';
import { URLS } from '../config';

export type QueueTimeRange = '7d' | '3d' | '24h' | '12h' | '6h' | '3h' | '1h';

interface UseMonitoringDataResult {
  data: MonitoringData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  queueRange: QueueTimeRange;
  setQueueRange: (range: QueueTimeRange) => void;
}

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

export function useMonitoringData(): UseMonitoringDataResult {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueRange, setQueueRange] = useState<QueueTimeRange>('24h');

  const fetchData = useCallback(async () => {
    try {
      const url = `${URLS.monitoringStatus}?range=${queueRange}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: MonitoringData = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
    } finally {
      setIsLoading(false);
    }
  }, [queueRange]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling interval
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData, queueRange, setQueueRange };
}
