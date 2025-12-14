// Vercel serverless function for job completion reporting

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
    consumerId,
    sceneId,
    processMethod,
    status,
    startedAt,
    completedAt,
    durationMs,
    errorMessage,
    isPriority
  } = req.body;

  const expectedSecret = process.env.MONITORING_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!consumerId || !sceneId || !processMethod || !status || !durationMs) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (!process.env.POSTGRES_URL) {
      return res.status(200).json({
        success: false,
        message: 'Database not configured'
      });
    }

    const { sql } = await import('@vercel/postgres');

    // Create history table if it doesn't exist
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
        created_at TIMESTAMP DEFAULT NOW(),
        is_priority BOOLEAN DEFAULT FALSE
      )
    `;

    // Create index if not exists (will fail silently if exists)
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_history_consumer ON pipeline_process_history(consumer_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_history_created ON pipeline_process_history(created_at DESC)`;
      await sql`ALTER TABLE pipeline_process_history ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE`;
    } catch (e) {
      // Ignore index creation errors
    }

    // Insert history entry
    await sql`
      INSERT INTO pipeline_process_history (
        consumer_id,
        scene_id,
        process_method,
        status,
        started_at,
        completed_at,
        duration_ms,
        error_message,
        is_priority
      ) VALUES (
        ${consumerId},
        ${sceneId},
        ${processMethod},
        ${status},
        ${new Date(startedAt)},
        ${new Date(completedAt)},
        ${durationMs},
        ${errorMessage || null},
        ${isPriority || false}
      )
    `;

    // Update consumer stats
    const isSuccess = status === 'success';

    // Get current consumer stats
    const consumerResult = await sql`
      SELECT jobs_completed, jobs_failed, avg_processing_time_ms
      FROM pipeline_consumers
      WHERE id = ${consumerId}
    `;

    if (consumerResult.rows.length > 0) {
      const consumer = consumerResult.rows[0];
      const totalJobs = consumer.jobs_completed + consumer.jobs_failed;
      const newAvg = totalJobs > 0
        ? Math.round((consumer.avg_processing_time_ms * totalJobs + durationMs) / (totalJobs + 1))
        : durationMs;

      await sql`
        UPDATE pipeline_consumers SET
          jobs_completed = jobs_completed + ${isSuccess ? 1 : 0},
          jobs_failed = jobs_failed + ${isSuccess ? 0 : 1},
          avg_processing_time_ms = ${newAvg},
          status = 'idle',
          current_scene_id = NULL,
          current_step = NULL,
          progress_percent = 0,
          started_at = NULL,
          is_priority = FALSE,
          last_job_status = ${status}
        WHERE id = ${consumerId}
      `;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error recording job completion:', error);
    res.status(500).json({ error: 'Failed to record job completion: ' + error.message });
  }
}
