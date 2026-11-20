import { useCallback, useEffect, useRef } from 'react';
import type {
  ChaosMode,
  SessionSnapshot,
  VoicePersona,
  VoiceSession,
} from '../../shared/types';
import { joinAgoraVoiceChannel, type AgoraRtcHandle } from '../lib/agora';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/session.store';

let startInFlight: Promise<VoiceSession | null> | null = null;
let didRecoverSession = false;
let activeMurfAudio: HTMLAudioElement | null = null;

export async function playMurfOrBrowserSpeech(
  text: string,
  persona: VoicePersona = 'aria',
  cadence = 1.0,
): Promise<'murf' | 'browser' | 'silent'> {
  const clean = text.trim();
  if (!clean) return 'silent';

  if (activeMurfAudio) {
    try {
      activeMurfAudio.pause();
      activeMurfAudio.src = '';
    } catch {
      // ignore
    }
    activeMurfAudio = null;
  }

  try {
    const res = await apiFetch<{
      audioUrl: string | null;
      mode: 'murf' | 'browser_fallback';
      displayName?: string;
    }>('/api/voice/tts', {
      method: 'POST',
      body: JSON.stringify({ text: clean, persona, cadence }),
    });

    if (res.mode === 'murf' && res.audioUrl) {
      const audio = new Audio(res.audioUrl);
      activeMurfAudio = audio;
      await audio.play().catch(() => {
        // Browser autoplay blocked or audio error: graceful fallback
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(clean);
          utter.rate = Math.min(1.4, Math.max(0.8, cadence));
          window.speechSynthesis.speak(utter);
        }
      });
      return 'murf';
    }
  } catch {
    // Fall back cleanly to Web Speech API
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = Math.min(1.4, Math.max(0.8, cadence));
      window.speechSynthesis.speak(utter);
      return 'browser';
    } catch {
      return 'silent';
    }
  }
  return 'silent';
}

