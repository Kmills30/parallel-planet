// api/nova.js — Diagnostic Nova function (Vercel)

// GET  /api/nova           -> { ok:true, hasKey:true/false }
// POST /api/nova {prompt}  -> { reply: "..."} or a clear error JSON

export default async function handler(req, res) {
  // CORS (optional)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  // Simple health check (no secrets)
  if (req.method === 'GET') {
    const hasKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-'));
    return res.status(200).json({ ok: true, hasKey });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use GET (health) or POST with { "prompt": "..." }' });
  }

  try {
    // Handle both string and object bodies
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const body = raw ? JSON.parse(raw) : {};
    const prompt = String(body.prompt || '').trim();

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt', example: { prompt: 'Describe a desert creature' } });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Missing OPENAI_API_KEY',
        hint: 'Add it in Vercel → Project → Settings → Environment Variables (Production), then Redeploy.'
      });
    }

    const payload = {
      model: 'gpt-5',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: "You are Nova, the planet's consciousness in Parallel Planet. Speak in-world, vivid, friendly, ≤120 words. Decline harmful content."
            }
          ]
        },
        { role: 'user', content: [{ type: 'text', text: prompt }] }
      ]
    };

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      // Surface real error text so we can fix fast
      const detail = await r.text().catch(() => '(no body)');
      return res.status(502).json({ error: 'OpenAI error', status: r.status, detail });
    }

    const data = await r.json();
    const reply =
      data.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      data?.choices?.[0]?.message?.content ||
      null;

    if (!reply) {
      return res.status(200).json({
        reply: null,
        note: 'No textual output found. Check model/response shape.',
        keys: Object.keys(data || {})
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}

