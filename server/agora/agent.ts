import { env } from '../config/env';
import { resolveDefaultMurfVoice } from '../providers/murf';
import { buildAgoraRtcToken } from './token';

export interface StartAgoraAgentResult {
  agentId: string | null;
  mode: 'agora_live' | 'browser_voice';
}

export async function startAgoraConversationalAgent(params: {
  sessionId: string;
  channel: string;
  userUid: number;
}): Promise<StartAgoraAgentResult> {
  if (!env.hasAgora) {
    return { agentId: null, mode: 'browser_voice' };
  }

  const agentUid = Number(env.AGORA_AGENT_UID || '0');
  const agentToken = buildAgoraRtcToken(params.channel, agentUid);
  const auth = Buffer.from(
    `${env.AGORA_CUSTOMER_ID}:${env.AGORA_CUSTOMER_SECRET}`,
  ).toString('base64');
  const resolvedMurf = await resolveDefaultMurfVoice('aria');

  const payload = {
    name: `wayfinder-${params.sessionId}`,
    properties: {
      channel: params.channel,
      token: agentToken,
      agent_rtc_uid: String(agentUid),
      remote_rtc_uids: [String(params.userUid)],
      enable_string_uid: false,
      idle_timeout: 120,
      llm: {
        url: `${env.PUBLIC_BASE_URL}/api/llm/chat/completions?sid=${params.sessionId}`,
        api_key: env.LLM_SHARED_SECRET,
        system_messages: [
          {
            role: 'system',
            content:
              'You are Wayfinder, a quiet-luxury executive travel concierge. Keep spoken replies concise.',
          },
        ],
        greeting_message:
          "Good day, I'm your Wayfinder concierge. Where would you like to travel?",
        failure_message: 'I hit a brief snag. Could you repeat that?',
        max_history: 10,
        params: { model: 'wayfinder-orchestrator' },
      },
      asr: { language: 'en-US' },
      tts: {
        vendor: 'murf',
        params: {
          api_key: env.MURF_API_KEY,
          base_url: env.MURF_BASE_URL,
          voiceId: resolvedMurf.voiceId,
          locale: resolvedMurf.locale || env.MURF_LOCALE,
          rate: 0,
          pitch: 0,
          model: 'FALCON',
          sample_rate: 24000,
        },
      },
    },
  };

  try {
    const endpoint = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${env.AGORA_APP_ID}/join`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { agentId: null, mode: 'browser_voice' };
    }
    const json = (await res.json()) as { agent_id?: string };
    return {
      agentId: json.agent_id || `agora_${params.sessionId}`,
      mode: 'agora_live',
    };
  } catch {
    return { agentId: null, mode: 'browser_voice' };
  }
}

export async function stopAgoraConversationalAgent(agentId: string | null): Promise<void> {
  if (!agentId || !env.hasAgora) return;
  const auth = Buffer.from(
    `${env.AGORA_CUSTOMER_ID}:${env.AGORA_CUSTOMER_SECRET}`,
  ).toString('base64');
  try {
    await fetch(
      `https://api.agora.io/api/conversational-ai-agent/v2/projects/${env.AGORA_APP_ID}/agents/${agentId}/leave`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch {
    // Ignore leave error on teardown
  }
}
