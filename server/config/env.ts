import 'dotenv/config';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { ChaosMode } from '../../shared/types';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');
const EPHEMERAL_TOKEN_KEY = crypto.randomBytes(32).toString('base64');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  PUBLIC_BASE_URL: z.string().optional().default(''),
  APP_URL: z.string().optional().default(''),
  LLM_SHARED_SECRET: z.string().optional().default(''),
  CRON_SECRET: z.string().optional().default(''),
  TOKEN_ENC_KEY: z.string().optional().default(''),
  SESSION_SIGNING_KEY: z.string().optional().default(''),

  AGORA_APP_ID: z.string().optional().default(''),
  AGORA_APP_CERTIFICATE: z.string().optional().default(''),
  AGORA_CUSTOMER_ID: z.string().optional().default(''),
  AGORA_CUSTOMER_SECRET: z.string().optional().default(''),
  AGORA_AGENT_UID: z.string().optional().default('0'),

  MURF_API_KEY: z.string().optional().default(''),
  MURF_VOICE_ID: z.string().optional().default(''),
  MURF_BASE_URL: z
    .string()
    .optional()
    .default('wss://global.api.murf.ai/v1/speech/stream-input'),
  MURF_LOCALE: z.string().optional().default('en-US'),

  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-4-hydrogen'),

  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),

  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),

  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('Wayfinder <onboarding@resend.dev>'),

  USE_MOCK_TRAVEL: z.string().optional().default('true'),
  DUFFEL_ACCESS_TOKEN: z.string().optional().default(''),
  CHAOS_MODE: z
    .enum(['off', 'hotel_sold_out', 'flight_api_error', 'calendar_error'])
    .optional()
    .default('off'),
});

const parsed = EnvSchema.parse(process.env);
const supabaseKey = parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.SUPABASE_ANON_KEY;

export const env = {
  ...parsed,
  PUBLIC_BASE_URL:
    parsed.PUBLIC_BASE_URL || parsed.APP_URL || `http://localhost:${parsed.PORT}`,
  LLM_SHARED_SECRET: parsed.LLM_SHARED_SECRET || EPHEMERAL_SECRET,
  CRON_SECRET: parsed.CRON_SECRET || EPHEMERAL_SECRET,
  TOKEN_ENC_KEY: parsed.TOKEN_ENC_KEY || EPHEMERAL_TOKEN_KEY,
  SESSION_SIGNING_KEY: parsed.SESSION_SIGNING_KEY || EPHEMERAL_SECRET,
  USE_MOCK_TRAVEL: parsed.USE_MOCK_TRAVEL !== 'false',
  SUPABASE_KEY: supabaseKey,
  hasSupabase: Boolean(parsed.SUPABASE_URL && supabaseKey),
  hasAgoraRtc: Boolean(parsed.AGORA_APP_ID && parsed.AGORA_APP_CERTIFICATE),
  hasAgora: Boolean(
    parsed.AGORA_APP_ID &&
      parsed.AGORA_APP_CERTIFICATE &&
      parsed.AGORA_CUSTOMER_ID &&
      parsed.AGORA_CUSTOMER_SECRET,
  ),
  hasMurf: Boolean(parsed.MURF_API_KEY),
  hasGemini: Boolean(
    parsed.GEMINI_API_KEY && parsed.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
  ),
  hasGoogleOAuth: Boolean(parsed.GOOGLE_CLIENT_ID && parsed.GOOGLE_CLIENT_SECRET),
  hasResend: Boolean(parsed.RESEND_API_KEY),
  defaultChaosMode: parsed.CHAOS_MODE as ChaosMode,
};
