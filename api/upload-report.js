// Vercel serverless function to receive and store the report from GitHub Actions
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// We'll use Vercel KV or Edge Config for simpler storage
// For now, using in-memory storage (will reset on redeploy)
let storedReport = null;

export default async function handler(req, res) {
  // Enable CORS for GitHub Actions
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple authentication using a secret token
  const authToken = req.headers['x-auth-token'];
  const expectedToken = process.env.UPLOAD_SECRET;

  if (!expectedToken || authToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { html, timestamp } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    // Store the report in memory (or you could use Vercel Blob/KV)
    storedReport = {
      html,
      timestamp: timestamp || new Date().toISOString(),
      uploadedAt: new Date().toISOString()
    };

    // If using Vercel Blob Storage (optional, requires @vercel/blob package):
    // const { put } = require('@vercel/blob');
    // await put('report.html', html, { access: 'public' });

    res.status(200).json({ 
      success: true, 
      message: 'Report uploaded successfully',
      timestamp: storedReport.timestamp
    });
  } catch (error) {
    console.error('Error uploading report:', error);
    res.status(500).json({ error: 'Failed to upload report' });
  }
}

// Export the stored report for the index function to use
export { storedReport };