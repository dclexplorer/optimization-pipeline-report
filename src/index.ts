import { DecentralandAPI } from './api/decentraland';
import { DataProcessor } from './processor';
import { ReportGenerator } from './report-generator';
import { R2Uploader } from './r2-uploader';

async function main() {
  console.log('🚀 Starting Decentraland Asset Optimization Pipeline Report Generator');
  console.log('=' .repeat(60));
  
  try {
    console.log('\n📡 Step 1: Fetching world data from Decentraland...');
    const api = new DecentralandAPI();
    let scenes = await api.fetchWorld();
    
    console.log('\n⚡ Step 2: Checking asset optimization status...');
    scenes = await api.checkOptimizationStatus(scenes);
    
    console.log('\n🔄 Step 3: Processing scene data...');
    const processor = new DataProcessor();
    const worldData = processor.processScenes(scenes);
    const stats = processor.getStatistics(worldData);
    
    console.log('\n📊 Statistics:');
    console.log(`  - Total Lands: ${stats.totalLands}`);
    console.log(`  - Occupied Lands: ${stats.occupiedLands}`);
    console.log(`  - Empty Lands: ${stats.emptyLands}`);
    console.log(`  - Total Scenes: ${stats.totalScenes}`);
    console.log(`  - Average Lands per Scene: ${stats.averageLandsPerScene.toFixed(2)}`);
    console.log(`  - Scenes with Optimized Assets: ${stats.scenesWithOptimizedAssets}`);
    console.log(`  - Scenes without Optimized Assets: ${stats.scenesWithoutOptimizedAssets}`);
    console.log(`  - Optimization Coverage: ${stats.optimizationPercentage.toFixed(1)}%`);
    console.log(`  - Scenes with Reports: ${stats.scenesWithReports}`);
    console.log(`  - Successful Optimizations: ${stats.successfulOptimizations}`);
    console.log(`  - Failed Optimizations: ${stats.failedOptimizations}`);
    
    console.log('\n📝 Step 4: Generating report data...');
    const generator = new ReportGenerator();
    const reportData = generator.generateReportData(worldData, stats);

    // Step 5: Upload JSON data to CloudFlare R2
    console.log('\n☁️ Step 5: Uploading report data to R2...');
    const uploader = new R2Uploader();
    await uploader.uploadReportData(reportData);

    console.log('\n✅ Report generation complete!');
    console.log('🌐 React frontend will fetch data from R2 at runtime.');
    
  } catch (error) {
    console.error('\n❌ Error generating report:', error);
    process.exit(1);
  }
}

main().catch(console.error);