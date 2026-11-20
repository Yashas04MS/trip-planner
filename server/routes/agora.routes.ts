import { Router } from 'express';
import { z } from 'zod';
import { startAgoraConversationalAgent, stopAgoraConversationalAgent } from '../agora/agent';
import { buildAgoraRtcToken } from '../agora/token';
import { runConciergeTurn } from '../agents/orchestrator';
import { env } from '../config/env';
import { store, subscribeSessionEvents } from '../lib/store';
import { requireUserAuth, type AuthenticatedRequest } from '../middleware/auth';

export const agoraRouter = Router();

agoraRouter.post('/session/start', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const channel = `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const userUid = Math.floor(10000 + Math.random() * 80000);

  const session = await store.createVoiceSession(userId, channel, null);
  const userToken = buildAgoraRtcToken(channel, userUid);
  const agentRes = await startAgoraConversationalAgent({
    sessionId: session.id,
    channel,
    userUid,
  });

  if (agentRes.agentId) {
    session.agent_id = agentRes.agentId;
  }

  await store.addMessage(
    session.id,
    'assistant',
    "Good day, I'm your Wayfinder concierge. Where would you like to travel?",
  );

  const snapshot = await store.getSessionSnapshot(session.id);

  return res.json({
    appId: env.AGORA_APP_ID || '',
    channel,
    token: userToken,
    uid: userUid,
    sessionId: session.id,
    mode: agentRes.mode,
    rtcReady: env.hasAgoraRtc,
    snapshot,
  });
});

agoraRouter.post('/session/stop', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const sessionId = String(req.body?.sessionId || '');
  const session = await store.getSession(sessionId);
  if (!session || session.user_id !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  await stopAgoraConversationalAgent(session.agent_id);
  const ended = await store.endVoiceSession(sessionId);
  return res.json({ session: ended });
});

agoraRouter.get('/session/active', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const sessions = await store.listSessionsForUser(req.userId!);
  const active = sessions.find((s) => s.status === 'active') ?? sessions[0] ?? null;
  if (!active) {
    return res.json({ snapshot: null });
  }
  const snapshot = await store.getSessionSnapshot(active.id);
  return res.json({ snapshot });
});

agoraRouter.get('/session/:id/snapshot', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const session = await store.getSession(String(req.params.id));
  if (!session || session.user_id !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const snapshot = await store.getSessionSnapshot(session.id);
  return res.json({ snapshot });
});

agoraRouter.get('/session/:id/events', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const session = await store.getSession(String(req.params.id));
  if (!session || session.user_id !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const snapshot = await store.getSessionSnapshot(session.id);
  if (snapshot) {
    res.write(`event: session:snapshot\ndata: ${JSON.stringify({ type: 'session:snapshot', data: snapshot })}\n\n`);
  }

  const unsubscribe = subscribeSessionEvents(session.id, (payload) => {
    res.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`);
  });

  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

const TurnSchema = z.object({
  message: z.string().min(1).max(2000),
});

agoraRouter.post('/session/:id/turn', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const session = await store.getSession(String(req.params.id));
  if (!session || session.user_id !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const parsed = TurnSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  const out = await runConciergeTurn({
    sessionId: session.id,
    userText: parsed.data.message,
    mode: 'json',
  });
  const snapshot = await store.getSessionSnapshot(session.id);
  return res.json({ ...out, snapshot });
});
