import { useState, useEffect } from 'react';
import type { CompressedReportData, LandData, Stats } from '../types';
import { URLS } from '../config';

interface ReportData {
  lands: LandData[];
  stats: Stats;
  sceneColorIndices: Record<string, number>;
  generatedAt: number;
}

interface UseReportDataResult {
  data: ReportData | null;
  isLoading: boolean;
  error: string | null;
}

function decompressData(compressed: CompressedReportData): ReportData {
  const lands: LandData[] = compressed.l.map((land) => ({
    x: land[0],
    y: land[1],
    sceneId: land[2],
    hasOptimizedAssets: land[3] === 1,
    optimizationReport: land[4] !== undefined ? {
      success: land[4] === 1,
    } : undefined,
  }));

  return {
    lands,
    stats: compressed.s,
    sceneColorIndices: compressed.c,
    generatedAt: compressed.g,
  };
}

export function useReportData(): UseReportDataResult {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(URLS.reportData);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const compressed: CompressedReportData = await response.json();
        const decompressed = decompressData(compressed);
        setData(decompressed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, isLoading, error };
}
