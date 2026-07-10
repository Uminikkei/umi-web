const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;

// Traduce en bloque los mensajes del chat cuando el usuario cambia ES <-> EN.
// Recibe { texts: string[], target: 'es'|'en' } y devuelve { translations: string[] }.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!CLAUDE_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { texts, target = 'en' } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts array is required' });
    }

    const targetName = target === 'en' ? 'English' : 'Spanish';

    const system = `You are a professional translator for the chat of Umi Nikkei Bar, a Nikkei (Japanese-Peruvian) restaurant in Coquimbo, Chile.
Translate every item of the given JSON array into ${targetName}.

Rules:
- Return the SAME number of items, in the SAME order.
- Preserve EXACTLY: line breaks, bullet lines that start with "- ", **bold** markers, emojis and prices (e.g. $13,990).
- Do NOT translate dish proper names (e.g. "Acevichado Roll", "Lomo saltado", "Gyozas trufadas", "Tiraditos Umi"): keep them as-is; only translate the surrounding words and descriptions.
- Keep "Umi", "Nikkei", "WhatsApp" and the button name "Mi Pedido" unchanged.
- If an item is already in ${targetName}, return it unchanged.

Return ONLY a valid JSON array of strings (the translations), with no explanation, no code fences.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: JSON.stringify(texts) }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[TRANSLATE] Claude API error:', errorData);
      return res.status(500).json({ error: 'Failed to translate' });
    }

    const data = await response.json();
    let out = (data.content[0].text || '').trim();
    // Quita posibles ``` o ```json envolventes
    out = out.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let translations;
    try {
      translations = JSON.parse(out);
    } catch (e) {
      console.error('[TRANSLATE] JSON parse failed:', out.slice(0, 200));
      translations = texts; // fallback: no rompas el chat
    }

    if (!Array.isArray(translations) || translations.length !== texts.length) {
      translations = texts;
    }

    return res.status(200).json({ translations });
  } catch (error) {
    console.error('[TRANSLATE] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
