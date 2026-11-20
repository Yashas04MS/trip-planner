import type { VoicePersona } from '../../shared/types';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export interface MurfVoiceCatalogItem {
  voiceId: string;
  displayName: string;
  locale: string;
  gender?: string;
  availableStyles: string[];
}

export interface PersonaVoiceTarget {
  persona: VoicePersona;
  voiceId: string;
  style: string;
  displayName: string;
  locale: string;
}

const PERSONA_PREFERENCES: Record<
  VoicePersona,
  {
    preferredIds: string[];
    preferredStyle: string;
    fallbackVoiceId: string;
    fallbackDisplayName: string;
    fallbackLocale: string;
    preferredGender: 'Female' | 'Male';
  }
> = {
  aria: {
    preferredIds: ['en-US-natalie', 'en-US-alina', 'en-IN-isha'],
    preferredStyle: 'Conversational',
    fallbackVoiceId: 'en-US-natalie',
    fallbackDisplayName: 'Natalie (US)',
    fallbackLocale: 'en-US',
    preferredGender: 'Female',
  },
  jasper: {
    preferredIds: ['en-UK-theo', 'en-US-wayne', 'en-IN-eashwar'],
    preferredStyle: 'Narration',
    fallbackVoiceId: 'en-UK-theo',
    fallbackDisplayName: 'Theo (UK)',
    fallbackLocale: 'en-UK',
    preferredGender: 'Male',
  },
  maya: {
    preferredIds: ['en-US-julia', 'en-IN-isha', 'en-UK-hazel'],
    preferredStyle: 'Calm',
    fallbackVoiceId: 'en-US-julia',
    fallbackDisplayName: 'Julia (US)',
    fallbackLocale: 'en-US',
    preferredGender: 'Female',
  },
  leo: {
    preferredIds: ['en-US-wayne', 'en-IN-rohan', 'en-US-daniel'],
    preferredStyle: 'Conversational',
    fallbackVoiceId: 'en-US-wayne',
    fallbackDisplayName: 'Wayne (US)',
    fallbackLocale: 'en-US',
    preferredGender: 'Male',
  },
};

const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedCatalog: { items: MurfVoiceCatalogItem[]; fetchedAt: number } | null = null;

export function pickVoiceStyle(availableStyles: string[], preferredStyle: string): string {
  if (!availableStyles.length) return preferredStyle;
  const exact = availableStyles.find((s) => s.toLowerCase() === preferredStyle.toLowerCase());
  if (exact) return exact;
  const conversational = availableStyles.find((s) => s.toLowerCase() === 'conversational');
  if (conversational) return conversational;
  return availableStyles[0];
}

export function resolveMurfVoiceFromCatalog(
  persona: VoicePersona,
  catalog: MurfVoiceCatalogItem[],
  explicitVoiceId?: string,
): PersonaVoiceTarget {
  const pref = PERSONA_PREFERENCES[persona] ?? PERSONA_PREFERENCES.aria;

  if (explicitVoiceId) {
    const explicitMatch = catalog.find((item) => item.voiceId === explicitVoiceId);
    if (explicitMatch) {
      return {
        persona,
        voiceId: explicitMatch.voiceId,
        style: pickVoiceStyle(explicitMatch.availableStyles, pref.preferredStyle),
        displayName: explicitMatch.displayName || explicitMatch.voiceId,
        locale: explicitMatch.locale || pref.fallbackLocale,
      };
    }
  }

  for (const candidateId of pref.preferredIds) {
    const hit = catalog.find((item) => item.voiceId === candidateId);
    if (hit) {
      return {
        persona,
        voiceId: hit.voiceId,
        style: pickVoiceStyle(hit.availableStyles, pref.preferredStyle),
        displayName: hit.displayName || hit.voiceId,
        locale: hit.locale || pref.fallbackLocale,
      };
    }
  }

  const englishVoices = catalog.filter((item) =>
    String(item.locale || '').toLowerCase().startsWith('en'),
  );
  const genderMatch = englishVoices.find(
    (item) =>
      String(item.gender || '').toLowerCase() === pref.preferredGender.toLowerCase(),
  );
  const anyMatch = genderMatch ?? englishVoices[0] ?? catalog[0];

  if (anyMatch) {
    return {
      persona,
      voiceId: anyMatch.voiceId,
      style: pickVoiceStyle(anyMatch.availableStyles, pref.preferredStyle),
      displayName: anyMatch.displayName || anyMatch.voiceId,
      locale: anyMatch.locale || pref.fallbackLocale,
    };
  }

  return {
    persona,
    voiceId: pref.fallbackVoiceId,
    style: pref.preferredStyle,
    displayName: pref.fallbackDisplayName,
    locale: pref.fallbackLocale,
  };
}

