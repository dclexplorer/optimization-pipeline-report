// Vercel serverless function to finalize chunked upload
import { put, list } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50kb',
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
    const { totalChunks, timestamp } = req.body;

    // Mark upload as complete
    await put(`report-complete.json`, JSON.stringify({
      totalChunks,
      timestamp,
      completedAt: new Date().toISOString()
    }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.status(200).json({ 
      success: true, 
      message: 'Upload finalized successfully'
    });
  } catch (error) {
    console.error('Error finalizing upload:', error);
    res.status(500).json({ error: 'Failed to finalize upload: ' + error.message });
  }
}