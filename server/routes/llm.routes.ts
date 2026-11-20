import { Router } from 'express';
import { runConciergeTurn } from '../agents/orchestrator';
import { requireLlmSecret } from '../middleware/auth';

export const llmRouter = Router();

llmRouter.post('/chat/completions', requireLlmSecret, async (req, res) => {
  const sid = String(req.query.sid || req.body?.session_id || '');
  if (!sid) {
    return res.status(400).json({ error: 'Missing sid query parameter' });
  }

  const messages = Array.isArray(req.body?.messages)
    ? (req.body.messages as Array<{ role: string; content: string }>)
    : [];
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

  if (!lastUser) {
    return res.status(400).json({ error: 'No user message provided' });
  }

  try {
    await runConciergeTurn({
      sessionId: sid,
      userText: lastUser,
      res,
      mode: 'openai_sse',
    });
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Orchestrator failure',
      });
    }
    res.end();
  }
});
