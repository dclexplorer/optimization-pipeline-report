import { WorldData } from './types';

export class ReportGenerator {
  public generateReportData(worldData: WorldData, stats: any): any {
    const landsArray = Array.from(worldData.lands.values());

    // ULTRA COMPRESSED: Only include occupied lands to drastically reduce size
    const occupiedLands = landsArray
      .filter(land => land.sceneId !== null) // Only include lands with scenes
      .map(land => {
        // Use array format instead of object to save space
        // Format: [x, y, sceneId, hasOptimized, reportSuccess]
        const compressed: any[] = [
          land.x,
          land.y,
          land.sceneId
        ];

        // Add optimization status (1 = optimized, 0 = not)
        compressed.push(land.hasOptimizedAssets ? 1 : 0);

        // Add report status if exists (1 = success, 0 = failed, undefined = no report)
        if (land.optimizationReport) {
          compressed.push(land.optimizationReport.success ? 1 : 0);
        }

        return compressed;
      });

    // Create a scene ID to color index map (use indices instead of color strings)
    const sceneIds = Array.from(worldData.scenes.keys());
    const sceneColorIndices: Record<string, number> = {};
    sceneIds.forEach((sceneId, index) => {
      sceneColorIndices[sceneId] = index;
    });

    return {
      // Use abbreviated keys
      l: occupiedLands, // lands (only occupied)
      s: stats, // stats
      c: sceneColorIndices, // color indices for scenes
      g: Date.now() // generated timestamp (shorter than ISO string)
    };
  }
}
