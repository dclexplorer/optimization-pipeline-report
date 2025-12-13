// Vercel serverless function for public monitoring status

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
        queue: null,
        consumers: [],
        recentHistory: [],
        message: 'Database not configured'
      });
    }

    const { sql } = await import('@vercel/postgres');

    // Get latest queue metrics
    let queue = null;
    try {
      const queueResult = await sql`
        SELECT queue_depth, timestamp
        FROM pipeline_queue_metrics
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      if (queueResult.rows.length > 0) {
        const row = queueResult.rows[0];
        queue = {
          queueDepth: row.queue_depth,
          lastUpdated: row.timestamp
        };
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Get all consumers and determine online/offline status
    let consumers = [];
    try {
      const consumersResult = await sql`
        SELECT
          id,
          process_method,
          status,
          current_scene_id,
          current_step,
          progress_percent,
          started_at,
          last_heartbeat,
          jobs_completed,
          jobs_failed,
          avg_processing_time_ms
        FROM pipeline_consumers
        ORDER BY last_heartbeat DESC
      `;

      const now = new Date();
      const OFFLINE_THRESHOLD_MS = 30 * 1000; // 30 seconds
      const CLEANUP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

      consumers = consumersResult.rows
        .filter(row => {
          // Remove consumers that haven't been seen in 5 minutes
          const lastHeartbeat = new Date(row.last_heartbeat);
          return (now - lastHeartbeat) < CLEANUP_THRESHOLD_MS;
        })
        .map(row => {
          const lastHeartbeat = new Date(row.last_heartbeat);
          const isOffline = (now - lastHeartbeat) > OFFLINE_THRESHOLD_MS;

          return {
            id: row.id,
            processMethod: row.process_method,
            status: isOffline ? 'offline' : row.status,
            currentSceneId: row.current_scene_id,
            currentStep: row.current_step,
            progressPercent: row.progress_percent,
            startedAt: row.started_at,
            lastHeartbeat: row.last_heartbeat,
            jobsCompleted: row.jobs_completed,
            jobsFailed: row.jobs_failed,
            avgProcessingTimeMs: row.avg_processing_time_ms
          };
        });

      // Cleanup old consumers from database
      await sql`
        DELETE FROM pipeline_consumers
        WHERE last_heartbeat < NOW() - INTERVAL '5 minutes'
      `;
    } catch (e) {
      // Table might not exist yet
    }

    // Get recent processing history (last 50 entries)
    let recentHistory = [];
    try {
      const historyResult = await sql`
        SELECT
          consumer_id,
          scene_id,
          process_method,
          status,
          duration_ms,
          completed_at
        FROM pipeline_process_history
        ORDER BY completed_at DESC
        LIMIT 50
      `;

      recentHistory = historyResult.rows.map(row => ({
        consumerId: row.consumer_id,
        sceneId: row.scene_id,
        processMethod: row.process_method,
        status: row.status,
        durationMs: row.duration_ms,
        completedAt: row.completed_at
      }));

      // Cleanup old history entries (older than 24 hours)
      await sql`
        DELETE FROM pipeline_process_history
        WHERE created_at < NOW() - INTERVAL '24 hours'
      `;
    } catch (e) {
      // Table might not exist yet
    }

    res.status(200).json({
      queue,
      consumers,
      recentHistory
    });
  } catch (error) {
    console.error('Error fetching monitoring status:', error);
    res.status(500).json({ error: 'Failed to fetch status: ' + error.message });
  }
}
