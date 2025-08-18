import axios from 'axios';
import { Scene, OptimizationReport } from '../types';
import { S3OptimizationChecker } from './s3-client';

const API_URL = 'https://peer.decentraland.org/content/entities/active';
const OPTIMIZATION_URL = 'https://optimized-assets.dclexplorer.com/v1';
const BATCH_SIZE = 50000;
const MIN_COORD = -175;
const MAX_COORD = 175;

export class DecentralandAPI {
  private async fetchBatch(pointers: string[]): Promise<Scene[]> {
    try {
      console.log(`Fetching batch of ${pointers.length} pointers...`);
      const response = await axios.post(API_URL, {
        pointers: pointers
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      return response.data as Scene[];
    } catch (error) {
      console.error('Error fetching batch:', error);
      throw error;
    }
  }

  private generatePointers(startX: number, endX: number, startY: number, endY: number): string[] {
    const pointers: string[] = [];
    
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        pointers.push(`${x},${y}`);
      }
    }
    
    return pointers;
  }

  private async checkOptimizedAsset(sceneId: string): Promise<boolean> {
    try {
      const url = `${OPTIMIZATION_URL}/${sceneId}-mobile.zip`;
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async fetchOptimizationReport(sceneId: string): Promise<OptimizationReport | null> {
    try {
      const url = `${OPTIMIZATION_URL}/${sceneId}-report.json`;
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200 && response.data) {
        return {
          sceneId,
          success: response.data.success || false,
          timestamp: response.data.timestamp,
          error: response.data.error,
          details: response.data
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  public async fetchWorld(): Promise<Scene[]> {
    const allScenes: Scene[] = [];
    const totalLands = (MAX_COORD - MIN_COORD + 1) * (MAX_COORD - MIN_COORD + 1);
    console.log(`Total lands to fetch: ${totalLands}`);

    const gridSize = Math.floor(Math.sqrt(BATCH_SIZE));
    
    for (let startX = MIN_COORD; startX <= MAX_COORD; startX += gridSize) {
      for (let startY = MIN_COORD; startY <= MAX_COORD; startY += gridSize) {
        const endX = Math.min(startX + gridSize - 1, MAX_COORD);
        const endY = Math.min(startY + gridSize - 1, MAX_COORD);
        
        const pointers = this.generatePointers(startX, endX, startY, endY);
        
        try {
          const scenes = await this.fetchBatch(pointers);
          allScenes.push(...scenes);
          
          const progress = ((startX - MIN_COORD) * (MAX_COORD - MIN_COORD + 1) + (startY - MIN_COORD)) / totalLands * 100;
          console.log(`Progress: ${progress.toFixed(2)}%`);
        } catch (error) {
          console.error(`Failed to fetch batch for region (${startX},${startY}) to (${endX},${endY})`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Fetched ${allScenes.length} scenes`);
    return allScenes;
  }

  public async checkOptimizationStatus(scenes: Scene[]): Promise<Scene[]> {
    console.log(`\nChecking optimization status for ${scenes.length} scenes...`);
    const uniqueScenes = Array.from(new Map(scenes.map(s => [s.id, s])).values());
    
    try {
      // Try to use S3 API for fast checking
      const s3Checker = new S3OptimizationChecker();
      await s3Checker.initialize();
      
      // Mark scenes based on S3 data
      for (const scene of uniqueScenes) {
        scene.hasOptimizedAssets = s3Checker.hasOptimizedAsset(scene.id);
      }
      
      const optimizedCount = uniqueScenes.filter(s => s.hasOptimizedAssets).length;
      console.log(`Found ${optimizedCount} scenes with optimized assets (using S3 API)`);
      
    } catch (error) {
      console.log('S3 API failed, falling back to HTTP HEAD requests...');
      
      // Fallback to HTTP HEAD requests
      let checked = 0;
      const batchSize = 10;
      
      for (let i = 0; i < uniqueScenes.length; i += batchSize) {
        const batch = uniqueScenes.slice(i, Math.min(i + batchSize, uniqueScenes.length));
        
        await Promise.all(
          batch.map(async (scene) => {
            scene.hasOptimizedAssets = await this.checkOptimizedAsset(scene.id);
          })
        );
        
        checked += batch.length;
        const progress = (checked / uniqueScenes.length) * 100;
        console.log(`Optimization check progress: ${progress.toFixed(2)}% (${checked}/${uniqueScenes.length})`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const optimizedCount = uniqueScenes.filter(s => s.hasOptimizedAssets).length;
      console.log(`Found ${optimizedCount} scenes with optimized assets (using HTTP)`);
    }
    
    // Fetch reports for scenes without optimized assets
    console.log('\nFetching optimization reports for non-optimized scenes...');
    const nonOptimizedScenes = uniqueScenes.filter(s => !s.hasOptimizedAssets);
    let reportsChecked = 0;
    let reportsFound = 0;
    
    const reportBatchSize = 20;
    for (let i = 0; i < nonOptimizedScenes.length; i += reportBatchSize) {
      const batch = nonOptimizedScenes.slice(i, Math.min(i + reportBatchSize, nonOptimizedScenes.length));
      
      await Promise.all(
        batch.map(async (scene) => {
          const report = await this.fetchOptimizationReport(scene.id);
          if (report) {
            scene.optimizationReport = report;
            reportsFound++;
          }
        })
      );
      
      reportsChecked += batch.length;
      const progress = (reportsChecked / nonOptimizedScenes.length) * 100;
      console.log(`Report check progress: ${progress.toFixed(2)}% (${reportsChecked}/${nonOptimizedScenes.length}) - Found ${reportsFound} reports`);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`Found ${reportsFound} optimization reports`);
    
    return scenes.map(scene => {
      const uniqueScene = uniqueScenes.find(s => s.id === scene.id);
      return { 
        ...scene, 
        hasOptimizedAssets: uniqueScene?.hasOptimizedAssets || false,
        optimizationReport: uniqueScene?.optimizationReport
      };
    });
  }
}