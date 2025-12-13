// Database setup endpoint - creates necessary tables
// This should be run once to initialize the database

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify secret for setup
  const { secret } = req.body || {};
  if (secret !== process.env.MONITORING_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!process.env.POSTGRES_URL) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { sql } = await import('@vercel/postgres');

    // Create pipeline_consumers table
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline_consumers (
        id VARCHAR(36) PRIMARY KEY,
        process_method VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        current_scene_id VARCHAR(255),
        current_step VARCHAR(100),
        progress_percent INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        last_heartbeat TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        jobs_completed INTEGER DEFAULT 0,
        jobs_failed INTEGER DEFAULT 0,
        avg_processing_time_ms INTEGER DEFAULT 0
      )
    `;

    // Drop old queue metrics table and recreate with new schema
    await sql`DROP TABLE IF EXISTS pipeline_queue_metrics`;

    // Create pipeline_queue_metrics table
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline_queue_metrics (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        queue_depth INTEGER DEFAULT 0
      )
    `;

    // Create pipeline_process_history table
    await sql`
      CREATE TABLE IF NOT EXISTS pipeline_process_history (
        id SERIAL PRIMARY KEY,
        consumer_id VARCHAR(36) NOT NULL,
        scene_id VARCHAR(255) NOT NULL,
        process_method VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP NOT NULL,
        duration_ms INTEGER NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_history_consumer ON pipeline_process_history(consumer_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_history_created ON pipeline_process_history(created_at DESC)
    `;

    res.status(200).json({ success: true, message: 'Database tables created successfully' });
  } catch (error) {
    console.error('Error setting up database:', error);
    res.status(500).json({ error: 'Failed to setup database: ' + error.message });
  }
}
