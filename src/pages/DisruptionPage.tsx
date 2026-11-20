import { AlertTriangle, CheckCircle2, Mic, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ChaosMode } from '../../shared/types';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useTrips } from '../hooks/useTrips';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/session.store';

export function DisruptionPage() {
  const navigate = useNavigate();
  const { trips, disruptions, refresh } = useTrips();
  const { setChaosMode } = useVoiceSession();
  const chaosMode = useSessionStore((s) => s.chaosMode);
  const activeSession = useSessionStore((s) => s.session);
  const pushToast = useSessionStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);

  const handleSimulate = async () => {
    setBusy(true);
    try {
      await apiFetch('/api/demo/disruption', {
        method: 'POST',
        body: JSON.stringify({
          tripId: trips.find((t) => t.status === 'booked')?.id ?? trips[0]?.id,
          sessionId: activeSession?.id ?? null,
        }),
      });
      pushToast('Flight disruption triggered', 'warning');
      await refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to trigger disruption', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReschedule = async (tripId: string, disruptionId: string, flightId?: string) => {
    setBusy(true);
    try {
      await apiFetch(`/api/trips/${tripId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          disruptionId,
          flightId,
          sessionId: activeSession?.id,
        }),
      });
      pushToast('Itinerary rebooked & calendar updated', 'success');
      await refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Reschedule failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openCount = disruptions.filter((d) => d.status === 'open').length;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        {openCount > 0 && (
          <div className="rounded-2xl border border-[#E5C378] bg-[#FFF9EB] px-5 py-3.5 flex items-center gap-3 text-xs text-[#343D2B]">
            <AlertTriangle className="w-4 h-4 text-[#A87832] shrink-0" />
            <span>
              <strong>Operational Disruption Alert:</strong> {openCount} active schedule conflict
              detected. Downstream check-in holds and transfers are staged for one-click recovery.
            </span>
          </div>
        )}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B7058]">
              Follow-Up &amp; Self-Healing Engine
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#343D2B] mt-1">
              Disruption Monitor
            </h1>
          </div>
          <Button
            variant="brown"
            disabled={busy || trips.length === 0}
            onClick={() => void handleSimulate()}
          >
            <ShieldAlert className="w-4 h-4" />
            Trigger Delay Simulation
          </Button>
        </header>

        {/* Fault Injection Matrix */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#343D2B]">
                Resilience &amp; Fault Injection Mode
              </h2>
              <p className="text-xs text-[#68715A]">
                Test how Planner and Researcher adapt around upstream GDS outages or sold-out tiers.
              </p>
            </div>
            <Badge tone="neutral">{chaosMode}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['off', 'Normal (Default Sold-Out #1)'],
                ['hotel_sold_out', 'Extra Hotel Sold Out'],
                ['flight_api_error', 'Flight API 503 + Retry'],
                ['calendar_error', 'Calendar Unavailable'],
              ] as Array<[ChaosMode, string]>
            ).map(([mode, label]) => (
              <Button
                key={mode}
                size="sm"
                variant={chaosMode === mode ? 'primary' : 'secondary'}
                onClick={() => void setChaosMode(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
        </Card>

        {disruptions.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#547A55] mx-auto" />
            <h2 className="font-display text-lg font-semibold text-[#343D2B]">
              All departures nominal
            </h2>
            <p className="text-sm text-[#68715A]">
              No flight delays or cancellations detected. Trigger a simulated delay above to test
              autonomous recovery.
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {disruptions.map((d) => (
              <Card key={d.id} highlight={d.status === 'open'} className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        d.status === 'open' ? 'text-[#A87832]' : 'text-[#547A55]'
                      }`}
                    />
                    <div>
                      <h3 className="font-display text-lg font-semibold text-[#343D2B]">
                        {d.detail.flight_number || 'Flight'} · Delay +{d.detail.delay_minutes ?? 90}m
                      </h3>
                      <p className="text-xs text-[#68715A] mt-0.5">{d.detail.reason}</p>
                      {d.detail.resolution_note && (
                        <p className="text-xs text-[#547A55] font-medium mt-1">
                          {d.detail.resolution_note}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge tone={d.status === 'open' ? 'warning' : 'success'}>
                    {d.status.toUpperCase()}
                  </Badge>
                </div>

                {/* Before / After Impact Analysis Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] p-3">
                    <span className="font-mono text-[11px] text-[#929987]">FLIGHT SEGMENT</span>
                    <p className="font-semibold text-[#343D2B] mt-0.5">
                      {d.status === 'open' ? 'Delayed Departure' : 'Rebooked & Confirmed'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] p-3">
                    <span className="font-mono text-[11px] text-[#929987]">HOTEL CHECK-IN</span>
                    <p className="font-semibold text-[#343D2B] mt-0.5">
                      {d.status === 'open' ? 'Late Arrival Flagged' : 'Check-in Hold Shifted'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] p-3">
                    <span className="font-mono text-[11px] text-[#929987]">CALENDAR &amp; TRANSFERS</span>
                    <p className="font-semibold text-[#343D2B] mt-0.5">
                      {d.status === 'open' ? 'Pending Recovery' : 'Synced Automatically'}
                    </p>
                  </div>
                </div>

                {d.status === 'open' && (d.detail.alternatives ?? []).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#DDE1D2]">
                    {d.detail.alternatives!.map((alt, idx) => (
                      <div
                        key={alt.id}
                        className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                          idx === 0
                            ? 'border-[#68764A] bg-[#E8EBDD]/60'
                            : 'border-[#DDE1D2] bg-[#F7F6F0]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[11px] uppercase text-[#8B7058]">
                              {idx === 0 ? 'Option A · Recommended' : 'Option B · Alternative'}
                            </span>
                            <p className="font-display text-base font-semibold text-[#343D2B] mt-0.5">
                              {alt.airline} {alt.flight_number}
                            </p>
                            <p className="font-mono text-xs text-[#68715A] tabular-nums mt-0.5">
                              {alt.depart_at.slice(11, 16)} → {alt.arrive_at.slice(11, 16)}
                            </p>
                          </div>
                          <Badge tone={idx === 0 ? 'success' : 'warm'}>
                            {idx === 0 ? '₹0 Fee' : `₹${alt.price_inr.toLocaleString('en-IN')}`}
                          </Badge>
                        </div>

                        <Button
                          size="sm"
                          variant={idx === 0 ? 'primary' : 'secondary'}
                          disabled={busy}
                          onClick={() => void handleReschedule(d.trip_id, d.id, alt.id)}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Switch Flight &amp; Sync Calendar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1">
                  <Link to={`/trips/${d.trip_id}`} className="text-[#68764A] font-medium hover:underline">
                    View affected trip dossier →
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/concierge?prompt=${encodeURIComponent(
                          'What are my options for this flight delay?',
                        )}`,
                      )
                    }
                    className="inline-flex items-center gap-1 text-[#8B7058] font-medium hover:underline cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Consult Voice Concierge
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
