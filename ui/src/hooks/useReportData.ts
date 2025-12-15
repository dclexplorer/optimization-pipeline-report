import { useState, useEffect } from 'react';
import type { CompressedReportData, LandData, Stats, WorldWithOptimization, WorldsStats } from '../types';
import { URLS } from '../config';

interface ReportData {
  lands: LandData[];
  stats: Stats;
  sceneColorIndices: Record<string, number>;
  generatedAt: number;
  worlds: WorldWithOptimization[];
  worldsStats: WorldsStats | null;
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

  // Decompress worlds data
  // Format: [name, sceneId, title, thumbnail, parcels, hasOptimized, hasFailed?]
  const worlds: WorldWithOptimization[] = (compressed.w || []).map((world) => ({
    name: world[0],
    sceneId: world[1],
    title: world[2],
    thumbnail: world[3] || undefined,
    parcels: world[4],
    hasOptimizedAssets: world[5] === 1,
    hasFailed: world[6] === 1,
  }));

  return {
    lands,
    stats: compressed.s,
    sceneColorIndices: compressed.c,
    generatedAt: compressed.g,
    worlds,
    worldsStats: compressed.ws || null,
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
