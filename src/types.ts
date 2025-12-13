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
    [key: string]: any;
  };
}

export interface Scene {
  id: string;
  pointers: string[];
  hasOptimizedAssets?: boolean;
  optimizationReport?: OptimizationReport;
}

export interface ApiResponse {
  scenes: Scene[];
}

export interface LandData {
  x: number;
  y: number;
  sceneId: string | null;
  hasOptimizedAssets?: boolean;
  optimizationReport?: OptimizationReport;
}

export interface WorldData {
  lands: Map<string, LandData>;
  scenes: Map<string, Scene>;
}

// Decentraland Worlds (separate from Genesis City)
export interface WorldScene {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  pointers: string[];
  timestamp: number;
}

export interface World {
  name: string;
  scenes: WorldScene[];
}

export interface WorldWithOptimization {
  name: string;
  sceneId: string;
  title: string;
  thumbnail?: string;
  parcels: number;
  hasOptimizedAssets: boolean;
}

export interface WorldsStats {
  totalWorlds: number;
  optimizedWorlds: number;
  notOptimizedWorlds: number;
  optimizationPercentage: number;
}