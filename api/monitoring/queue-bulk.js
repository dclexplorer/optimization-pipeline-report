// Vercel serverless function to trigger bulk queue additions
// Adds multiple scenes to the priority queue using the bulk endpoint

// Increase timeout for large batches (max 60s for hobby, 300s for pro)
export const config = {
  maxDuration: 60,
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

  const { password, sceneIds, contentServerUrls } = req.body;

  // Verify frontend password
  const expectedPassword = '#Decentraland2025';
  if (password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Validate sceneIds
  if (!sceneIds || !Array.isArray(sceneIds) || sceneIds.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid sceneIds array' });
  }

  // Get producer configuration
  const producerUrl = process.env.PRODUCER_URL;
  const tmpSecret = process.env.PRODUCER_TMP_SECRET;

  if (!producerUrl || !tmpSecret) {
    return res.status(500).json({
      error: 'Producer not configured. Set PRODUCER_URL and PRODUCER_TMP_SECRET environment variables.'
    });
  }

  // Filter valid sceneIds
  const validSceneIds = sceneIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
  const invalidCount = sceneIds.length - validSceneIds.length;

  // Build entities array for bulk endpoint
  const entities = validSceneIds.map(sceneId => ({
    entity: {
      entityId: sceneId.trim(),
      authChain: []
    },
    contentServerUrls: contentServerUrls || ['https://peer.decentraland.org/content']
  }));

  try {
    // Use the bulk endpoint (POST /queue-tasks)
    const response = await fetch(`${producerUrl}/queue-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': tmpSecret
      },
      body: JSON.stringify({
        entities,
        prioritize: true
      }),
      signal: AbortSignal.timeout(55000) // 55s timeout (just under Vercel's 60s limit)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: `Producer returned error: ${errorText}`
      });
    }

    const result = await response.json();

    // Add invalid sceneIds to failed count
    if (invalidCount > 0) {
      result.failed = (result.failed || 0) + invalidCount;
      result.results = result.results || { success: [], failed: [] };
      for (let i = 0; i < invalidCount; i++) {
        result.results.failed.push({ entityId: 'invalid', error: 'Invalid sceneId' });
      }
    }

    res.status(200).json({
      success: true,
      total: sceneIds.length,
      queued: result.queued || 0,
      failed: result.failed || 0,
      results: result.results || { success: [], failed: [] }
    });
  } catch (error) {
    console.error('Error calling bulk queue endpoint:', error);

    if (error.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Request to producer timed out' });
    }

    res.status(500).json({
      error: 'Failed to queue scenes: ' + error.message
    });
  }
}
