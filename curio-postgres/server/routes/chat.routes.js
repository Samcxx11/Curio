import express from 'express';

const router = express.Router();

// Replace this with your actual import if needed
import { DUMMY_NEWS } from './news.routes.js';

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
- Keep responses concise (2-4 sentences unless summary requested)
- Always mention validity score when discussing credibility
- If asked to summarize → 3-4 sentences
- If not in feed → say you only have today's articles
- Never hallucinate
- Plain text only`;


// POST /api/chat
router.post('/', async (req, res) => {
  const { message, history = [] } = req.body;

  // 🔴 Basic validation
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key') {
    return res.status(503).json({
      message: 'AI not configured. Add GEMINI_API_KEY to .env'
    });
  }

  try {
    // ✅ Clean & validate history
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-10)
          .filter(h => h.role && h.content)
          .map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(h.content) }]
          }))
      : [];

    const contents = [
      ...safeHistory,
      {
        role: 'user',
        parts: [{ text: message.trim() }]
      }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error ${response.status}`);
    }

    const data = await response.json();

    // 🔴 Safe extraction (Gemini responses can be messy)
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, I could not generate a response.';

    // ✅ Updated history (clean format)
    const updatedHistory = [
      ...history.slice(-10),
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: reply }
    ];

    return res.json({ reply, history: updatedHistory });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({
      message: err.message || 'Internal server error'
    });
  }
});

export default router;