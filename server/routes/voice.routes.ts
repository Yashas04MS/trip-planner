import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { requireUserAuth, type AuthenticatedRequest } from '../middleware/auth';
import { store } from '../lib/store';
import { listResolvedPersonaVoices, synthesizeMurfSpeech } from '../providers/murf';

export const voiceRouter = Router();

const TtsSchema = z.object({
  text: z.string().min(1).max(1200),
  persona: z.enum(['aria', 'jasper', 'maya', 'leo']).optional(),
  cadence: z.number().min(0.75).max(1.5).optional(),
});

voiceRouter.get('/voices', requireUserAuth, async (_req: AuthenticatedRequest, res) => {
  const personas = await listResolvedPersonaVoices();
  return res.json({
    configured: env.hasMurf,
    personas,
  });
});

voiceRouter.post('/tts', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = TtsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Text is required for speech synthesis' });
  }
  const prefs = await store.getPreferences(req.userId!);
  const result = await synthesizeMurfSpeech({
    text: parsed.data.text,
    persona: parsed.data.persona ?? prefs.voice_persona ?? 'aria',
    cadence: parsed.data.cadence ?? prefs.voice_cadence ?? 1.0,
  });
  return res.json(result);
});
