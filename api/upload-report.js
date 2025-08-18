// Vercel serverless function to receive and store the report using Blob Storage
import { put, list, del } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50kb', // Small limit since we're just receiving metadata
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
    const { url, timestamp } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    // Fetch the HTML content from the provided URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch report from URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Clean up old reports (keep only the latest)
    try {
      const { blobs } = await list({ prefix: 'report-' });
      for (const blob of blobs) {
        await del(blob.url);
      }
    } catch (e) {
      console.log('No previous reports to clean up');
    }

    // Store the new report in Blob Storage
    const blob = await put(`report-latest.html`, html, {
      access: 'public',
      contentType: 'text/html',
      addRandomSuffix: false,
    });

    // Also store metadata
    await put(`report-metadata.json`, JSON.stringify({
      timestamp: timestamp || new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      size: html.length,
      blobUrl: blob.url
    }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.status(200).json({ 
      success: true, 
      message: 'Report uploaded to Blob Storage successfully',
      blobUrl: blob.url,
      timestamp: timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error uploading report:', error);
    res.status(500).json({ error: 'Failed to upload report: ' + error.message });
  }
}