// Vercel serverless function for producer queue metrics

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    secret,
    queueDepth
  } = req.body;

  const expectedSecret = process.env.MONITORING_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (queueDepth === undefined) {
    return res.status(400).json({ error: 'Missing required field: queueDepth' });
  }

  try {
    if (!process.env.POSTGRES_URL) {
      return res.status(200).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const { sql } = await import('@vercel/postgres');

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline_queue_metrics (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        queue_depth INTEGER DEFAULT 0
      )
    `;

    // Insert new metrics entry
    await sql`
      INSERT INTO pipeline_queue_metrics (queue_depth) VALUES (${queueDepth})
    `;

    // Keep only the last 15000 entries (~10 days of data at 1 report/minute)
    await sql`
      DELETE FROM pipeline_queue_metrics
      WHERE id NOT IN (
        SELECT id FROM pipeline_queue_metrics
        ORDER BY timestamp DESC
        LIMIT 15000
      )
    `;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating queue metrics:', error);
    res.status(500).json({ error: 'Failed to update queue metrics: ' + error.message });
  }
}
