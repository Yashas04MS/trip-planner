import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckSquare,
  Receipt,
  ShieldAlert,
  Square,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { TripDetailBundle } from '../../shared/types';
import { AppShell } from '../components/layout/AppShell';
import { BookingConfirmationCard } from '../components/travel/BookingConfirmationCard';
import { ItineraryTimeline } from '../components/travel/ItineraryTimeline';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/session.store';

type DossierTab = 'itinerary' | 'bookings' | 'expenses';

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pushToast = useSessionStore((s) => s.pushToast);
  const activeSession = useSessionStore((s) => s.session);

  const [bundle, setBundle] = useState<TripDetailBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DossierTab>('itinerary');

  const loadTrip = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await apiFetch<TripDetailBundle>(`/api/trips/${id}`);
      setBundle(data);
    } catch {
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  const handleSimulateDisruption = async () => {
    if (!bundle) return;
    setBusy(true);
    try {
      await apiFetch('/api/demo/disruption', {
        method: 'POST',
        body: JSON.stringify({
          tripId: bundle.trip.id,
          sessionId: activeSession?.id ?? null,
        }),
      });
      pushToast('Flight delay simulated — recovery options queued', 'warning');
      await loadTrip();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Simulation failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRebook = async (disruptionId: string, flightId?: string) => {
    if (!bundle) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ bundle: TripDetailBundle }>(
        `/api/trips/${bundle.trip.id}/reschedule`,
        {
          method: 'POST',
          body: JSON.stringify({
            disruptionId,
            flightId,
            sessionId: activeSession?.id ?? undefined,
          }),
        },
      );
      setBundle(res.bundle);
      pushToast('Rebooked flight & updated itinerary', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Reschedule failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleReminder = async (reminderId: string, currentlySent: boolean) => {
    if (!bundle) return;
    try {
      await apiFetch(`/api/trips/${bundle.trip.id}/reminders/${reminderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: !currentlySent }),
      });
      await loadTrip();
      pushToast(!currentlySent ? 'Checklist item completed' : 'Checklist item reopened', 'success');
    } catch {
      pushToast('Unable to update reminder', 'error');
    }
  };

  const spendPct = bundle
    ? Math.min(100, Math.round((bundle.trip.total_cost / Math.max(1, bundle.trip.budget)) * 100))
    : 0;
  const linkedExpenses = bundle?.expenses ?? [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#68715A] hover:text-[#343D2B]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home &amp; Trips
          </Link>

          {bundle && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void handleSimulateDisruption()}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#8B7058]" />
                Simulate Delay
              </Button>
              <Button size="sm" onClick={() => navigate('/concierge')}>
                Open Voice Desk
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-64" />
          </div>
        ) : !bundle ? (
          <Card className="p-8 text-center space-y-3">
            <h1 className="font-display text-xl font-semibold text-[#343D2B]">
              Trip dossier not found
            </h1>
            <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
          </Card>
        ) : (
          <>
            {/* Dossier Header Card */}
            <Card className="overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-8 p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-[#8B7058] uppercase tracking-wider">
                      {bundle.trip.origin} → {bundle.trip.destination.toUpperCase()} ·{' '}
                      {bundle.trip.start_date} to {bundle.trip.end_date}
                    </span>
                    <Badge tone={bundle.trip.status === 'changed' ? 'warning' : 'success'}>
                      {bundle.trip.status.toUpperCase()}
                    </Badge>
                  </div>

                  <h1 className="font-display text-3xl font-semibold text-[#343D2B]">
                    {bundle.trip.title}
                  </h1>

                  {/* Spend Utilization Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-[#343D2B] font-semibold tabular-nums">
                        Committed: ₹{bundle.trip.total_cost.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[#68715A] tabular-nums">
                        {spendPct}% of ₹{bundle.trip.budget.toLocaleString('en-IN')} ceiling
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#E8EBDD] overflow-hidden">
                      <div
                        className="h-full bg-[#68764A] rounded-full transition-all"
                        style={{ width: `${spendPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 relative min-h-[160px] border-t lg:border-t-0 lg:border-l border-[#DDE1D2]">
                  <img
                    src="/src/assets/images/concierge_folio_1795204004352.jpg"
                    alt="Travel dossier folio"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#343D2B]/65 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="font-mono text-[10px] text-[#EDE5DA]">EXECUTIVE DOSSIER</span>
                    <p className="font-display text-sm font-semibold">
                      {bundle.bookings.length} Reservations · {linkedExpenses.length} Expenses
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Open Disruptions */}
            {bundle.disruptions
              .filter((d) => d.status === 'open')
              .map((d) => (
                <Card key={d.id} highlight className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-[#A87832] shrink-0 mt-0.5" />
                      <div>
                        <h2 className="font-display text-base font-semibold text-[#343D2B]">
                          Flight Delay · {d.detail.flight_number} (+{d.detail.delay_minutes} mins)
                        </h2>
                        <p className="text-xs text-[#68715A] mt-0.5">{d.detail.reason}</p>
                      </div>
                    </div>
                    <Badge tone="warning">OPEN</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(d.detail.alternatives ?? []).map((alt) => (
                      <div
                        key={alt.id}
                        className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] p-3.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium text-sm text-[#343D2B]">
                            {alt.airline} {alt.flight_number}
                          </p>
                          <p className="text-xs font-mono text-[#68715A] tabular-nums">
                            {alt.depart_at.slice(11, 16)} → {alt.arrive_at.slice(11, 16)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleRebook(d.id, alt.id)}
                        >
                          Rebook
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}

            {/* Segmented Dossier Tabs */}
            <div className="flex items-center gap-2 border-b border-[#DDE1D2] pb-2">
              {(
                [
                  ['itinerary', 'Itinerary & Checklists'],
                  ['bookings', `Bookings & Passes (${bundle.bookings.length})`],
                  ['expenses', `Linked Expenses (${linkedExpenses.length})`],
                ] as Array<[DossierTab, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    tab === key
                      ? 'bg-[#68764A] text-white shadow-xs'
                      : 'bg-[#F0F0E6] text-[#68715A] hover:text-[#343D2B]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'itinerary' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ItineraryTimeline items={bundle.itinerary} />
                </div>

                <Card className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#8B7058]" />
                    <h2 className="font-display text-sm font-semibold text-[#343D2B]">
                      Pre-Trip Reminders
                    </h2>
                  </div>
                  {bundle.reminders.length === 0 ? (
                    <p className="text-xs text-[#68715A]">No active reminders queued.</p>
                  ) : (
                    <ul className="space-y-2.5 text-xs">
                      {bundle.reminders.map((r) => {
                        const done = Boolean(r.sent_at);
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => void handleToggleReminder(r.id, done)}
                              className="w-full text-left rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] hover:bg-[#FFFDF7] p-3 flex items-start gap-2.5 transition-colors cursor-pointer"
                            >
                              {done ? (
                                <CheckSquare className="w-4 h-4 text-[#547A55] shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-4 h-4 text-[#8B7058] shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p
                                  className={
                                    done ? 'line-through text-[#929987]' : 'text-[#343D2B]'
                                  }
                                >
                                  {r.message}
                                </p>
                                <p className="font-mono text-[11px] text-[#929987] mt-1 tabular-nums">
                                  {new Date(r.remind_at).toLocaleDateString()} ·{' '}
                                  {done ? 'Completed' : 'Queued'}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </div>
            )}

            {tab === 'bookings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundle.bookings.length === 0 ? (
                  <Card className="p-6 text-sm text-[#68715A] md:col-span-2">
                    No confirmed reservations attached to this trip yet. Approve a booking in Voice
                    Concierge to generate boarding stubs.
                  </Card>
                ) : (
                  bundle.bookings.map((b) => <BookingConfirmationCard key={b.id} booking={b} />)
                )}
              </div>
            )}

            {tab === 'expenses' && (
              <Card className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#8B7058]" />
                    <h2 className="font-display text-base font-semibold text-[#343D2B]">
                      Trip Expense Ledger
                    </h2>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => navigate('/expenses')}>
                    Manage All Expenses
                  </Button>
                </div>

                {linkedExpenses.length === 0 ? (
                  <p className="text-xs text-[#68715A]">
                    No expenses recorded against this trip yet. Confirm bookings or add charges in
                    the Expense Tracker.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-[#343D2B]">{exp.merchant}</p>
                          <p className="text-[#68715A] mt-0.5">
                            {exp.description} · <span className="capitalize">{exp.category}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold text-[#343D2B] tabular-nums">
                            ₹{exp.amount.toLocaleString('en-IN')}
                          </p>
                          <Badge tone={exp.status === 'reimbursed' ? 'success' : 'warm'}>
                            {exp.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
