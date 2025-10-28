// api/nova.js — Vercel Serverless Function for Nova (OpenAI Responses API)
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).send('');
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt } = body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

    const payload = {
      model: 'gpt-5',
      input: [
        { role: 'system', content: [{ type: 'text', text: "You are Nova, the planet's consciousness in Parallel Planet. Reply vividly, ≤120 words, decline harmful content." }] },
        { role: 'user', content: [{ type: 'text', text: String(prompt) }] }
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

    const data = await r.json();
    const reply = data.output_text || 'Nova is quiet...';

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}
