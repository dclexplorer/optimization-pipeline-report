// Vercel serverless function for consumer heartbeat

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
    processMethod,
    status,
    currentSceneId,
    currentStep,
    progressPercent,
    startedAt
  } = req.body;

  const expectedSecret = process.env.MONITORING_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!consumerId || !processMethod || !status) {
    return res.status(400).json({ error: 'Missing required fields: consumerId, processMethod, status' });
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

    // Upsert consumer record
    await sql`
      INSERT INTO pipeline_consumers (
        id,
        process_method,
        status,
        current_scene_id,
        current_step,
        progress_percent,
        started_at,
        last_heartbeat
      ) VALUES (
        ${consumerId},
        ${processMethod},
        ${status},
        ${currentSceneId || null},
        ${currentStep || null},
        ${progressPercent || 0},
        ${startedAt ? new Date(startedAt) : null},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        process_method = ${processMethod},
        status = ${status},
        current_scene_id = ${currentSceneId || null},
        current_step = ${currentStep || null},
        progress_percent = ${progressPercent || 0},
        started_at = ${startedAt ? new Date(startedAt) : null},
        last_heartbeat = NOW()
    `;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat: ' + error.message });
  }
}
