// Vercel serverless function to store historical report snapshots
import { put, list, del } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
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
    const { timestamp, stats, metadata, chunks } = req.body;
    const dateStr = new Date(timestamp).toISOString().split('T')[0];
    const timeStr = new Date(timestamp).toISOString().replace(/[:.]/g, '-');
    
    // Store snapshot with timestamp prefix
    const snapshotKey = `history/${dateStr}/${timeStr}`;
    
    // Store compressed snapshot data
    const snapshot = {
      timestamp,
      stats,
      metadata,
      totalChunks: chunks ? chunks.length : 0,
      // Store only summary data, not full chunk data to save space
      summary: {
        totalLands: stats.totalLands,
        occupiedLands: stats.occupiedLands,
        optimizationPercentage: stats.optimizationPercentage,
        scenesWithOptimizedAssets: stats.scenesWithOptimizedAssets,
        scenesWithReports: stats.scenesWithReports
      }
    };
    
    await put(`${snapshotKey}.json`, JSON.stringify(snapshot), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    
    // Update history index
    let historyIndex = { entries: [] };
    try {
      const response = await fetch(`${process.env.VERCEL_URL || 'https://arzlqs3tufwp7az7.public.blob.vercel-storage.com'}/history-index.json`);
      if (response.ok) {
        historyIndex = await response.json();
      }
    } catch (e) {
      // No existing history, start fresh
    }
    
    // Add new entry
    historyIndex.entries.unshift({
      timestamp,
      dateStr,
      timeStr,
      key: snapshotKey,
      summary: snapshot.summary
    });
    
    // Keep only last 30 days of history (60 entries at 2 per day)
    historyIndex.entries = historyIndex.entries.slice(0, 60);
    
    // Clean up old snapshots
    if (historyIndex.entries.length >= 60) {
      // Remove oldest entries from storage
      const oldEntries = historyIndex.entries.slice(60);
      for (const entry of oldEntries) {
        try {
          await del(`${entry.key}.json`);
        } catch (e) {
          console.log('Failed to delete old snapshot:', entry.key);
        }
      }
    }
    
    // Save updated history index
    await put('history-index.json', JSON.stringify(historyIndex), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.status(200).json({ 
      success: true, 
      message: 'History snapshot stored successfully',
      snapshotKey
    });
  } catch (error) {
    console.error('Error storing history:', error);
    res.status(500).json({ error: 'Failed to store history: ' + error.message });
  }
}