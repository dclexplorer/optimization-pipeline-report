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
    const { totalChunks, timestamp, stats } = req.body;
    const completedAt = new Date().toISOString();
    
    // Mark upload as complete
    await put(`report-complete.json`, JSON.stringify({
      totalChunks,
      timestamp,
      completedAt: completedAt
    }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    
    // Update history index with summary stats
    let historyIndex = { entries: [] };
    try {
      // Try to fetch existing history
      const response = await fetch('https://arzlqs3tufwp7az7.public.blob.vercel-storage.com/history-index.json');
      if (response.ok) {
        historyIndex = await response.json();
      }
    } catch (e) {
      // No existing history, start fresh
    }
    
    // Add new entry with summary
    const entry = {
      timestamp: completedAt,
      totalChunks: totalChunks,
      summary: stats ? {
        totalLands: stats.totalLands,
        occupiedLands: stats.occupiedLands,
        totalScenes: stats.totalScenes,
        optimizationPercentage: stats.optimizationPercentage,
        scenesWithOptimizedAssets: stats.scenesWithOptimizedAssets,
        scenesWithReports: stats.scenesWithReports
      } : null
    };
    
    historyIndex.entries.unshift(entry);
    
    // Keep only last 30 days (60 entries at 2 per day)
    historyIndex.entries = historyIndex.entries.slice(0, 60);
    
    // Save updated history index
    await put(`history-index.json`, JSON.stringify(historyIndex), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.status(200).json({ 
      success: true, 
      message: 'Upload finalized and history updated successfully'
    });
  } catch (error) {
    console.error('Error finalizing upload:', error);
    res.status(500).json({ error: 'Failed to finalize upload: ' + error.message });
  }
}