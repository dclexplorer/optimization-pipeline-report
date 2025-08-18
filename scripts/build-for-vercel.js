const { DecentralandAPI } = require('../dist/api/decentraland');
const { DataProcessor } = require('../dist/processor');
const { ReportGenerator } = require('../dist/report-generator');
const fs = require('fs');
const path = require('path');

async function generateReport() {
  console.log('🚀 Building report for Vercel deployment...');
  
  try {
    // Fetch world data
    const api = new DecentralandAPI();
    let scenes = await api.fetchWorld();
    
    // Check optimization status
    console.log('\n⚡ Checking optimization status...');
    scenes = await api.checkOptimizationStatus(scenes);
    
    // Process data
    console.log('\n🔄 Processing scene data...');
    const processor = new DataProcessor();
    const worldData = processor.processScenes(scenes);
    const stats = processor.getStatistics(worldData);
    
    // Log statistics
    console.log('\n📊 Statistics:');
    console.log(`  - Total Scenes: ${stats.totalScenes}`);
    console.log(`  - Optimized: ${stats.scenesWithOptimizedAssets}`);
    console.log(`  - Coverage: ${stats.optimizationPercentage.toFixed(1)}%`);
    
    // Generate HTML
    console.log('\n📝 Generating HTML report...');
    const generator = new ReportGenerator();
    const html = generator.generateHTML(worldData, stats);
    
    // Create public directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Save report as index.html
    const outputPath = path.join(publicDir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`\n✅ Report saved to: ${outputPath}`);
    
    // Create a simple API endpoint that returns report metadata
    const metadata = {
      generated: new Date().toISOString(),
      stats: {
        totalScenes: stats.totalScenes,
        optimized: stats.scenesWithOptimizedAssets,
        coverage: stats.optimizationPercentage.toFixed(1) + '%'
      }
    };
    
    fs.writeFileSync(
      path.join(publicDir, 'metadata.json'), 
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
    
    console.log('✅ Build complete for Vercel!');
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateReport();
}

module.exports = generateReport;