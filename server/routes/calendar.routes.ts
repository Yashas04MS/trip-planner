import { Router } from 'express';
import { env } from '../config/env';
import { getGoogleCalendarAuthUrl, handleGoogleOAuthCallback } from '../providers/google-calendar';
import { requireUserAuth, type AuthenticatedRequest } from '../middleware/auth';

export const calendarRouter = Router();

calendarRouter.get('/oauth/url', requireUserAuth, (req: AuthenticatedRequest, res) => {
  if (!env.hasGoogleOAuth) {
    return res.json({
      configured: false,
      url: null,
      message: 'Google OAuth client credentials are not configured in environment secrets yet.',
    });
  }
  const url = getGoogleCalendarAuthUrl(req.userId!);
  return res.json({ configured: true, url });
});

calendarRouter.get('/oauth/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code || !state) {
    return res.status(400).send('Missing OAuth code or state');
  }

  try {
    await handleGoogleOAuthCallback(code, state);
    return res.redirect('/settings?calendar=connected');
  } catch (err) {
    return res
      .status(500)
      .send(`Google Calendar OAuth failed: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
});
