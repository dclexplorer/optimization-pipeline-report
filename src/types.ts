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