export function useVoiceSession() {
  const session = useSessionStore((s) => s.session);
  const voiceMode = useSessionStore((s) => s.voiceMode);
  const orbState = useSessionStore((s) => s.orbState);
  const muted = useSessionStore((s) => s.muted);
  const connected = useSessionStore((s) => s.connected);
  const busyTurn = useSessionStore((s) => s.busyTurn);
  const rtcRef = useRef<AgoraRtcHandle | null>(null);

  useEffect(() => {
    if (didRecoverSession) return;
    didRecoverSession = true;
    (async () => {
      try {
        const res = await apiFetch<{ snapshot: SessionSnapshot | null }>(
          '/api/agora/session/active',
        );
        if (res.snapshot) {
          useSessionStore.getState().applySnapshot(res.snapshot);
        }
      } catch {
        // No active session yet
      }
    })();
  }, []);

  const startSession = useCallback(async (): Promise<VoiceSession | null> => {
    const state = useSessionStore.getState();
    if (state.session && state.connected) return state.session;
    if (startInFlight) return startInFlight;

    startInFlight = (async () => {
      state.setSessionControl({ orbState: 'thinking', errorBanner: null });
      try {
        const activeRes = await apiFetch<{ snapshot: SessionSnapshot | null }>(
          '/api/agora/session/active',
        ).catch(() => ({ snapshot: null }));

        if (activeRes.snapshot && activeRes.snapshot.session.status === 'active') {
          state.applySnapshot(activeRes.snapshot);
          state.setSessionControl({
            connected: true,
            orbState: 'idle',
          });
          return activeRes.snapshot.session;
        }

        const res = await apiFetch<{
          appId: string;
          channel: string;
          token: string;
          uid: number;
          sessionId: string;
          mode: 'agora_live' | 'browser_voice';
          snapshot: SessionSnapshot;
        }>('/api/agora/session/start', { method: 'POST' });

        state.applySnapshot(res.snapshot);
        state.setSessionControl({
          voiceMode: res.mode,
          connected: true,
          orbState: 'idle',
        });

        if (res.mode === 'agora_live' && res.appId) {
          try {
            rtcRef.current = await joinAgoraVoiceChannel({
              appId: res.appId,
              channel: res.channel,
              token: res.token,
              uid: res.uid,
              onUserVolume: (lvl) => {
                if (lvl > 8) {
                  useSessionStore.getState().setSessionControl({ orbState: 'listening' });
                }
              },
              onAgentVolume: (lvl) => {
                if (lvl > 8) {
                  useSessionStore.getState().setSessionControl({ orbState: 'speaking' });
                }
              },
            });
          } catch {
            useSessionStore.getState().setSessionControl({ voiceMode: 'browser_voice' });
          }
        }

        return res.snapshot.session;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to start voice session';
        state.setSessionControl({ orbState: 'idle', errorBanner: message });
        state.pushToast(message, 'error');
        return null;
      } finally {
        startInFlight = null;
      }
    })();

    return startInFlight;
  }, []);

  const stopSession = useCallback(async () => {
    const active = useSessionStore.getState().session;
    if (rtcRef.current) {
      await rtcRef.current.leave();
      rtcRef.current = null;
    }
    if (active) {
      await apiFetch('/api/agora/session/stop', {
        method: 'POST',
        body: JSON.stringify({ sessionId: active.id }),
      }).catch(() => {});
    }
    useSessionStore.getState().setSessionControl({
      connected: false,
      orbState: 'idle',
    });
  }, []);

  const toggleMute = useCallback(async () => {
    const nextMuted = !useSessionStore.getState().muted;
    useSessionStore.getState().setSessionControl({ muted: nextMuted });
    if (rtcRef.current) {
      await rtcRef.current.setMuted(nextMuted);
    }
  }, []);

  const sendTurn = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const store = useSessionStore.getState();
      let activeSession = store.session;
      if (!activeSession || !store.connected) {
        activeSession = await startSession();
      }
      if (!activeSession) return;

      store.setSessionControl({ busyTurn: true, orbState: 'thinking', errorBanner: null });
      try {
        const res = await apiFetch<{ replyText: string; snapshot: SessionSnapshot }>(
          `/api/agora/session/${activeSession.id}/turn`,
          {
            method: 'POST',
            body: JSON.stringify({ message: clean }),
          },
        );
        store.applySnapshot(res.snapshot);
        store.setSessionControl({ busyTurn: false, orbState: 'speaking' });

        if (!store.muted && res.replyText) {
          const persona = store.preferences?.voice_persona ?? 'aria';
          const cadence = store.preferences?.voice_cadence ?? 1.0;
          void playMurfOrBrowserSpeech(res.replyText, persona, cadence);
        }

        setTimeout(() => {
          if (useSessionStore.getState().orbState === 'speaking') {
            useSessionStore.getState().setSessionControl({ orbState: 'idle' });
          }
        }, 2600);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Concierge turn failed';
        store.setSessionControl({ busyTurn: false, orbState: 'idle', errorBanner: message });
        store.pushToast(message, 'error');
      }
    },
    [startSession],
  );

  const resolveApproval = useCallback(async (approvalId: string, decision: 'approve' | 'reject') => {
    const store = useSessionStore.getState();
    store.setSessionControl({ busyTurn: true, orbState: 'thinking' });
    try {
      const res = await apiFetch<{ snapshot: SessionSnapshot }>(
        `/api/approvals/${approvalId}/resolve`,
        {
          method: 'POST',
          body: JSON.stringify({ decision }),
        },
      );
      store.applySnapshot(res.snapshot);
      store.setSessionControl({ busyTurn: false, orbState: 'idle' });
      store.pushToast(
        decision === 'approve'
          ? 'Booking confirmed, synced to itinerary & logged to Expense Tracker'
          : 'Proposal held — tell Wayfinder what to adjust',
        decision === 'approve' ? 'success' : 'info',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval action failed';
      store.setSessionControl({ busyTurn: false, orbState: 'idle' });
      store.pushToast(message, 'error');
    }
  }, []);

  const setChaosMode = useCallback(
    async (mode: ChaosMode) => {
      const store = useSessionStore.getState();
      let activeSession = store.session;
      if (!activeSession) {
        activeSession = await startSession();
      }
      if (!activeSession) return;
      await apiFetch('/api/demo/chaos', {
        method: 'POST',
        body: JSON.stringify({ sessionId: activeSession.id, mode }),
      });
      const snapRes = await apiFetch<{ snapshot: SessionSnapshot }>(
        `/api/agora/session/${activeSession.id}/snapshot`,
      );
      store.applySnapshot(snapRes.snapshot);
      store.pushToast(`Chaos test mode: ${mode}`, 'warning');
    },
    [startSession],
  );

  return {
    session,
    voiceMode,
    orbState,
    muted,
    connected,
    busyTurn,
    startSession,
    stopSession,
    toggleMute,
    sendTurn,
    resolveApproval,
    setChaosMode,
    playSpeechSample: playMurfOrBrowserSpeech,
  };
}
