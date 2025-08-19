// Vercel serverless function to receive and store report data using Blob Storage
import { put, list, del } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Should be enough for JSON data
    },
  },
};

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
    const { data, timestamp } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Store the JSON data in Blob Storage
    const jsonData = JSON.stringify(data);
    console.log(`Storing report data: ${(Buffer.byteLength(jsonData) / 1024 / 1024).toFixed(2)} MB`);

    // Clean up old reports (keep only the latest)
    try {
      const { blobs } = await list({ prefix: 'report-' });
      for (const blob of blobs) {
        await del(blob.url);
      }
    } catch (e) {
      console.log('No previous reports to clean up');
    }

    // Store the new report data in Blob Storage
    const blob = await put(`report-data.json`, jsonData, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    // Also store metadata
    await put(`report-metadata.json`, JSON.stringify({
      timestamp: timestamp || new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      size: jsonData.length,
      blobUrl: blob.url,
      landsCount: data.lands?.length || 0,
      stats: data.stats
    }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.status(200).json({ 
      success: true, 
      message: 'Report data uploaded to Blob Storage successfully',
      blobUrl: blob.url,
      timestamp: timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error uploading report:', error);
    res.status(500).json({ error: 'Failed to upload report: ' + error.message });
  }
}