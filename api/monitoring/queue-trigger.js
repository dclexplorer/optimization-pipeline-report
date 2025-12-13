// Vercel serverless function to trigger queue additions
// Proxies requests to the entity-queue-producer with authentication

// Rate limiting: track last request time per IP
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 1000; // 1 second

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

  const { password, entityId, prioritize, contentServerUrls } = req.body;

  // Verify frontend password
  const expectedPassword = '#Decentraland2025';
  if (password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Validate entityId
  if (!entityId || typeof entityId !== 'string' || entityId.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid entityId' });
  }

  // Rate limiting by IP
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const lastRequest = rateLimitMap.get(clientIp);

  if (lastRequest && (now - lastRequest) < RATE_LIMIT_MS) {
    const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
    return res.status(429).json({
      error: 'Rate limited. Please wait 1 second between requests.',
      retryAfter: waitTime
    });
  }
  rateLimitMap.set(clientIp, now);

  // Clean up old entries (older than 1 minute)
  for (const [ip, timestamp] of rateLimitMap.entries()) {
    if (now - timestamp > 60000) {
      rateLimitMap.delete(ip);
    }
  }

  // Get producer configuration
  const producerUrl = process.env.PRODUCER_URL;
  const tmpSecret = process.env.PRODUCER_TMP_SECRET;

  if (!producerUrl || !tmpSecret) {
    return res.status(500).json({
      error: 'Producer not configured. Set PRODUCER_URL and PRODUCER_TMP_SECRET environment variables.'
    });
  }

  try {
    // Forward request to entity-queue-producer
    const response = await fetch(`${producerUrl}/queue-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': tmpSecret
      },
      body: JSON.stringify({
        entity: {
          entityId: entityId.trim(),
          authChain: []
        },
        contentServerUrls: contentServerUrls || ['https://peer.decentraland.org/content'],
        prioritize: !!prioritize
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Producer error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Producer returned error: ${errorText}`
      });
    }

    const result = await response.text();

    res.status(200).json({
      success: true,
      message: `Entity ${entityId} queued successfully`,
      prioritized: !!prioritize,
      result
    });
  } catch (error) {
    console.error('Error triggering queue:', error);

    if (error.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Request to producer timed out' });
    }

    res.status(500).json({
      error: 'Failed to trigger queue: ' + error.message
    });
  }
}
