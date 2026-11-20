import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Layers,
  Lock,
  Mic,
  PlayCircle,
  Receipt,
  Route,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WayfinderLogo } from '../components/ui/WayfinderLogo';

export function LandingPage() {
  const navigate = useNavigate();
  const [orbActive, setOrbActive] = useState(true);

  return (
    <div className="min-h-screen bg-[#F7F6F0] text-[#343D2B] flex flex-col">
      {/* Sticky Off-White Quiet-Luxury Header */}
      <header className="sticky top-0 z-40 h-16 bg-[#FFFDF7]/92 backdrop-blur-xl border-b border-[#DDE1D2] shadow-[0_1px_8px_rgba(52,61,43,0.04)]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/" aria-label="Wayfinder Home">
            <WayfinderLogo size="md" />
          </Link>

          <nav aria-label="Landing navigation" className="hidden md:flex items-center gap-2 text-sm">
            <a
              href="#how-it-works"
              className="px-3 py-1.5 rounded-lg bg-[#E3E9D8] text-[#343D2B] font-medium"
            >
              Experience
            </a>
            <Link
              to="/concierge?autostart=1"
              className="px-3 py-1.5 rounded-lg text-[#68715A] hover:text-[#343D2B] hover:bg-[#F0F0E6] transition-colors"
            >
              Concierge
            </Link>
            <Link
              to="/combined"
              className="px-3 py-1.5 rounded-lg text-[#68715A] hover:text-[#343D2B] hover:bg-[#F0F0E6] transition-colors"
            >
              Combined Plans
            </Link>
            <Link
              to="/expenses"
              className="px-3 py-1.5 rounded-lg text-[#68715A] hover:text-[#343D2B] hover:bg-[#F0F0E6] transition-colors"
            >
              Expense Tracker
            </Link>
            <Link
              to="/auth"
              className="px-3 py-1.5 rounded-lg text-[#68715A] hover:text-[#343D2B] hover:bg-[#F0F0E6] transition-colors"
            >
              Sign In
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/onboarding"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#68764A] text-white text-xs font-medium hover:bg-[#57643D] transition-colors shadow-sm"
            >
              Join Executive Circle
            </Link>
            <Link
              to="/concierge?autostart=1"
              className="sm:hidden inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-[#68764A] text-white text-xs font-medium"
            >
              Start
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Split Hero */}
        <section className="relative overflow-hidden px-4 sm:px-6 py-12 md:py-20">
          <div
            aria-hidden="true"
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#E3E9D8]/60 blur-3xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 -right-40 w-[28rem] h-[28rem] rounded-full bg-[#EDE5DA]/75 blur-3xl pointer-events-none"
          />

          <div className="max-w-7xl mx-auto relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EBDD] border border-[#DDE1D2] text-xs font-medium text-[#343D2B] mb-6 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#68764A] animate-pulse" />
              <span>Operational Quiet-Luxury Concierge</span>
              <span className="text-[#929987]">|</span>
              <span className="font-mono text-[#68715A]">Murf Voice · Agora · Gemini</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Copy & CTAs */}
              <div className="lg:col-span-6 flex flex-col items-start">
                <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#343D2B] leading-[1.12] mb-5">
                  Just say where. <br />
                  <span className="text-[#68764A]">Wayfinder</span> handles the rest.
                </h1>

                <p className="text-base sm:text-lg text-[#68715A] max-w-xl leading-relaxed mb-8">
                  A bespoke voice concierge that plans multi-trip circuits, books flights and stays
                  under budget, tracks every expense automatically, and guards your calendar—never
                  spending without your sign-off.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 mb-10 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate('/concierge?autostart=1')}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#68764A] to-[#81915E] text-white font-display text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start talking</span>
                  </button>

                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#FFFDF7] border border-[#DDE1D2] text-[#343D2B] text-sm font-medium shadow-xs hover:bg-[#F0F0E6] transition-colors"
                  >
                    <PlayCircle className="w-4 h-4 text-[#8B7058]" />
                    <span>See how it works</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-lg">
                  <div className="flex items-start gap-3 bg-[#FFFDF7] border border-[#DDE1D2] p-3.5 rounded-xl shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-[#68764A] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display text-sm font-semibold text-[#343D2B]">
                        Human-in-the-Loop
                      </p>
                      <p className="text-xs text-[#68715A] mt-0.5">
                        Never books without ticket sign-off
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-[#FFFDF7] border border-[#DDE1D2] p-3.5 rounded-xl shadow-xs">
                    <Receipt className="w-5 h-5 text-[#8B7058] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display text-sm font-semibold text-[#343D2B]">
                        Live Expense Ledger
                      </p>
                      <p className="text-xs text-[#68715A] mt-0.5">
                        Auto-syncs every fare &amp; receipt
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Interactive Session Card */}
              <div className="lg:col-span-6 relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 bg-gradient-to-tr from-[#A7B58A]/30 via-[#E3E9D8] to-[#EDE5DA] rounded-3xl blur-xl opacity-80"
                />

                <div className="relative bg-[#FFFDF7] border border-[#DDE1D2] rounded-2xl shadow-xl p-6 sm:p-7 flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#A94F45]/75" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#A87832]/75" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#547A55]/75" />
                      <span className="ml-1.5 font-mono text-xs text-[#929987]">
                        SESSION_094 // BLR → GOI
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8EBDD] font-mono text-[11px] font-medium text-[#68715A]">
                      {orbActive ? 'LIVE AUDIO: ACTIVE' : 'VOICE STANDBY'}
                    </span>
                  </div>

                  {/* Interactive Orb Stage */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <button
                      type="button"
                      onClick={() => setOrbActive((v) => !v)}
                      aria-label={orbActive ? 'Pause voice visualizer' : 'Activate voice visualizer'}
                      className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-[0_14px_40px_rgba(104,118,74,0.3)] hover:scale-105 transition-transform cursor-pointer"
                      style={{
                        background: orbActive
                          ? 'radial-gradient(circle at 32% 28%, #C9D4B2 0%, #91A276 38%, #68764A 75%, #4F5D3B 100%)'
                          : 'radial-gradient(circle at 32% 28%, #EDE5DA 0%, #B8A592 50%, #8B7058 95%)',
                      }}
                    >
                      <div className="flex items-center gap-1.5 h-10" aria-hidden="true">
                        {[16, 30, 40, 24, 14].map((h, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full bg-white/95 transition-all ${
                              orbActive ? 'animate-pulse' : 'opacity-65'
                            }`}
                            style={{ height: `${orbActive ? h : 10}px` }}
                          />
                        ))}
                      </div>
                    </button>

                    <span className="mt-3 font-mono text-xs text-[#68764A] font-medium tracking-wide flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      {orbActive ? 'LISTENING INTENT & AMBIENT SPEECH...' : 'TAP ORB TO RESUME'}
                    </span>
                  </div>

                  {/* Live Captions */}
                  <div className="bg-[#F7F6F0] border border-[#DDE1D2] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-[#929987]">Live Captions</span>
                      <span className="font-mono text-xs text-[#8B7058]">Confidence 99.4%</span>
                    </div>
                    <p className="text-sm text-[#343D2B] italic leading-relaxed">
                      “Checking non-stop flights{' '}
                      <span className="font-mono text-xs font-medium text-[#68764A] not-italic bg-[#E8EBDD] px-1.5 py-0.5 rounded">
                        BLR → GOI
                      </span>{' '}
                      and reconciling against your Friday 4:00 PM calendar standup…”
                    </p>
                  </div>

                  {/* Execution Progress Strips */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-[#F0F0E6] px-3.5 py-2.5 rounded-lg">
                      <span className="flex items-center gap-2 font-medium text-[#343D2B]">
                        <Check className="w-4 h-4 text-[#547A55]" />
                        Calendar Conflicts Reconciled
                      </span>
                      <span className="font-mono text-[#929987]">Cleared (+45m gap)</span>
                    </div>
                    <div className="flex items-center justify-between bg-[#E8EBDD] px-3.5 py-2.5 rounded-lg">
                      <span className="flex items-center gap-2 font-medium text-[#343D2B]">
                        <Sparkles className="w-4 h-4 text-[#68764A]" />
                        Filtering 6E 5214 &amp; Taj Resort Coast
                      </span>
                      <span className="font-mono text-[#68764A]">Under ₹40,000</span>
                    </div>
                    <div className="flex items-center justify-between bg-[#F0F0E6]/70 px-3.5 py-2.5 rounded-lg text-[#68715A]">
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#929987]" />
                        Payment Mandate &amp; Auto-Expense Entry
                      </span>
                      <span className="font-mono text-[#929987]">Awaiting your word</span>
                    </div>
                  </div>

                  {/* Proposed Pass Preview */}
                  <div className="bg-[#FFFDF7] border border-[#8B7058]/35 rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#8B7058]">
                          PROPOSED PASS
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#EDE5DA] text-[#8B7058] text-[11px] font-medium">
                          Direct Priority
                        </span>
                      </div>
                      <span className="font-display text-sm font-semibold text-[#343D2B] tabular-nums">
                        ₹36,400
                      </span>
                    </div>

                    <div className="flex items-center justify-between my-1">
                      <div>
                        <p className="font-display text-2xl font-semibold text-[#343D2B]">BLR</p>
                        <p className="font-mono text-[11px] text-[#929987]">18:30 IST</p>
                      </div>
                      <div className="flex-1 px-4 flex flex-col items-center">
                        <svg className="w-full h-7 text-[#A7B58A]" fill="none" viewBox="0 0 160 30">
                          <path
                            d="M 10 20 Q 80 -4 150 20"
                            stroke="currentColor"
                            strokeDasharray="4 3"
                            strokeWidth="1.5"
                          />
                          <circle cx="10" cy="20" r="3.5" className="fill-[#8B7058]" />
                          <circle cx="80" cy="7" r="2.5" className="fill-[#68764A]" />
                          <circle cx="150" cy="20" r="3.5" className="fill-[#8B7058]" />
                        </svg>
                        <span className="font-mono text-[11px] text-[#929987] -mt-1">
                          1h 20m nonstop
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl font-semibold text-[#343D2B]">GOI</p>
                        <p className="font-mono text-[11px] text-[#929987]">19:50 IST</p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-dashed border-[#DDE1D2] flex items-center justify-between text-xs text-[#68715A]">
                      <span>Hold guaranteed for 5m</span>
                      <button
                        type="button"
                        onClick={() => navigate('/concierge?autostart=1')}
                        className="font-semibold text-[#68764A] hover:underline cursor-pointer"
                      >
                        Tap to authorize →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Editorial Proof & Assurance Strip */}
        <section className="bg-[#F0F0E6] border-y border-[#DDE1D2] py-14 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col bg-[#FFFDF7] border border-[#DDE1D2] p-6 rounded-2xl shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-[#E3E9D8] flex items-center justify-center mb-4 text-[#68764A]">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h2 className="font-display text-lg font-semibold text-[#343D2B] mb-2">
                Checks your calendar before booking
              </h2>
              <p className="text-sm text-[#68715A] leading-relaxed">
                Spots immovable standups and executive meetings, buffers commute delays, and schedules
                departures without collisions.
              </p>
              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-mono text-[#929987]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#547A55]" />
                Zero calendar overwrites
              </div>
            </div>

            <div className="flex flex-col bg-[#FFFDF7] border border-[#DDE1D2] p-6 rounded-2xl shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-[#EDE5DA] flex items-center justify-center mb-4 text-[#8B7058]">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="font-display text-lg font-semibold text-[#343D2B] mb-2">
                Combined Multi-Trip Circuits
              </h2>
              <p className="text-sm text-[#68715A] leading-relaxed">
                Chain multiple cities—such as Jaipur Heritage into Goa Coastal—with unified transfer
                notes, shared budgets, and single-click dispatch.
              </p>
              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-mono text-[#929987]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B7058]" />
                Synchronized multi-leg routing
              </div>
            </div>

            <div className="flex flex-col bg-[#FFFDF7] border border-[#DDE1D2] p-6 rounded-2xl shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-[#E8EBDD] flex items-center justify-center mb-4 text-[#657C82]">
                <Receipt className="w-5 h-5" />
              </div>
              <h2 className="font-display text-lg font-semibold text-[#343D2B] mb-2">
                Automatic Expense Tracker USP
              </h2>
              <p className="text-sm text-[#68715A] leading-relaxed">
                Every confirmed booking and voice-logged cab or dining charge is recorded into a
                reimbursable expense ledger with CSV export.
              </p>
              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-mono text-[#929987]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#657C82]" />
                Real-time INR spend tracking
              </div>
            </div>
          </div>
        </section>

        {/* How It Works: 4 Route-Connected Horizontal Steps */}
        <section id="how-it-works" className="py-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-[#68764A] font-medium">
                  The Orchestration Protocol
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#343D2B] mt-1">
                  From spoken goal to confirmed voyage.
                </h2>
              </div>
              <p className="text-sm text-[#68715A] max-w-md">
                A calm workflow designed for travelers who value discretion, clarity, and
                predictable budget governance.
              </p>
            </div>

            <div className="hidden lg:block w-full h-7 mb-4" aria-hidden="true">
              <svg className="w-full h-full text-[#A7B58A]" fill="none" viewBox="0 0 1000 30">
                <path
                  d="M 125 15 L 875 15"
                  stroke="currentColor"
                  strokeDasharray="6 6"
                  strokeWidth="2"
                />
                <circle cx="125" cy="15" r="7" className="fill-[#68764A] stroke-[#F7F6F0] stroke-2" />
                <circle cx="375" cy="15" r="7" className="fill-[#68764A] stroke-[#F7F6F0] stroke-2" />
                <circle cx="625" cy="15" r="7" className="fill-[#68764A] stroke-[#F7F6F0] stroke-2" />
                <circle cx="875" cy="15" r="7" className="fill-[#8B7058] stroke-[#F7F6F0] stroke-2" />
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  stage: 'STAGE 01',
                  num: '1',
                  title: 'Speak your goal',
                  desc: 'Talk naturally—no tabs or filters. Mention dates, ceiling budget, or multi-city circuits.',
                  foot: '“Weekend in Goa under ₹40,000. Friday 4 PM standup.”',
                },
                {
                  stage: 'STAGE 02',
                  num: '2',
                  title: 'Watch it plan',
                  desc: 'Calendar, flights, boutique hotels, and destination weather execute in parallel.',
                  foot: '→ Checking Indigo 6E 5214 & Taj Resort Goa',
                },
                {
                  stage: 'STAGE 03',
                  num: '3',
                  title: 'Approve the booking',
                  desc: 'Inspect the boarding-pass summary, budget meter, and authorize by tap or voice.',
                  foot: 'Authorize ₹36,400 · Auto-logs to Expense Ledger',
                },
                {
                  stage: 'STAGE 04',
                  num: '4',
                  title: 'Stay covered after',
                  desc: 'Flight delays or sold-out tiers trigger instant rebooking options and calendar sync.',
                  foot: 'Live disruption monitoring active',
                },
              ].map((step, idx) => (
                <div
                  key={step.stage}
                  className="bg-[#FFFDF7] border border-[#DDE1D2] p-6 rounded-2xl shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`font-mono text-xs ${
                          idx === 3 ? 'text-[#8B7058]' : 'text-[#929987]'
                        }`}
                      >
                        {step.stage}
                      </span>
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-semibold ${
                          idx === 3
                            ? 'bg-[#EDE5DA] text-[#8B7058]'
                            : 'bg-[#E3E9D8] text-[#68764A]'
                        }`}
                      >
                        {step.num}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#343D2B] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#68715A] leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="mt-5 bg-[#F7F6F0] border border-[#DDE1D2] px-3 py-2.5 rounded-xl font-mono text-xs text-[#343D2B]">
                    {step.foot}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Visual Immersion Strip using Local High-Craft Assets */}
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-7xl mx-auto bg-[#FFFDF7] border border-[#DDE1D2] rounded-3xl p-6 sm:p-10 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-5">
                <span className="font-mono text-xs uppercase tracking-wider text-[#8B7058] font-medium">
                  Uncompromising Standards
                </span>
                <h2 className="font-display text-3xl font-semibold text-[#343D2B] leading-tight">
                  Quiet-luxury travel, articulated by voice.
                </h2>
                <p className="text-sm text-[#68715A] leading-relaxed">
                  From single-weekend coastal retreats to chained multi-leg executive itineraries,
                  Wayfinder pairs Murf neural voice synthesis with deterministic financial guards.
                </p>
                <ul className="space-y-2.5 text-sm text-[#343D2B]">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#68764A]" />
                    Real-time multi-trip circuit combination &amp; transfer notes
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#68764A]" />
                    Automated Expense Tracker with reimbursable CSV exports
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#68764A]" />
                    Supabase-persisted itineraries &amp; Google Calendar conflict locks
                  </li>
                </ul>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/concierge?autostart=1')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#8B7058] text-white text-sm font-medium hover:bg-[#775E48] transition-colors cursor-pointer"
                  >
                    <span>Experience Live Concierge</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative rounded-2xl overflow-hidden shadow-sm h-64 border border-[#DDE1D2] group">
                  <img
                    src="/src/assets/images/executive_lounge_cabin_1795204005360.jpg"
                    alt="Quiet luxury executive cabin interior in warm cream tones"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#343D2B]/75 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="font-mono text-[11px] text-[#EDE5DA]">CABIN SPECIFICATION</span>
                    <h4 className="font-display text-base font-semibold text-white">
                      Quiet Cabin Executive Class
                    </h4>
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden shadow-sm h-64 border border-[#DDE1D2] sm:mt-6 group">
                  <img
                    src="/src/assets/images/goa_coastal_villa_1795204005249.jpg"
                    alt="Sunlit coastal sandstone terrace in Goa overlooking calm sea"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#343D2B]/75 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="font-mono text-[11px] text-[#EDE5DA]">SANCTUARY SELECTION</span>
                    <h4 className="font-display text-base font-semibold text-white">
                      Secluded Coastal Retreats
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Voice CTA Banner */}
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#FFFDF7] via-[#E8EBDD] to-[#EDE5DA] border border-[#DDE1D2] rounded-3xl p-8 sm:p-14 text-center shadow-md relative overflow-hidden">
            <Route
              aria-hidden="true"
              className="absolute -right-8 -bottom-8 w-56 h-56 text-[#68764A]/10 pointer-events-none"
            />
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <span className="font-mono text-xs uppercase tracking-widest text-[#68764A] font-medium mb-2">
                Zero Latency Voice Dispatch
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#343D2B] mb-3 tracking-tight">
                Ready to plan your next journey without typing a single word?
              </h2>
              <p className="text-sm sm:text-base text-[#68715A] mb-7">
                Tap the voice trigger. Wayfinder navigates calendars, links multi-trip legs, and
                updates your expense ledger automatically.
              </p>
              <button
                type="button"
                onClick={() => navigate('/concierge?autostart=1')}
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl bg-[#68764A] text-white font-display text-sm font-semibold shadow-md hover:bg-[#57643D] transition-all cursor-pointer"
              >
                <Mic className="w-5 h-5" />
                <span>Start Voice Session</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#F0F0E6] border-t border-[#DDE1D2] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#68715A]">
          <div className="flex items-center gap-3">
            <WayfinderLogo size="sm" />
            <span className="text-[#929987]">· Executive Travel &amp; Expense Concierge</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/concierge?autostart=1" className="hover:text-[#343D2B]">
              Voice Concierge
            </Link>
            <Link to="/combined" className="hover:text-[#343D2B]">
              Combined Plans
            </Link>
            <Link to="/expenses" className="hover:text-[#343D2B]">
              Expense Tracker
            </Link>
          </div>
          <span className="font-mono text-[#929987]">© 2026 Wayfinder · Quiet-Luxury Travel</span>
        </div>
      </footer>
    </div>
  );
}
