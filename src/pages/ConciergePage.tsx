import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Layers,
  Plane,
  Receipt,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { ChaosMode } from '../../shared/types';
import { ApprovalCard } from '../components/agent/ApprovalCard';
import { PlanTimeline } from '../components/agent/PlanTimeline';
import { ToolCallFeed } from '../components/agent/ToolCallFeed';
import { AppShell } from '../components/layout/AppShell';
import { BookingConfirmationCard } from '../components/travel/BookingConfirmationCard';
import { ComparisonTable } from '../components/travel/ComparisonTable';
import { ItineraryTimeline } from '../components/travel/ItineraryTimeline';
import { FlightOptionCard, HotelOptionCard } from '../components/travel/OptionCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MicControls } from '../components/voice/MicControls';
import { TranscriptPanel } from '../components/voice/TranscriptPanel';
import { VoiceOrb } from '../components/voice/VoiceOrb';
import { useRealtimeSession } from '../hooks/useRealtimeSession';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/session.store';

type WorkbenchTab = 'plan' | 'options' | 'tickets' | 'activity';

export function ConciergePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatchedPromptRef = useRef<string | null>(null);

  const {
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
  } = useVoiceSession();

  useRealtimeSession(session?.id);

  const messages = useSessionStore((s) => s.messages);
  const plan = useSessionStore((s) => s.plan);
  const planSteps = useSessionStore((s) => s.planSteps);
  const toolCalls = useSessionStore((s) => s.toolCalls);
  const approvals = useSessionStore((s) => s.approvals);
  const bookings = useSessionStore((s) => s.bookings);
  const itinerary = useSessionStore((s) => s.itinerary);
  const flightOptions = useSessionStore((s) => s.flightOptions);
  const hotelOptions = useSessionStore((s) => s.hotelOptions);
  const weather = useSessionStore((s) => s.weather);
  const trip = useSessionStore((s) => s.trip);
  const disruptions = useSessionStore((s) => s.disruptions);
  const expenses = useSessionStore((s) => s.expenses);
  const combinedTrips = useSessionStore((s) => s.combinedTrips);
  const chaosMode = useSessionStore((s) => s.chaosMode);
  const pushToast = useSessionStore((s) => s.pushToast);

  const [tab, setTab] = useState<WorkbenchTab>('plan');
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const pendingApproval = approvals.find((a) => a.status === 'pending') ?? null;
  const openDisruption = disruptions.find((d) => d.status === 'open') ?? null;

  useEffect(() => {
    if (!session) {
      void startSession();
    }
  }, [session, startSession]);

  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    if (promptParam && dispatchedPromptRef.current !== promptParam) {
      dispatchedPromptRef.current = promptParam;
      void sendTurn(promptParam);
      const next = new URLSearchParams(searchParams);
      next.delete('prompt');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, sendTurn, setSearchParams]);

  useEffect(() => {
    if (pendingApproval) {
      setSheetExpanded(true);
      setTab('plan');
    }
  }, [pendingApproval]);

  const handleSimulateDelay = async () => {
    if (!trip) return;
    try {
      await apiFetch('/api/demo/disruption', {
        method: 'POST',
        body: JSON.stringify({ tripId: trip.id, sessionId: session?.id }),
      });
      pushToast('Flight delay simulated — ask Wayfinder "what are my options?"', 'warning');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to simulate delay', 'error');
    }
  };

  return (
    <AppShell>
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 lg:h-full lg:overflow-hidden">
        {/* Left 60% Voice Stage (Off-White #F7F6F0) */}
        <section
          aria-label="Voice Concierge Stage"
          className="lg:w-[60%] lg:h-full lg:overflow-y-auto flex flex-col justify-between gap-5 p-5 sm:p-7 border-b lg:border-b-0 lg:border-r border-[#DDE1D2] bg-[#F7F6F0]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-[#8B7058] uppercase tracking-wider">
                {voiceMode === 'agora_live'
                  ? 'Agora RTC · Murf Falcon Voice'
                  : 'Concierge Stage · Voice & Transcript'}
              </p>
              <h1 className="font-display text-2xl font-semibold text-[#343D2B] mt-0.5">
                {trip ? trip.title : 'Wayfinder Voice Concierge'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {weather && (
                <Badge tone="neutral">
                  <CloudSun className="w-3.5 h-3.5 text-[#8B7058]" />
                  {weather.city} {weather.days[0]?.temp_max_c ?? 31}°C
                </Badge>
              )}
              {trip && (
                <Badge tone={trip.status === 'booked' ? 'success' : 'warm'}>
                  <Plane className="w-3.5 h-3.5" />
                  {trip.origin} → {trip.destination.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          {openDisruption && (
            <div className="rounded-xl border border-[#E5C378] bg-[#FFF9EB] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-xs text-[#343D2B]">
                <AlertTriangle className="w-4 h-4 text-[#A87832] shrink-0" />
                <span>
                  Delay detected on {openDisruption.detail.flight_number} (+
                  {openDisruption.detail.delay_minutes}m). Ask &ldquo;what are my options?&rdquo;
                </span>
              </div>
              <Button
                size="sm"
                variant="brown"
                onClick={() => void sendTurn('What are my options for this delay?')}
              >
                Ask Recovery Options
              </Button>
            </div>
          )}

          {/* Centered Orb */}
          <div className="my-2 flex flex-col items-center justify-center shrink-0">
            <VoiceOrb
              state={orbState}
              connected={connected}
              onToggleConnect={() => {
                if (connected) void stopSession();
                else void startSession();
              }}
            />
          </div>

          {/* Collapsible Transcript + Mic Controls */}
          <div className="space-y-3">
            <TranscriptPanel messages={messages} />
            <MicControls
              connected={connected}
              muted={muted}
              busy={busyTurn}
              onStart={() => void startSession()}
              onStop={() => void stopSession()}
              onToggleMute={() => void toggleMute()}
              onSubmitPrompt={(text) => void sendTurn(text)}
            />
          </div>
        </section>

        {/* Right 40% Agent Workbench (Warm Ivory #FFFDF7) */}
        <section
          aria-label="Agent Workbench"
          className={`lg:w-[40%] lg:h-full bg-[#FFFDF7] flex flex-col min-h-0 transition-all duration-200 ${
            sheetExpanded ? 'min-h-[75vh]' : ''
          }`}
        >
          {/* Mobile sheet toggle header */}
          <div className="lg:hidden px-4 py-2.5 border-b border-[#DDE1D2] flex items-center justify-between">
            <span className="font-display text-xs font-semibold text-[#68764A]">
              Agent Workbench
              {pendingApproval ? ' · Approval Pending' : ''}
            </span>
            <button
              type="button"
              onClick={() => setSheetExpanded((v) => !v)}
              aria-label={sheetExpanded ? 'Collapse workbench' : 'Expand workbench'}
              className="p-1.5 text-[#68715A]"
            >
              {sheetExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {/* Segmented Workbench Tabs + Chaos Mode Selector */}
          <div className="px-4 py-3 border-b border-[#DDE1D2] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(
                [
                  ['plan', 'Plan & Gate'],
                  ['options', 'Options'],
                  ['tickets', 'Tickets'],
                  ['activity', 'Activity'],
                ] as Array<[WorkbenchTab, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    tab === key
                      ? 'bg-[#E3E9D8] text-[#343D2B] border border-[#A7B58A]'
                      : 'text-[#68715A] hover:text-[#343D2B] border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#929987]">
              <span>Chaos:</span>
              <select
                aria-label="Chaos test mode"
                value={chaosMode}
                onChange={(e) => void setChaosMode(e.target.value as ChaosMode)}
                className="rounded-lg border border-[#DDE1D2] bg-[#F7F6F0] px-2 py-1 text-[11px] text-[#343D2B] focus:outline-none focus:border-[#68764A]"
              >
                <option value="off">Normal</option>
                <option value="hotel_sold_out">Hotel Sold Out</option>
                <option value="flight_api_error">Flight Retry</option>
                <option value="calendar_error">Calendar Down</option>
              </select>
            </label>
          </div>

          {/* Workbench Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {tab === 'plan' && (
              <>
                {pendingApproval && (
                  <ApprovalCard
                    approval={pendingApproval}
                    busy={busyTurn}
                    onApprove={(id) => resolveApproval(id, 'approve')}
                    onReject={(id) => resolveApproval(id, 'reject')}
                  />
                )}

                {bookings.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-display text-sm font-semibold text-[#68764A]">
                        Confirmed Reservations
                      </h2>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {trip && (
                          <Link
                            to={`/trips/${trip.id}`}
                            className="text-xs font-medium text-[#343D2B] hover:underline whitespace-nowrap"
                          >
                            Trip Dossier
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleSimulateDelay()}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-[#8B7058]" />
                          Simulate Delay
                        </Button>
                      </div>
                    </div>
                    {bookings.map((b) => (
                      <BookingConfirmationCard key={b.id} booking={b} />
                    ))}
                  </div>
                )}

                {/* Quick Live Status Pills for Combined Circuits & Expense Ledger */}
                {(expenses.length > 0 || combinedTrips.length > 0) && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/expenses')}
                      className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] hover:bg-[#EDE5DA]/55 p-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8B7058]">
                        <Receipt className="w-3.5 h-3.5" />
                        EXPENSE LEDGER
                      </div>
                      <p className="font-display text-sm font-semibold text-[#343D2B] mt-1 tabular-nums">
                        {expenses.length} item{expenses.length === 1 ? '' : 's'} synced
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/combined')}
                      className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] hover:bg-[#E8EBDD] p-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#68764A]">
                        <Layers className="w-3.5 h-3.5" />
                        COMBINED PLANS
                      </div>
                      <p className="font-display text-sm font-semibold text-[#343D2B] mt-1 tabular-nums">
                        {combinedTrips.length} circuit{combinedTrips.length === 1 ? '' : 's'}
                      </p>
                    </button>
                  </div>
                )}

                <PlanTimeline plan={plan} steps={planSteps} />
              </>
            )}

            {tab === 'options' && (
              <div className="space-y-4">
                {flightOptions.length === 0 && hotelOptions.length === 0 ? (
                  <Card elevated className="p-5 text-sm text-[#68715A]">
                    Flight and hospitality comparisons appear here once Researcher completes parallel
                    lookups.
                  </Card>
                ) : (
                  <>
                    <ComparisonTable flights={flightOptions} hotels={hotelOptions} />
                    <div className="grid grid-cols-1 gap-3">
                      {flightOptions.slice(0, 2).map((f) => (
                        <FlightOptionCard key={f.id} flight={f} />
                      ))}
                      {hotelOptions.slice(0, 3).map((h) => (
                        <HotelOptionCard key={h.id} hotel={h} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'tickets' && (
              <div className="space-y-4">
                {bookings.map((b) => (
                  <BookingConfirmationCard key={b.id} booking={b} />
                ))}
                <ItineraryTimeline items={itinerary} />
              </div>
            )}

            {tab === 'activity' && <ToolCallFeed logs={toolCalls} />}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
