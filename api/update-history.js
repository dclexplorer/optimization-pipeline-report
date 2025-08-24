// Vercel serverless function to update history in PostgreSQL
import { sql } from '@vercel/postgres';

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

  const { timestamp, stats, secret } = req.body;
  const expectedSecret = process.env.UPLOAD_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS optimization_history (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        total_lands INTEGER NOT NULL,
        occupied_lands INTEGER NOT NULL,
        total_scenes INTEGER NOT NULL,
        scenes_with_optimized INTEGER NOT NULL,
        scenes_without_optimized INTEGER NOT NULL,
        optimization_percentage DECIMAL(5,2) NOT NULL,
        scenes_with_reports INTEGER NOT NULL,
        successful_optimizations INTEGER NOT NULL,
        failed_optimizations INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert new history entry
    await sql`
      INSERT INTO optimization_history (
        timestamp,
        total_lands,
        occupied_lands,
        total_scenes,
        scenes_with_optimized,
        scenes_without_optimized,
        optimization_percentage,
        scenes_with_reports,
        successful_optimizations,
        failed_optimizations
      ) VALUES (
        ${timestamp},
        ${stats.totalLands},
        ${stats.occupiedLands},
        ${stats.totalScenes},
        ${stats.scenesWithOptimizedAssets},
        ${stats.scenesWithoutOptimizedAssets},
        ${stats.optimizationPercentage},
        ${stats.scenesWithReports},
        ${stats.successfulOptimizations},
        ${stats.failedOptimizations}
      )
    `;

    // Clean up old entries (keep last 60 days)
    await sql`
      DELETE FROM optimization_history
      WHERE timestamp < NOW() - INTERVAL '60 days'
    `;

    res.status(200).json({ 
      success: true, 
      message: 'History updated successfully'
    });
  } catch (error) {
    console.error('Error updating history:', error);
    res.status(500).json({ error: 'Failed to update history: ' + error.message });
  }
}