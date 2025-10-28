// api/nova.js — simple test to verify routing + POST body

export default async function handler(req, res) {
  // Health check in browser: GET /api/nova
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, route: '/api/nova', expects: 'POST with { prompt }' });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const prompt = String(body.prompt || '').trim();
      return res.status(200).json({ reply: `(test) You said: ${prompt || 'nothing'}` });
    } catch (e) {
      return res.status(400).json({ error: 'Bad JSON body', detail: String(e) });
    }
  }

  return res.status(405).json({ error: 'Use GET (health) or POST with { prompt }' });
}
