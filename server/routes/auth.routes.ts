import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { store } from '../lib/store';
import {
  clearSessionCookie,
  getDemoIdentity,
  parseCookies,
  requireUserAuth,
  SESSION_COOKIE_NAME,
  setSessionCookie,
  signSessionToken,
  verifySessionToken,
  type AuthenticatedRequest,
} from '../middleware/auth';

export const authRouter = Router();

authRouter.get('/session', async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  const verified = token ? verifySessionToken(token) : null;
  if (!verified) {
    return res.json({
      authenticated: false,
      profile: null,
      preferences: null,
      calendarConnected: false,
    });
  }
  const [profile, preferences, calendarConn] = await Promise.all([
    store.getProfile(verified.uid),
    store.getPreferences(verified.uid),
    store.getCalendarConnection(verified.uid),
  ]);
  return res.json({
    authenticated: true,
    profile,
    preferences,
    calendarConnected: Boolean(calendarConn),
  });
});

authRouter.post('/demo', async (_req, res) => {
  const demo = getDemoIdentity();
  const profile = await store.ensureProfile(demo.id, demo.email, demo.full_name);
  const preferences = await store.getPreferences(demo.id);
  const token = signSessionToken(profile.id, profile.email);
  setSessionCookie(res, token);
  return res.json({ profile, preferences, token });
});

const LoginSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(100).optional(),
});

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const demo = getDemoIdentity();
  const uid =
    email === demo.email
      ? demo.id
      : crypto
          .createHash('sha256')
          .update(email)
          .digest('hex')
          .slice(0, 32)
          .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

  const profile = await store.ensureProfile(
    uid,
    email,
    parsed.data.fullName || email.split('@')[0],
  );
  const preferences = await store.getPreferences(uid);
  const token = signSessionToken(profile.id, profile.email);
  setSessionCookie(res, token);
  return res.json({ profile, preferences, token });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

authRouter.get('/me', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const [profile, preferences, calendarConn] = await Promise.all([
    store.getProfile(userId),
    store.getPreferences(userId),
    store.getCalendarConnection(userId),
  ]);
  return res.json({
    profile,
    preferences,
    calendarConnected: Boolean(calendarConn),
  });
});

const UpdatePrefsSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  home_city: z.string().min(1).max(80).optional(),
  home_airport: z.string().min(3).max(4).optional(),
  default_budget: z.number().min(5000).max(5000000).optional(),
  cabin: z.enum(['economy', 'premium_economy', 'business']).optional(),
  hotel_stars: z.number().int().min(3).max(5).optional(),
  interests: z.array(z.string()).optional(),
  avoid: z.array(z.string()).optional(),
  voice_persona: z.enum(['aria', 'jasper', 'maya', 'leo']).optional(),
  voice_cadence: z.number().min(0.8).max(1.4).optional(),
  read_prices_aloud: z.boolean().optional(),
  approval_ttl_minutes: z.number().int().min(1).max(30).optional(),
});

authRouter.patch('/preferences', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = UpdatePrefsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid preferences payload' });
  }
  const userId = req.userId!;
  const data = parsed.data;

  const profile = await store.updateProfile(userId, {
    ...(data.full_name ? { full_name: data.full_name } : {}),
    ...(data.home_city ? { home_city: data.home_city } : {}),
    ...(data.home_airport ? { home_airport: data.home_airport } : {}),
  });

  const preferences = await store.updatePreferences(userId, {
    ...(data.default_budget !== undefined ? { default_budget: data.default_budget } : {}),
    ...(data.cabin ? { cabin: data.cabin } : {}),
    ...(data.hotel_stars !== undefined ? { hotel_stars: data.hotel_stars } : {}),
    ...(data.interests ? { interests: data.interests } : {}),
    ...(data.avoid ? { avoid: data.avoid } : {}),
    ...(data.voice_persona ? { voice_persona: data.voice_persona } : {}),
    ...(data.voice_cadence !== undefined ? { voice_cadence: data.voice_cadence } : {}),
    ...(data.read_prices_aloud !== undefined ? { read_prices_aloud: data.read_prices_aloud } : {}),
    ...(data.approval_ttl_minutes !== undefined
      ? { approval_ttl_minutes: data.approval_ttl_minutes }
      : {}),
  });

  return res.json({ profile, preferences });
});

authRouter.post('/reset-memory', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const preferences = await store.resetPersonaMemory(req.userId!);
  return res.json({ preferences });
});
