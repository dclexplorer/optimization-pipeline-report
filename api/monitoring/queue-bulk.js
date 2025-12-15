// Vercel serverless function to trigger bulk queue additions
// Adds multiple scenes to the priority queue

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

  // Limit batch size to prevent abuse
  const MAX_BATCH_SIZE = 100;
  if (sceneIds.length > MAX_BATCH_SIZE) {
    return res.status(400).json({
      error: `Batch size too large. Maximum ${MAX_BATCH_SIZE} scenes per request.`
    });
  }

  // Get producer configuration
  const producerUrl = process.env.PRODUCER_URL;
  const tmpSecret = process.env.PRODUCER_TMP_SECRET;

  if (!producerUrl || !tmpSecret) {
    return res.status(500).json({
      error: 'Producer not configured. Set PRODUCER_URL and PRODUCER_TMP_SECRET environment variables.'
    });
  }

  const results = {
    success: [],
    failed: []
  };

  // Process scenes sequentially with small delay to avoid overwhelming producer
  for (const sceneId of sceneIds) {
    if (!sceneId || typeof sceneId !== 'string' || sceneId.trim() === '') {
      results.failed.push({ sceneId, error: 'Invalid sceneId' });
      continue;
    }

    try {
      const response = await fetch(`${producerUrl}/queue-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': tmpSecret
        },
        body: JSON.stringify({
          entity: {
            entityId: sceneId.trim(),
            authChain: []
          },
          contentServerUrls: contentServerUrls || ['https://peer.decentraland.org/content'],
          prioritize: true
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        results.failed.push({ sceneId, error: errorText });
      } else {
        results.success.push(sceneId);
      }
    } catch (error) {
      results.failed.push({ sceneId, error: error.message });
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  res.status(200).json({
    success: true,
    total: sceneIds.length,
    queued: results.success.length,
    failed: results.failed.length,
    results
  });
}
