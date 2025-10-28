// api/nova.js — Robust Nova function with diagnostics

export default async function handler(req, res) {
  // CORS (optional)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST', hint: 'POST /api/nova with { "prompt": "..." }' });
  }

  try {
    // Body parsing that works for both string & object
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const body = raw ? JSON.parse(raw) : {};
    const prompt = String(body.prompt || '').trim();

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt', example: { prompt: 'Describe a desert creature' } });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY in Vercel → Project → Settings → Environment Variables (Production)' });
    }

    // OpenAI Responses API payload
    const payload = {
      model: 'gpt-5',
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text:
                "You are Nova, the planet's consciousness in Parallel Planet. Speak in-world, vivid, friendly, in <=120 words. Decline harmful content."
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

    // If OpenAI errors, surface the details for troubleshooting
    if (!r.ok) {
      const detail = await r.text().catch(() => '(no body)');
      return res.status(502).json({ error: 'OpenAI error', status: r.status, detail });
    }

    const data = await r.json();
    // Pull text from common Responses API shapes
    const reply =
      data.output_text ||
      data?.output?.[0]?.content?.[0]?.text ||
      data?.choices?.[0]?.message?.content || // fallback for chat-style outputs
      null;

    if (!reply) {
      return res.status(200).json({
        reply: null,
        note: 'No textual output found. Check model/response shape.',
        raw_keys: Object.keys(data || {})
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}
