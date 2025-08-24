// Vercel serverless function to get history from PostgreSQL
import { sql } from '@vercel/postgres';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get last 30 days of history
    const { rows } = await sql`
      SELECT 
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
      FROM optimization_history
      WHERE timestamp > NOW() - INTERVAL '30 days'
      ORDER BY timestamp DESC
      LIMIT 60
    `;

    // Format the response
    const history = {
      entries: rows.map(row => ({
        timestamp: row.timestamp,
        summary: {
          totalLands: row.total_lands,
          occupiedLands: row.occupied_lands,
          totalScenes: row.total_scenes,
          scenesWithOptimizedAssets: row.scenes_with_optimized,
          scenesWithoutOptimizedAssets: row.scenes_without_optimized,
          optimizationPercentage: parseFloat(row.optimization_percentage),
          scenesWithReports: row.scenes_with_reports,
          successfulOptimizations: row.successful_optimizations,
          failedOptimizations: row.failed_optimizations
        }
      }))
    };

    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    // Return empty history if table doesn't exist yet
    res.status(200).json({ entries: [] });
  }
}