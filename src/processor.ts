import { Scene, LandData, WorldData } from './types';

export class DataProcessor {
  private lands: Map<string, LandData> = new Map();
  private scenes: Map<string, Scene> = new Map();

  public processScenes(scenes: Scene[]): WorldData {
    for (let x = -175; x <= 175; x++) {
      for (let y = -175; y <= 175; y++) {
        const key = `${x},${y}`;
        this.lands.set(key, {
          x,
          y,
          sceneId: null,
          hasOptimizedAssets: false,
          optimizationReport: undefined
        });
      }
    }

    for (const scene of scenes) {
      this.scenes.set(scene.id, scene);
      
      for (const pointer of scene.pointers) {
        const land = this.lands.get(pointer);
        if (land) {
          land.sceneId = scene.id;
          land.hasOptimizedAssets = scene.hasOptimizedAssets || false;
          land.optimizationReport = scene.optimizationReport;
        }
      }
    }

    return {
      lands: this.lands,
      scenes: this.scenes
    };
  }

  public getStatistics(worldData: WorldData): {
    totalLands: number;
    occupiedLands: number;
    emptyLands: number;
    totalScenes: number;
    averageLandsPerScene: number;
    scenesWithOptimizedAssets: number;
    scenesWithoutOptimizedAssets: number;
    optimizationPercentage: number;
    scenesWithReports: number;
    successfulOptimizations: number;
    failedOptimizations: number;
  } {
    let occupiedLands = 0;
    let scenesWithOptimizedAssets = 0;
    let scenesWithoutOptimizedAssets = 0;
    let scenesWithReports = 0;
    let successfulOptimizations = 0;
    let failedOptimizations = 0;
    
    worldData.lands.forEach(land => {
      if (land.sceneId) {
        occupiedLands++;
      }
    });

    worldData.scenes.forEach(scene => {
      if (scene.hasOptimizedAssets) {
        scenesWithOptimizedAssets++;
      } else {
        scenesWithoutOptimizedAssets++;
      }
      
      if (scene.optimizationReport) {
        scenesWithReports++;
        if (scene.optimizationReport.success) {
          successfulOptimizations++;
        } else {
          failedOptimizations++;
        }
      }
    });

    const totalLands = worldData.lands.size;
    const emptyLands = totalLands - occupiedLands;
    const totalScenes = worldData.scenes.size;
    const averageLandsPerScene = totalScenes > 0 ? occupiedLands / totalScenes : 0;
    const optimizationPercentage = totalScenes > 0 ? (scenesWithOptimizedAssets / totalScenes) * 100 : 0;

    return {
      totalLands,
      occupiedLands,
      emptyLands,
      totalScenes,
      averageLandsPerScene,
      scenesWithOptimizedAssets,
      scenesWithoutOptimizedAssets,
      optimizationPercentage,
      scenesWithReports,
      successfulOptimizations,
      failedOptimizations
    };
  }
}