import axios from 'axios';
import { World, WorldWithOptimization, WorldsStats, OptimizationReport } from '../types';
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

  private async fetchOptimizationReport(sceneId: string, retryCount: number = 0): Promise<OptimizationReport | null> {
    const MAX_RETRIES = 2;

    try {
      const url = PATHS.getReportUrl(sceneId);
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200 && response.data) {
        return {
          sceneId,
          success: response.data.success || false,
          fatalError: response.data.fatalError || false,
          timestamp: response.data.timestamp,
          error: response.data.error,
          details: response.data
        };
      }
      return null;
    } catch (error: any) {
      if (retryCount < MAX_RETRIES - 1 && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.fetchOptimizationReport(sceneId, retryCount + 1);
      }
      return null;
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
            hasFailed: false,
            optimizationReport: undefined as OptimizationReport | undefined,
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

    // Fetch reports for non-optimized worlds to check for failures
    console.log('\nFetching optimization reports for non-optimized worlds...');
    const nonOptimizedWorlds = results.filter(w => !w.hasOptimizedAssets);
    let reportsChecked = 0;
    let reportsFound = 0;
    let failedCount = 0;

    const reportBatchSize = 20;
    for (let i = 0; i < nonOptimizedWorlds.length; i += reportBatchSize) {
      const batch = nonOptimizedWorlds.slice(i, Math.min(i + reportBatchSize, nonOptimizedWorlds.length));

      await Promise.all(
        batch.map(async (world) => {
          const report = await this.fetchOptimizationReport(world.sceneId);
          if (report) {
            world.optimizationReport = report;
            reportsFound++;
            if (report.fatalError) {
              world.hasFailed = true;
              failedCount++;
            }
          }
        })
      );

      reportsChecked += batch.length;
      const progress = (reportsChecked / nonOptimizedWorlds.length * 100).toFixed(1);
      console.log(`World report check: ${progress}% (${reportsChecked}/${nonOptimizedWorlds.length}) - Found ${reportsFound} reports, ${failedCount} failed`);

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`Found ${reportsFound} optimization reports for worlds, ${failedCount} with fatal errors`);

    // Sort: optimized first, then by name
    results.sort((a, b) => {
      if (a.hasOptimizedAssets !== b.hasOptimizedAssets) {
        return a.hasOptimizedAssets ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Calculate stats
    const optimizedCount = results.filter(w => w.hasOptimizedAssets).length;
    const failedWorldsCount = results.filter(w => w.hasFailed).length;
    const stats: WorldsStats = {
      totalWorlds: results.length,
      optimizedWorlds: optimizedCount,
      notOptimizedWorlds: results.length - optimizedCount - failedWorldsCount,
      failedWorlds: failedWorldsCount,
      optimizationPercentage: results.length > 0
        ? Math.round((optimizedCount / results.length) * 1000) / 10
        : 0,
    };

    console.log(`\nWorlds optimization summary:`);
    console.log(`  - Total: ${stats.totalWorlds}`);
    console.log(`  - Optimized: ${stats.optimizedWorlds}`);
    console.log(`  - Not Optimized: ${stats.notOptimizedWorlds}`);
    console.log(`  - Failed: ${stats.failedWorlds}`);
    console.log(`  - Percentage: ${stats.optimizationPercentage}%`);

    return { worlds: results, stats };
  }
}