export async function getMurfVoiceCatalog(forceRefresh = false): Promise<MurfVoiceCatalogItem[]> {
  if (!env.hasMurf) {
    return [];
  }

  if (
    !forceRefresh &&
    cachedCatalog &&
    Date.now() - cachedCatalog.fetchedAt < CACHE_TTL_MS
  ) {
    return cachedCatalog.items;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.murf.ai/v1/speech/voices?model=gen2', {
      headers: {
        Accept: 'application/json',
        'api-key': env.MURF_API_KEY,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return cachedCatalog?.items ?? [];
    }

    const raw = (await res.json()) as Array<{
      voiceId?: string;
      displayName?: string;
      locale?: string;
      gender?: string;
      availableStyles?: string[];
    }>;

    if (!Array.isArray(raw)) {
      return cachedCatalog?.items ?? [];
    }

    const items: MurfVoiceCatalogItem[] = raw
      .filter((v) => typeof v?.voiceId === 'string' && v.voiceId.length > 0)
      .map((v) => ({
        voiceId: String(v.voiceId),
        displayName: String(v.displayName || v.voiceId),
        locale: String(v.locale || 'en-US'),
        gender: v.gender ? String(v.gender) : undefined,
        availableStyles: Array.isArray(v.availableStyles)
          ? v.availableStyles.map(String)
          : ['Conversational'],
      }));

    cachedCatalog = { items, fetchedAt: Date.now() };
    return items;
  } catch {
    return cachedCatalog?.items ?? [];
  }
}

export async function listResolvedPersonaVoices(): Promise<PersonaVoiceTarget[]> {
  const catalog = await getMurfVoiceCatalog();
  const personas: VoicePersona[] = ['aria', 'jasper', 'maya', 'leo'];
  return personas.map((p) => resolveMurfVoiceFromCatalog(p, catalog));
}

export async function resolveDefaultMurfVoice(
  persona: VoicePersona = 'aria',
): Promise<PersonaVoiceTarget> {
  const catalog = await getMurfVoiceCatalog();
  return resolveMurfVoiceFromCatalog(persona, catalog);
}

export interface MurfSynthesisResult {
  audioUrl: string | null;
  voiceId: string;
  displayName: string;
  persona: VoicePersona;
  mode: 'murf' | 'browser_fallback';
  durationSec?: number;
}

export async function synthesizeMurfSpeech(params: {
  text: string;
  persona?: VoicePersona;
  cadence?: number;
}): Promise<MurfSynthesisResult> {
  const persona: VoicePersona = params.persona ?? 'aria';
  const resolved = await resolveDefaultMurfVoice(persona);
  const cleanText = params.text.trim().slice(0, 1200);

  if (!env.hasMurf || !cleanText) {
    return {
      audioUrl: null,
      voiceId: resolved.voiceId,
      displayName: resolved.displayName,
      persona,
      mode: 'browser_fallback',
    };
  }

  // Convert 0.8..1.4 multiplier to Murf rate (-25..+25)
  const cadence = typeof params.cadence === 'number' ? params.cadence : 1.0;
  const murfRate = Math.max(-25, Math.min(25, Math.round((cadence - 1.0) * 50)));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);

    const res = await fetch('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': env.MURF_API_KEY,
      },
      body: JSON.stringify({
        voiceId: resolved.voiceId,
        style: resolved.style,
        modelVersion: 'GEN2',
        text: cleanText,
        rate: murfRate,
        pitch: 0,
        sampleRate: 24000,
        format: 'MP3',
        channelType: 'MONO',
        encodeAsBase64: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.warn('Murf API returned non-OK status, falling back to Web Speech', {
        status: res.status,
        voiceId: resolved.voiceId,
        detail: errText.slice(0, 160),
      });
      return {
        audioUrl: null,
        voiceId: resolved.voiceId,
        displayName: resolved.displayName,
        persona,
        mode: 'browser_fallback',
      };
    }

    const data = (await res.json()) as {
      audioFile?: string;
      audioLengthInSeconds?: number;
    };

    if (!data.audioFile) {
      return {
        audioUrl: null,
        voiceId: resolved.voiceId,
        displayName: resolved.displayName,
        persona,
        mode: 'browser_fallback',
      };
    }

    return {
      audioUrl: data.audioFile,
      voiceId: resolved.voiceId,
      displayName: resolved.displayName,
      persona,
      mode: 'murf',
      durationSec: data.audioLengthInSeconds,
    };
  } catch (err) {
    logger.warn('Murf synthesis timed out or failed', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    return {
      audioUrl: null,
      voiceId: resolved.voiceId,
      displayName: resolved.displayName,
      persona,
      mode: 'browser_fallback',
    };
  }
}
