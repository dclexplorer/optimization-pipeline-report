const { DecentralandAPI } = require('../dist/api/decentraland');
const { DataProcessor } = require('../dist/processor');
const { ReportGenerator } = require('../dist/report-generator');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  
  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Starting report generation...');
    
    // Fetch world data
    const api = new DecentralandAPI();
    let scenes = await api.fetchWorld();
    
    // Check optimization status
    scenes = await api.checkOptimizationStatus(scenes);
    
    // Process data
    const processor = new DataProcessor();
    const worldData = processor.processScenes(scenes);
    const stats = processor.getStatistics(worldData);
    
    // Generate HTML
    const generator = new ReportGenerator();
    const html = generator.generateHTML(worldData, stats);
    
    // Return HTML response
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error.message 
    });
  }
};