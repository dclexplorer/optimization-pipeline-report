// Vercel serverless function for top 20 slowest processing scenes

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.POSTGRES_URL) {
      return res.status(200).json({
        ranking: [],
        message: 'Database not configured'
      });
    }

    const { sql } = await import('@vercel/postgres');

    // Get top 20 slowest successful processing scenes
    const result = await sql`
      SELECT
        consumer_id,
        scene_id,
        process_method,
        status,
        duration_ms,
        completed_at
      FROM pipeline_process_history
      WHERE status = 'success'
      ORDER BY duration_ms DESC
      LIMIT 20
    `;

    const ranking = result.rows.map((row, index) => ({
      rank: index + 1,
      consumerId: row.consumer_id,
      sceneId: row.scene_id,
      processMethod: row.process_method,
      status: row.status,
      durationMs: row.duration_ms,
      completedAt: row.completed_at
    }));

    res.status(200).json({ ranking });
  } catch (error) {
    console.error('Error fetching ranking:', error);
    res.status(500).json({ error: 'Failed to fetch ranking: ' + error.message });
  }
}
