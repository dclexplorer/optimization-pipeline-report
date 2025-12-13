import axios from 'axios';
import { World, WorldWithOptimization, WorldsStats } from '../types';
import { PATHS } from '../config';

const WORLDS_API_URL = 'https://worlds-content-server.decentraland.org/index';

export class WorldsAPI {
  private async checkOptimizedAsset(sceneId: string): Promise<boolean> {
    try {
      const url = PATHS.getOptimizedAssetUrl(sceneId);
      const response = await axios.head(url, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  public async fetchWorlds(): Promise<World[]> {
    console.log('Fetching worlds from Decentraland...');

    try {
      const response = await axios.get(WORLDS_API_URL, {
        timeout: 30000,
      });

      const worlds: World[] = response.data?.data || [];
      console.log(`Found ${worlds.length} worlds`);
      return worlds;
    } catch (error: any) {
      console.error('Error fetching worlds:', error.message);
      throw error;
    }
  }

  public async checkWorldsOptimization(worlds: World[]): Promise<{
    worlds: WorldWithOptimization[];
    stats: WorldsStats;
  }> {
    console.log(`\nChecking optimization status for ${worlds.length} worlds...`);

    // Filter worlds that have scenes
    const worldsWithScenes = worlds.filter(w => w.scenes && w.scenes.length > 0);
    console.log(`${worldsWithScenes.length} worlds have scenes`);

    const results: WorldWithOptimization[] = [];
    const batchSize = 20;
    let checked = 0;

    for (let i = 0; i < worldsWithScenes.length; i += batchSize) {
      const batch = worldsWithScenes.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (world) => {
          const primaryScene = world.scenes[0];
          const hasOptimized = await this.checkOptimizedAsset(primaryScene.id);
          const totalParcels = world.scenes.reduce(
            (sum, scene) => sum + (scene.pointers?.length || 0),
            0
          );

          return {
            name: world.name,
            sceneId: primaryScene.id,
            title: primaryScene.title || 'Untitled',
            thumbnail: primaryScene.thumbnail,
            parcels: totalParcels,
            hasOptimizedAssets: hasOptimized,
          };
        })
      );

      results.push(...batchResults);
      checked += batch.length;

      const progress = ((checked / worldsWithScenes.length) * 100).toFixed(1);
      console.log(`Worlds optimization check: ${progress}% (${checked}/${worldsWithScenes.length})`);

      // Small delay between batches
      if (i + batchSize < worldsWithScenes.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort: optimized first, then by name
    results.sort((a, b) => {
      if (a.hasOptimizedAssets !== b.hasOptimizedAssets) {
        return a.hasOptimizedAssets ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Calculate stats
    const optimizedCount = results.filter(w => w.hasOptimizedAssets).length;
    const stats: WorldsStats = {
      totalWorlds: results.length,
      optimizedWorlds: optimizedCount,
      notOptimizedWorlds: results.length - optimizedCount,
      optimizationPercentage: results.length > 0
        ? Math.round((optimizedCount / results.length) * 1000) / 10
        : 0,
    };

    console.log(`\nWorlds optimization summary:`);
    console.log(`  - Total: ${stats.totalWorlds}`);
    console.log(`  - Optimized: ${stats.optimizedWorlds}`);
    console.log(`  - Not Optimized: ${stats.notOptimizedWorlds}`);
    console.log(`  - Percentage: ${stats.optimizationPercentage}%`);

    return { worlds: results, stats };
  }
}
