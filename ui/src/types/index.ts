export interface OptimizationReport {
  sceneId: string;
  success: boolean;
  timestamp?: string;
  error?: string;
  details?: {
    originalSize?: number;
    optimizedSize?: number;
    compressionRatio?: number;
    processingTime?: number;
    [key: string]: unknown;
  };
}

export interface LandData {
  x: number;
  y: number;
  sceneId: string | null;
  hasOptimizedAssets: boolean;
  optimizationReport?: {
    success: boolean;
    error?: string;
    details?: {
      originalSize?: number;
      optimizedSize?: number;
      compressionRatio?: number;
    };
  };
}

export interface Stats {
  totalLands: number;
  occupiedLands: number;
  emptyLands: number;
  totalScenes: number;
  averageLandsPerScene: number;
  scenesWithOptimizedAssets: number;
  scenesWithoutOptimizedAssets: number;
  scenesWithReports: number;
  successfulOptimizations: number;
  failedOptimizations: number;
  optimizationPercentage: number;
}

// Compressed format from R2: [x, y, sceneId, hasOptimized, reportSuccess?]
export type CompressedLand = [number, number, string, number, number?];

// Compressed world format: [name, sceneId, title, thumbnail, parcels, hasOptimized]
export type CompressedWorld = [string, string, string, string, number, number];

export interface WorldsStats {
  totalWorlds: number;
  optimizedWorlds: number;
  notOptimizedWorlds: number;
  optimizationPercentage: number;
}

export interface CompressedReportData {
  l: CompressedLand[]; // lands (only occupied)
  s: Stats; // stats
  c: Record<string, number>; // color indices for scenes
  g: number; // generated timestamp
  w?: CompressedWorld[]; // worlds array
  ws?: WorldsStats | null; // worlds stats
}

export interface HistoryEntry {
  id: number;
  created_at: string;
  total_lands: number;
  occupied_lands: number;
  empty_lands: number;
  total_scenes: number;
  scenes_with_optimized: number;
  scenes_without_optimized: number;
  optimization_percentage: number;
  scenes_with_reports: number;
  successful_optimizations: number;
  failed_optimizations: number;
}

export type MapView = 'scenes' | 'optimization' | 'reports';
export type TabName = 'overview' | 'optimization' | 'history' | 'worlds';

// World types
export interface WorldWithOptimization {
  name: string;
  sceneId: string;
  title: string;
  thumbnail?: string;
  parcels: number;
  hasOptimizedAssets: boolean;
}
