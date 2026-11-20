import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { timingSafeEqualStr } from '../lib/crypto';
import { DEMO_USER_ID, store } from '../lib/store';
import { getSupabaseAdmin } from '../lib/supabase';

export const SESSION_COOKIE_NAME = 'wf_session';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

interface SessionTokenPayload {
  uid: string;
  email: string;
  exp: number;
}

export function signSessionToken(uid: string, email: string): string {
  const payload: SessionTokenPayload = {
    uid,
    email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', env.SESSION_SIGNING_KEY)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto
    .createHmac('sha256', env.SESSION_SIGNING_KEY)
    .update(encoded)
    .digest('base64url');
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as SessionTokenPayload;
    if (!parsed.uid || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = decodeURIComponent(part.slice(eq + 1).trim());
    result[key] = val;
  }
  return result;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/',
  });
}

export async function requireUserAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (bearer) {
    // 1. Check Supabase JWT if configured
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.auth.getUser(bearer);
      if (!error && data?.user) {
        req.userId = data.user.id;
        req.userEmail = data.user.email ?? undefined;
        await store.ensureProfile(
          data.user.id,
          data.user.email,
          (data.user.user_metadata?.full_name as string | undefined) ?? undefined,
        );
        return next();
      }
    }

    // 2. Check our HMAC-signed session token
    const verified = verifySessionToken(bearer);
    if (verified) {
      req.userId = verified.uid;
      req.userEmail = verified.email;
      await store.ensureProfile(verified.uid, verified.email);
      return next();
    }
  }

  // 3. Check HttpOnly cookie (with CSRF check on mutating requests)
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME];
  if (cookieToken) {
    const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
    if (isMutating) {
      const hasCustomHeader = req.headers['x-requested-with'] === 'Wayfinder';
      const origin = req.headers.origin;
      const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
      const originMatches = origin ? origin.includes(host.split(',')[0].trim()) : false;
      if (!hasCustomHeader && !originMatches) {
        return res.status(403).json({ error: 'CSRF validation failed' });
      }
    }
    const verified = verifySessionToken(cookieToken);
    if (verified) {
      req.userId = verified.uid;
      req.userEmail = verified.email;
      await store.ensureProfile(verified.uid, verified.email);
      return next();
    }
  }

  return res.status(401).json({ error: 'Authentication required' });
}

export function requireLlmSecret(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || !timingSafeEqualStr(token, env.LLM_SHARED_SECRET)) {
    return res.status(401).json({ error: 'Invalid LLM shared secret' });
  }
  return next();
}

export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || !timingSafeEqualStr(token, env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Invalid cron secret' });
  }
  return next();
}

export function getDemoIdentity() {
  return {
    id: DEMO_USER_ID,
    email: 'aarav.mehta@wayfinder.travel',
    full_name: 'Aarav Mehta',
  };
}
