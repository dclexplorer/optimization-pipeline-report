const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to read metadata if it exists
    const metadataPath = path.join(process.cwd(), 'public', 'metadata.json');
    
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      return res.status(200).json({
        status: 'ok',
        ...metadata
      });
    }
    
    return res.status(200).json({
      status: 'ok',
      message: 'Report not yet generated',
      generated: null
    });
    
  } catch (error) {
    return res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
};