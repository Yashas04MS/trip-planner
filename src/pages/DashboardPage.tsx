import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  Layers,
  Mic,
  Plane,
  Receipt,
  Sparkles,
  Square,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CombinedTripPlan, ExpenseRecord, TripDetailBundle } from '../../shared/types';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/session.store';

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile, preferences } = useAuth();
  const { trips, disruptions, loading, refresh } = useTrips();
  const pushToast = useSessionStore((s) => s.pushToast);

  const [combinedTrips, setCombinedTrips] = useState<CombinedTripPlan[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [heroBundle, setHeroBundle] = useState<TripDetailBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [combRes, expRes] = await Promise.all([
          apiFetch<{ combinedTrips: CombinedTripPlan[] }>('/api/combined-trips'),
          apiFetch<{ expenses: ExpenseRecord[] }>('/api/expenses'),
        ]);
        if (!cancelled) {
          setCombinedTrips(combRes.combinedTrips);
          setExpenses(expRes.expenses);
        }
      } catch {
        // Ignore if session not ready
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nextTrip = trips.find((t) => t.status === 'booked' || t.status === 'changed') ?? trips[0];

  useEffect(() => {
    if (!nextTrip) return;
    let cancelled = false;
    apiFetch<TripDetailBundle>(`/api/trips/${nextTrip.id}`)
      .then((bundle) => {
        if (!cancelled) setHeroBundle(bundle);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [nextTrip]);

  const handleToggleReminder = async (tripId: string, reminderId: string, currentlySent: boolean) => {
    try {
      await apiFetch(`/api/trips/${tripId}/reminders/${reminderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: !currentlySent }),
      });
      if (heroBundle && heroBundle.trip.id === tripId) {
        const updated = await apiFetch<TripDetailBundle>(`/api/trips/${tripId}`);
        setHeroBundle(updated);
      }
      pushToast(!currentlySent ? 'Reminder completed' : 'Reminder reopened', 'success');
    } catch {
      pushToast('Unable to update reminder', 'error');
    }
  };

  const openDisruption = disruptions.find((d) => d.status === 'open');
  const firstName = profile?.full_name.split(' ')[0] || 'Aarav';
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const reimbursableTotal = expenses
    .filter((e) => e.reimbursable)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-7 space-y-6">
        {/* Greeting Banner */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B7058]">
              Home &amp; Trips · {profile?.home_city || 'Bengaluru'} ({profile?.home_airport || 'BLR'})
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#343D2B] mt-1 tracking-tight">
              Good evening, {firstName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" onClick={() => navigate('/combined')}>
              <Layers className="w-4 h-4 text-[#8B7058]" />
              Combine Plans
            </Button>
            <Button variant="secondary" onClick={() => navigate('/expenses')}>
              <Receipt className="w-4 h-4 text-[#68764A]" />
              Expense Tracker
            </Button>
            <Button onClick={() => navigate('/concierge?autostart=1')}>
              <Mic className="w-4 h-4" />
              Talk to Concierge
            </Button>
          </div>
        </header>

        {/* Disruption Alert Strip */}
        {openDisruption && (
          <div className="rounded-2xl border border-[#E5C378] bg-[#FFF9EB] px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#A87832] shrink-0 mt-0.5" />
              <div>
                <p className="font-display text-sm font-semibold text-[#343D2B]">
                  Operational Alert: {openDisruption.detail.flight_number || 'Flight'} delayed +
                  {openDisruption.detail.delay_minutes ?? 90}m
                </p>
                <p className="text-xs text-[#68715A] mt-0.5">{openDisruption.detail.reason}</p>
              </div>
            </div>
            <Link
              to="/disruptions"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A87832] text-white text-xs font-medium hover:opacity-95"
            >
              Review Recovery Options
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Next Departure Hero Card */}
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : nextTrip ? (
          <Card highlight className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 p-6 sm:p-7 flex flex-col justify-between gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={nextTrip.status === 'changed' ? 'warning' : 'success'}>
                      NEXT DEPARTURE · {nextTrip.status.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs text-[#8B7058]">
                      {nextTrip.start_date} → {nextTrip.end_date}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[#68715A] tabular-nums">
                    Cap ₹{nextTrip.budget.toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#343D2B]">
                    {nextTrip.title}
                  </h2>
                  <p className="text-sm text-[#68715A] mt-1">
                    {nextTrip.origin} to {nextTrip.destination} · Synchronized itinerary, boarding
                    passes, and expense tracking ready.
                  </p>
                </div>

                {/* Dotted Flight Route SVG */}
                <div className="rounded-xl bg-[#F7F6F0] border border-[#DDE1D2] p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-semibold text-[#343D2B]">
                      {nextTrip.origin}
                    </p>
                    <p className="font-mono text-[11px] text-[#929987]">Origin Hub</p>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8B7058]" />
                    <div className="flex-1 border-t-2 border-dashed border-[#A7B58A]" />
                    <Plane className="w-4 h-4 text-[#68764A]" />
                    <div className="flex-1 border-t-2 border-dashed border-[#A7B58A]" />
                    <span className="w-2 h-2 rounded-full bg-[#68764A]" />
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold text-[#343D2B]">
                      {nextTrip.destination.slice(0, 3).toUpperCase()}
                    </p>
                    <p className="font-mono text-[11px] text-[#929987]">{nextTrip.destination}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-mono font-semibold text-[#68764A] text-sm tabular-nums">
                      ₹{nextTrip.total_cost.toLocaleString('en-IN')} committed
                    </span>
                    <span className="text-[#929987]">|</span>
                    <span className="text-[#68715A]">
                      {heroBundle?.bookings.length ?? 0} verified bookings
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/trips/${nextTrip.id}`)}
                    >
                      Open Dossier
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/concierge?prompt=${encodeURIComponent(
                            `Review my ${nextTrip.title} itinerary and check for updates`,
                          )}`,
                        )
                      }
                    >
                      Brief Concierge
                    </Button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 relative min-h-[200px] border-t lg:border-t-0 lg:border-l border-[#DDE1D2]">
                <img
                  src="/src/assets/images/goa_coastal_villa_1795204005249.jpg"
                  alt={nextTrip.destination}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#343D2B]/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="font-mono text-[11px] text-[#EDE5DA]">DESTINATION PREVIEW</span>
                  <p className="font-display text-lg font-semibold">{nextTrip.destination}</p>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center space-y-3">
            <h2 className="font-display text-xl font-semibold text-[#343D2B]">
              No journeys planned yet
            </h2>
            <p className="text-sm text-[#68715A]">
              Speak a destination and budget ceiling to Wayfinder to assemble flights, stays, and
              calendar holds.
            </p>
            <Button onClick={() => navigate('/concierge?autostart=1')}>Plan First Trip</Button>
          </Card>
        )}

        {/* Asymmetric 2-Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Trips + Multi-Trip Combined Plans */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#343D2B]">
                    Trips &amp; Dossiers
                  </h2>
                  <p className="text-xs text-[#68715A]">
                    Select any trip to inspect tickets, reminders, and linked expenses.
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void refresh()}>
                  Refresh
                </Button>
              </div>

              <div className="space-y-3">
                {trips.map((trip) => (
                  <Link
                    key={trip.id}
                    to={`/trips/${trip.id}`}
                    className="block rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] hover:bg-[#FFFDF7] hover:border-[#8B7058]/45 p-4 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-display text-base font-semibold text-[#343D2B]">
                          {trip.title}
                        </p>
                        <p className="font-mono text-xs text-[#68715A] mt-0.5">
                          {trip.origin} → {trip.destination} · {trip.start_date} to {trip.end_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-[#68764A] tabular-nums">
                          ₹{trip.total_cost.toLocaleString('en-IN')}
                        </span>
                        <Badge
                          tone={
                            trip.status === 'booked'
                              ? 'success'
                              : trip.status === 'changed'
                                ? 'warning'
                                : 'warm'
                          }
                        >
                          {trip.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Multi-Trip Combined Plans Preview */}
            <Card className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EDE5DA] text-[#8B7058] flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#343D2B]">
                      Combined Multi-Trip Plans
                    </h2>
                    <p className="text-xs text-[#68715A]">
                      Chain multiple trips into unified circuits with shared budgets.
                    </p>
                  </div>
                </div>
                <Link
                  to="/combined"
                  className="text-xs font-medium text-[#68764A] hover:underline whitespace-nowrap"
                >
                  Manage All →
                </Link>
              </div>

              {combinedTrips.length === 0 ? (
                <div className="rounded-xl bg-[#F7F6F0] border border-[#DDE1D2] p-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#68715A]">
                    No combined circuits yet. Merge 2+ trips into a single travel arc.
                  </p>
                  <Button size="sm" variant="brown" onClick={() => navigate('/combined')}>
                    Create Circuit
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {combinedTrips.slice(0, 2).map((plan) => (
                    <Link
                      key={plan.id}
                      to="/combined"
                      className="block rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] hover:bg-[#FFFDF7] p-4 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm font-semibold text-[#343D2B]">
                          {plan.title}
                        </p>
                        <span className="font-mono text-xs font-semibold text-[#8B7058] tabular-nums">
                          ₹{plan.total_cost.toLocaleString('en-IN')} / ₹
                          {plan.total_budget.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-[#68715A] mt-1">
                        {plan.legs.map((l) => l.trip?.destination || 'Leg').join(' → ')}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right 5 Columns: Expense Tracker USP Widget + Reminders + Voice Starters */}
          <div className="lg:col-span-5 space-y-6">
            {/* Expense Tracker USP Card */}
            <Card highlight className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E3E9D8] text-[#68764A] flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#343D2B]">
                      Expense Tracker USP
                    </h2>
                    <p className="text-xs text-[#68715A]">Real-time INR spend &amp; reimbursements</p>
                  </div>
                </div>
                <Badge tone="warm">{expenses.length} entries</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F7F6F0] border border-[#DDE1D2] p-3">
                  <span className="font-mono text-[11px] text-[#929987]">TOTAL LOGGED</span>
                  <p className="font-display text-xl font-semibold text-[#343D2B] mt-0.5 tabular-nums">
                    ₹{totalExpenses.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-xl bg-[#EDE5DA]/60 border border-[#8B7058]/25 p-3">
                  <span className="font-mono text-[11px] text-[#8B7058]">REIMBURSABLE</span>
                  <p className="font-display text-xl font-semibold text-[#8B7058] mt-0.5 tabular-nums">
                    ₹{reimbursableTotal.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {expenses.slice(0, 3).map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-[#DDE1D2]/60 last:border-b-0"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-[#343D2B] truncate">{exp.merchant}</p>
                      <p className="text-[11px] text-[#929987] capitalize">{exp.category}</p>
                    </div>
                    <span className="font-mono font-semibold text-[#343D2B] tabular-nums shrink-0">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => navigate('/expenses')}
              >
                Open Full Expense Ledger &amp; CSV Export
              </Button>
            </Card>

            {/* Pre-Trip Reminders */}
            <Card className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#8B7058]" />
                <h2 className="font-display text-base font-semibold text-[#343D2B]">
                  Pre-Trip Checklists
                </h2>
              </div>
              {heroBundle && heroBundle.reminders.length > 0 ? (
                <ul className="space-y-2">
                  {heroBundle.reminders.map((rem) => {
                    const done = Boolean(rem.sent_at);
                    return (
                      <li key={rem.id}>
                        <button
                          type="button"
                          onClick={() => void handleToggleReminder(heroBundle.trip.id, rem.id, done)}
                          className="w-full text-left rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] hover:bg-[#FFFDF7] p-3 flex items-start gap-2.5 transition-colors cursor-pointer"
                        >
                          {done ? (
                            <CheckSquare className="w-4 h-4 text-[#547A55] shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-[#8B7058] shrink-0 mt-0.5" />
                          )}
                          <span
                            className={`text-xs leading-relaxed ${
                              done ? 'line-through text-[#929987]' : 'text-[#343D2B]'
                            }`}
                          >
                            {rem.message}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-[#68715A]">
                  Book or open a trip dossier to generate pre-departure reminders.
                </p>
              )}
            </Card>

            {/* Quick Voice Prompts */}
            <Card className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#68764A]" />
                <h2 className="font-display text-base font-semibold text-[#343D2B]">
                  Quick Concierge Prompts
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  `Weekend in Goa under ₹${(preferences?.default_budget || 40000).toLocaleString('en-IN')}. Standup Friday at 4pm.`,
                  'Combine Jaipur Heritage and Goa Weekend into one trip circuit',
                  'Log a dining expense of ₹3,400 at Gunpowder Assagao',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => navigate(`/concierge?prompt=${encodeURIComponent(prompt)}`)}
                    className="text-left rounded-xl border border-[#DDE1D2] bg-[#F0F0E6]/75 hover:bg-[#E3E9D8] px-3.5 py-2.5 text-xs text-[#343D2B] flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <span className="truncate">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#68764A] shrink-0" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
