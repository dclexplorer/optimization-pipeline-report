// Vercel serverless function to receive report data chunks
import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
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
    const { data } = req.body;
    const { chunkIndex, lands } = data;

    // Store chunk
    await put(`report-chunk-${chunkIndex}.json`, JSON.stringify(lands), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.status(200).json({ 
      success: true, 
      message: `Chunk ${chunkIndex} uploaded successfully`
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    res.status(500).json({ error: 'Failed to upload chunk: ' + error.message });
  }
}