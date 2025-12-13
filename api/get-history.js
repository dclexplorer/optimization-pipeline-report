// Vercel serverless function to get history from PostgreSQL
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if database is configured
    if (!process.env.POSTGRES_URL) {
      console.log('PostgreSQL not configured yet');
      return res.status(200).json({ 
        entries: [],
        message: 'Database not configured. History will be available after database setup.'
      });
    }

    const { sql } = await import('@vercel/postgres');
    
    // First check if the table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'optimization_history'
      );
    `;
    
    if (!tableCheck.rows[0].exists) {
      console.log('History table does not exist yet');
      return res.status(200).json({ 
        entries: [],
        message: 'History table will be created on first report generation.'
      });
    }

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
    console.error('Error fetching history:', error.message);
    // Return empty history with error details for debugging
    res.status(200).json({ 
      entries: [],
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database error',
      message: 'Unable to fetch history. Database may not be configured.'
    });
  }
}