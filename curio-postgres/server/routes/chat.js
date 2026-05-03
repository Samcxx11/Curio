const router = require('express').Router();

const { DUMMY_NEWS } = require('./news');

const SYSTEM_PROMPT = `You are Curio AI, a smart news assistant embedded in the Curio fact-checking platform.

You have access to today's news feed. Here it is:

${JSON.stringify(DUMMY_NEWS, null, 2)}

Your capabilities:
- Summarize any news article from the feed when asked
- Answer questions about any article (credibility, source, what it means)
- Explain why an article has a high or low validity score
- Compare multiple articles
- Answer general fact-checking or media literacy questions

Rules:
- Keep responses concise and conversational (2-4 sentences unless a full summary is requested)
- Always mention the validity score when discussing an article's credibility
- If asked to summarize, give a clean 3-4 sentence summary
- If the user asks about something not in the feed, say you only have today's articles
- Never make up news or facts
- Respond in plain text only, no markdown`;

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0)
    return res.status(400).json({ message: 'Message is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key')
    return res.status(503).json({ message: 'AI chat is not configured. Add GEMINI_API_KEY to server/.env' });

  try {
    // Gemini uses a "contents" array with "parts"
    // We prepend the system prompt as the first user turn (Gemini Flash supports system instruction too)
    const contents = [
      // Previous conversation history
      ...history.slice(-10).map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      // Current user message
      { role: 'user', parts: [{ text: message.trim() }] },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          maxOutputTokens: 512,
          temperature:     0.7,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error ${response.status}`);
    }

    const data  = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
                  || 'Sorry, I could not generate a response.';

    // Update history for next turn (store in Anthropic-style format for simplicity)
    const updatedHistory = [
      ...history.slice(-10),
      { role: 'user',      content: message.trim() },
      { role: 'assistant', content: reply },
    ];

    res.json({ reply, history: updatedHistory });

  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
