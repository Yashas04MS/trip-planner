import {
  Calendar,
  CheckCircle2,
  Database,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { VoicePersona } from '../../shared/types';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/session.store';

interface HealthStatus {
  agoraConfigured: boolean;
  agoraRtcConfigured: boolean;
  murfConfigured: boolean;
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
  supabaseConnected: boolean;
  supabaseTablesReady: boolean;
  supabaseError: string | null;
}

interface ResolvedPersonaVoice {
  persona: VoicePersona;
  voiceId: string;
  displayName: string;
  locale: string;
}

const PERSONAS: Array<{ id: VoicePersona; name: string; role: string }> = [
  { id: 'aria', name: 'Aria', role: 'Warm & Measured · Quiet Luxury' },
  { id: 'jasper', name: 'Jasper', role: 'Crisp British Executive' },
  { id: 'maya', name: 'Maya', role: 'Calm & Conversational' },
  { id: 'leo', name: 'Leo', role: 'Direct & Efficient' },
];

export function SettingsPage() {
  const { profile, preferences, calendarConnected, refreshMe } = useAuth();
  const { playSpeechSample } = useVoiceSession();
  const pushToast = useSessionStore((s) => s.pushToast);
  const [searchParams] = useSearchParams();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [homeCity, setHomeCity] = useState(profile?.home_city || '');
  const [homeAirport, setHomeAirport] = useState(profile?.home_airport || 'BLR');
  const [budget, setBudget] = useState(String(preferences?.default_budget || 40000));
  const [cabin, setCabin] = useState<'economy' | 'premium_economy' | 'business'>(
    preferences?.cabin || 'economy',
  );
  const [stars, setStars] = useState(preferences?.hotel_stars || 4);
  const [voicePersona, setVoicePersona] = useState<VoicePersona>(
    preferences?.voice_persona || 'aria',
  );
  const [voiceCadence, setVoiceCadence] = useState<number>(preferences?.voice_cadence ?? 1.0);
  const [readPricesAloud, setReadPricesAloud] = useState<boolean>(
    preferences?.read_prices_aloud ?? true,
  );
  const [approvalTtl, setApprovalTtl] = useState<number>(
    preferences?.approval_ttl_minutes ?? 5,
  );

  const [saving, setSaving] = useState(false);
  const [samplingId, setSamplingId] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [resolvedVoices, setResolvedVoices] = useState<
    Partial<Record<VoicePersona, ResolvedPersonaVoice>>
  >({});

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setHomeCity(profile.home_city);
      setHomeAirport(profile.home_airport);
    }
    if (preferences) {
      setBudget(String(preferences.default_budget));
      setCabin(preferences.cabin);
      setStars(preferences.hotel_stars);
      setVoicePersona(preferences.voice_persona || 'aria');
      setVoiceCadence(preferences.voice_cadence ?? 1.0);
      setReadPricesAloud(preferences.read_prices_aloud ?? true);
      setApprovalTtl(preferences.approval_ttl_minutes ?? 5);
    }
  }, [profile, preferences]);

  useEffect(() => {
    if (searchParams.get('calendar') === 'connected') {
      pushToast('Google Calendar connected successfully', 'success');
      void refreshMe();
    }
  }, [searchParams, pushToast, refreshMe]);

  const loadHealth = async () => {
    try {
      const [healthRes, voicesRes] = await Promise.all([
        apiFetch<HealthStatus>('/api/health'),
        apiFetch<{ configured: boolean; personas: ResolvedPersonaVoice[] }>(
          '/api/voice/voices',
        ).catch(() => null),
      ]);
      setHealth(healthRes);
      if (voicesRes?.personas) {
        const nextMap: Partial<Record<VoicePersona, ResolvedPersonaVoice>> = {};
        for (const item of voicesRes.personas) {
          nextMap[item.persona] = item;
        }
        setResolvedVoices(nextMap);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadHealth();
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName.trim(),
          home_city: homeCity.trim(),
          home_airport: homeAirport.trim().toUpperCase(),
          default_budget: Number(budget) || 40000,
          cabin,
          hotel_stars: stars,
          voice_persona: voicePersona,
          voice_cadence: voiceCadence,
          read_prices_aloud: readPricesAloud,
          approval_ttl_minutes: approvalTtl,
        }),
      });
      await refreshMe();
      pushToast('Concierge parameters deployed', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePlaySample = async (persona: VoicePersona) => {
    setSamplingId(persona);
    try {
      const mode = await playSpeechSample(
        `Good evening. This is ${persona}, your Wayfinder concierge. Ready to plan your next departure.`,
        persona,
        voiceCadence,
      );
      pushToast(
        mode === 'murf' ? `Playing Murf AI sample (${persona})` : `Playing voice preview (${persona})`,
        'info',
      );
    } finally {
      setSamplingId(null);
    }
  };

  const handleResetMemory = async () => {
    try {
      await apiFetch('/api/auth/reset-memory', { method: 'POST' });
      await refreshMe();
      pushToast('Agent persona & travel defaults reset', 'info');
    } catch {
      pushToast('Unable to reset persona memory', 'error');
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await apiFetch<{ configured: boolean; url: string | null; message?: string }>(
        '/api/calendar/oauth/url',
      );
      if (res.configured && res.url) {
        window.location.assign(res.url);
      } else {
        pushToast(
          res.message || 'Configure Google OAuth credentials to authorize Google Calendar.',
          'info',
        );
      }
    } catch {
      pushToast('Failed to request Google Calendar OAuth URL', 'error');
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <header>
          <p className="font-mono text-xs uppercase tracking-wider text-[#8B7058]">
            Control Room · Voice, Guardrails &amp; Supabase
          </p>
          <h1 className="font-display text-3xl font-semibold text-[#343D2B] mt-1">
            Concierge Preferences
          </h1>
        </header>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Profile & Travel Standards */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-[#343D2B]">
                Executive Traveler Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="st-name" className="block font-mono text-xs text-[#68715A]">
                    Full Name
                  </label>
                  <input
                    id="st-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="st-city" className="block font-mono text-xs text-[#68715A]">
                    Home City
                  </label>
                  <input
                    id="st-city"
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="st-airport" className="block font-mono text-xs text-[#68715A]">
                    Home Airport (IATA)
                  </label>
                  <input
                    id="st-airport"
                    maxLength={4}
                    value={homeAirport}
                    onChange={(e) => setHomeAirport(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm font-mono text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="st-budget" className="block font-mono text-xs text-[#68715A]">
                    Default Budget Cap (INR)
                  </label>
                  <input
                    id="st-budget"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm font-mono tabular-nums text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="st-cabin" className="block font-mono text-xs text-[#68715A]">
                    Preferred Cabin
                  </label>
                  <select
                    id="st-cabin"
                    value={cabin}
                    onChange={(e) =>
                      setCabin(e.target.value as 'economy' | 'premium_economy' | 'business')
                    }
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  >
                    <option value="economy">Economy</option>
                    <option value="premium_economy">Premium Economy</option>
                    <option value="business">Business Class</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="st-stars" className="block font-mono text-xs text-[#68715A]">
                    Minimum Hotel Stars
                  </label>
                  <select
                    id="st-stars"
                    value={stars}
                    onChange={(e) => setStars(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  >
                    <option value={3}>3★ Boutique</option>
                    <option value={4}>4★ Quiet Luxury</option>
                    <option value={5}>5★ Heritage &amp; Resort</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Murf Voice & Audio Persona */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#343D2B]">
                    Murf AI Voice Persona &amp; Cadence
                  </h2>
                  <p className="text-[11px] text-[#68715A]">
                    Voices auto-pair dynamically from your single Murf API key — no voice ID setup needed.
                  </p>
                </div>
                <Badge tone="warm">Auto-Paired · Murf AI</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERSONAS.map((p) => {
                  const selected = voicePersona === p.id;
                  const paired = resolvedVoices[p.id];
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 transition-colors ${
                        selected
                          ? 'border-[#68764A] bg-[#E8EBDD]'
                          : 'border-[#DDE1D2] bg-[#F7F6F0]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setVoicePersona(p.id)}
                        className="text-left cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display text-sm font-semibold text-[#343D2B]">
                            {p.name}
                          </p>
                          {paired && (
                            <span className="font-mono text-[10px] text-[#8B7058]">
                              {paired.displayName}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#68715A] mt-0.5">{p.role}</p>
                      </button>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={samplingId === p.id}
                        onClick={() => void handlePlaySample(p.id)}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#8B7058]" />
                        {samplingId === p.id ? 'Speaking...' : 'Play sample'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-xs">
                  <label htmlFor="st-cadence" className="font-mono text-[#68715A]">
                    Speaking Cadence
                  </label>
                  <span className="font-mono font-semibold text-[#343D2B] tabular-nums">
                    {voiceCadence.toFixed(1)}x
                  </span>
                </div>
                <input
                  id="st-cadence"
                  type="range"
                  min={0.8}
                  max={1.4}
                  step={0.1}
                  value={voiceCadence}
                  onChange={(e) => setVoiceCadence(Number(e.target.value))}
                  className="w-full accent-[#68764A]"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-[#343D2B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={readPricesAloud}
                  onChange={(e) => setReadPricesAloud(e.target.checked)}
                  className="accent-[#68764A] w-4 h-4"
                />
                Always read INR fare breakdowns and budget headroom aloud
              </label>
            </Card>
          </div>

          {/* Right Column: Safety Guardrails, Integrations & Supabase Status */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#68764A]" />
                <h2 className="font-display text-base font-semibold text-[#343D2B]">
                  Safety &amp; Approval Guardrails
                </h2>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="st-ttl" className="block font-mono text-xs text-[#68715A]">
                  Approval Gate Expiration Window
                </label>
                <select
                  id="st-ttl"
                  value={approvalTtl}
                  onChange={(e) => setApprovalTtl(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A]"
                >
                  <option value={2}>2 minutes (Strict)</option>
                  <option value={5}>5 minutes (Standard)</option>
                  <option value={10}>10 minutes (Relaxed)</option>
                </select>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                <Save className="w-4 h-4" />
                {saving ? 'Deploying...' : 'Deploy Parameters'}
              </Button>
            </Card>

            {/* Supabase & Streamlined Integration Probe */}
            <Card highlight className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#8B7058]" />
                  <h2 className="font-display text-base font-semibold text-[#343D2B]">
                    Connected Stack Status
                  </h2>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void loadHealth()}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Probe
                </Button>
              </div>

              {health ? (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#DDE1D2]/60">
                    <span className="text-[#68715A]">Supabase Database</span>
                    <Badge tone={health.supabaseTablesReady ? 'success' : 'warning'}>
                      {health.supabaseTablesReady ? 'TABLES READY' : 'SCHEMA PENDING'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#DDE1D2]/60">
                    <span className="text-[#68715A]">Murf AI Voice Synthesis</span>
                    <Badge tone={health.murfConfigured ? 'success' : 'neutral'}>
                      {health.murfConfigured ? 'ACTIVE' : 'FALLBACK'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[#DDE1D2]/60">
                    <span className="text-[#68715A]">Agora RTC Channel</span>
                    <Badge tone={health.agoraRtcConfigured ? 'success' : 'neutral'}>
                      {health.agoraRtcConfigured ? 'CONFIGURED' : 'STANDBY'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#68715A]">Google Gemini Planner</span>
                    <Badge tone={health.geminiConfigured ? 'success' : 'neutral'}>
                      {health.geminiConfigured ? 'ACTIVE' : 'LOCAL RULES'}
                    </Badge>
                  </div>

                  {!health.supabaseTablesReady && (
                    <div className="rounded-xl border border-[#E5C378] bg-[#FFF9EB] p-3 text-[11px] text-[#343D2B] space-y-1">
                      <p className="font-semibold text-[#8B7058]">
                        Run SQL Setup in Supabase SQL Editor
                      </p>
                      <p>
                        Paste and execute{' '}
                        <code className="font-mono bg-[#F0F0E6] px-1 py-0.5 rounded">
                          /supabase/wayfinder_setup.sql
                        </code>{' '}
                        in your Supabase Dashboard SQL Editor to enable live cloud persistence.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#68715A]">Checking runtime connectivity...</p>
              )}
            </Card>

            {/* Google Calendar */}
            <Card className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#68764A]" />
                  <h2 className="font-display text-sm font-semibold text-[#343D2B]">
                    Google Calendar
                  </h2>
                </div>
                {calendarConnected && (
                  <Badge tone="success">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#68715A]">
                Detects meeting collisions before flight selection and adds confirmed itinerary holds.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleConnectCalendar()}
              >
                {calendarConnected ? 'Reconnect OAuth' : 'Connect Google Calendar'}
              </Button>
            </Card>

            {/* Danger Zone */}
            <Card className="p-5 border-[#A94F45]/30 bg-[#FDF0EE]/60 flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-sm font-semibold text-[#A94F45]">
                  Reset Agent Memory
                </p>
                <p className="text-xs text-[#68715A]">
                  Restore default ₹40,000 cap, Aria persona &amp; Bengaluru hub.
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void handleResetMemory()}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            </Card>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
