// Vercel serverless function to receive report metadata
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authToken = req.headers['x-auth-token'];
  const expectedToken = process.env.UPLOAD_SECRET;

  if (!expectedToken || authToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, timestamp } = req.body;

    // Store metadata
    await put(`report-metadata.json`, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.status(200).json({ 
      success: true, 
      message: 'Metadata uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading metadata:', error);
    res.status(500).json({ error: 'Failed to upload metadata: ' + error.message });
  }
}