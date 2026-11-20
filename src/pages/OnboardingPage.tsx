import { ArrowLeft, ArrowRight, Calendar, Check, CheckCircle2, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/session.store';

const INTEREST_OPTIONS = [
  'Boutique Coastal',
  'Heritage Palaces',
  'Direct Morning Flights',
  'Quiet Rooms',
  'Spa & Wellness',
  'Culinary Tasting',
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, preferences, calendarConnected, refreshMe } = useAuth();
  const pushToast = useSessionStore((s) => s.pushToast);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(profile?.full_name || 'Aarav Mehta');
  const [homeCity, setHomeCity] = useState(profile?.home_city || 'Bengaluru');
  const [homeAirport, setHomeAirport] = useState(profile?.home_airport || 'BLR');
  const [budget, setBudget] = useState<number>(preferences?.default_budget || 40000);
  const [cabin, setCabin] = useState<'economy' | 'premium_economy' | 'business'>(
    preferences?.cabin || 'economy',
  );
  const [stars, setStars] = useState<number>(preferences?.hotel_stars || 4);
  const [interests, setInterests] = useState<string[]>(
    preferences?.interests?.length ? preferences.interests : ['Boutique Coastal', 'Quiet Rooms'],
  );
  const [avoidText, setAvoidText] = useState(
    (preferences?.avoid || ['red-eye flights', 'middle seats']).join(', '),
  );
  const [saving, setSaving] = useState(false);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName.trim() || 'Aarav Mehta',
          home_city: homeCity.trim() || 'Bengaluru',
          home_airport: homeAirport.trim().toUpperCase() || 'BLR',
          default_budget: budget,
          cabin,
          hotel_stars: stars,
          interests,
          avoid: avoidText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      await refreshMe();
      pushToast('Traveler dossier saved', 'success');
      navigate('/concierge');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
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
          res.message || 'Configure Google OAuth secrets to link your live calendar.',
          'info',
        );
      }
    } catch {
      pushToast('Unable to initiate Google Calendar OAuth', 'error');
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B7058]">
              Traveler Onboarding · Step {step} of 3
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#343D2B] mt-1">
              Configure your concierge profile
            </h1>
            <p className="mt-1.5 text-sm text-[#68715A]">
              Wayfinder applies your airport, budget ceiling, and comfort rules to every trip &amp;
              combined circuit.
            </p>
          </div>
          <Badge tone="warm">
            <Sparkles className="w-3 h-3" />
            Quiet-Luxury Standards
          </Badge>
        </div>

        {/* 3-Step Horizontal Stepper */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: 1 as const, label: 'About You' },
            { num: 2 as const, label: 'Travel Taste' },
            { num: 3 as const, label: 'Calendar & Ready' },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => setStep(item.num)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                step === item.num
                  ? 'border-[#68764A] bg-[#E8EBDD] text-[#343D2B]'
                  : step > item.num
                    ? 'border-[#DDE1D2] bg-[#FFFDF7] text-[#547A55]'
                    : 'border-[#DDE1D2] bg-[#F0F0E6] text-[#929987]'
              }`}
            >
              <span className="font-mono text-[11px] block">STEP 0{item.num}</span>
              <span className="font-display text-xs sm:text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSave} className="space-y-6">
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="ob-name" className="block font-mono text-xs text-[#68715A]">
                      Traveler Name
                    </label>
                    <input
                      id="ob-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ob-city" className="block font-mono text-xs text-[#68715A]">
                      Home City
                    </label>
                    <input
                      id="ob-city"
                      value={homeCity}
                      onChange={(e) => setHomeCity(e.target.value)}
                      className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="ob-airport" className="block font-mono text-xs text-[#68715A]">
                      Home Airport (IATA)
                    </label>
                    <input
                      id="ob-airport"
                      maxLength={4}
                      value={homeAirport}
                      onChange={(e) => setHomeAirport(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm font-mono text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-mono text-xs text-[#68715A]">Travel Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((tag) => {
                      const active = interests.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInterest(tag)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#68764A] text-white border-[#566339]'
                              : 'bg-[#F0F0E6] text-[#68715A] border-[#DDE1D2] hover:text-[#343D2B]'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={() => setStep(2)}>
                    Continue to Taste
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="ob-cabin" className="block font-mono text-xs text-[#68715A]">
                      Preferred Cabin
                    </label>
                    <select
                      id="ob-cabin"
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
                    <label htmlFor="ob-stars" className="block font-mono text-xs text-[#68715A]">
                      Minimum Hotel Tier
                    </label>
                    <select
                      id="ob-stars"
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="ob-budget" className="font-mono text-[#68715A]">
                      Default Weekend Budget Ceiling
                    </label>
                    <span className="font-display text-base font-semibold text-[#68764A] tabular-nums">
                      ₹{budget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    id="ob-budget"
                    type="range"
                    min={15000}
                    max={150000}
                    step={5000}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-[#68764A]"
                  />
                  <div className="flex justify-between font-mono text-[11px] text-[#929987]">
                    <span>₹15,000</span>
                    <span>₹80,000</span>
                    <span>₹1,50,000</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ob-avoid" className="block font-mono text-xs text-[#68715A]">
                    Constraints to Avoid (comma separated)
                  </label>
                  <textarea
                    id="ob-avoid"
                    rows={2}
                    value={avoidText}
                    onChange={(e) => setAvoidText(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button type="button" onClick={() => setStep(3)}>
                    Calendar &amp; Finish
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E3E9D8] text-[#68764A] flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-display text-sm font-semibold text-[#343D2B]">
                        Google Calendar Conflict Guard
                      </p>
                      <p className="text-xs text-[#68715A]">
                        {calendarConnected
                          ? 'Connected · Free/busy conflict detection active'
                          : 'Optional OAuth · Detect standups & hold confirmed trips'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleConnectCalendar()}
                  >
                    {calendarConnected ? 'Reconnect' : 'Connect Calendar'}
                  </Button>
                </div>

                <div className="rounded-xl border border-[#8B7058]/30 bg-[#EDE5DA]/50 p-4 space-y-2 text-xs text-[#343D2B]">
                  <p className="font-mono font-semibold text-[#8B7058] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Executive Summary Ready
                  </p>
                  <p>
                    Home Hub: <strong>{homeCity} ({homeAirport})</strong> · Budget Cap:{' '}
                    <strong>₹{budget.toLocaleString('en-IN')}</strong> · Cabin:{' '}
                    <strong>{cabin.replace('_', ' ')}</strong> · Min {stars}★ stays.
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving Dossier...' : 'Save & Open Voice Concierge'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
