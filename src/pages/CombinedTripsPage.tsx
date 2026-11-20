import { ArrowRight, Layers, Mic, Plus, Route, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CombinedTripPlan, Trip } from '../../shared/types';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { apiFetch } from '../lib/api';
import { useSessionStore } from '../store/session.store';

export function CombinedTripsPage() {
  const navigate = useNavigate();
  const pushToast = useSessionStore((s) => s.pushToast);

  const [combinedTrips, setCombinedTrips] = useState<CombinedTripPlan[]>([]);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Builder form state
  const [title, setTitle] = useState('Golden Triangle + Goa Escape');
  const [description, setDescription] = useState(
    'Seamless multi-leg executive circuit combining heritage immersion with coastal rest.',
  );
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [budgetCap, setBudgetCap] = useState('120000');
  const [transferNote, setTransferNote] = useState('Direct morning connection + VIP chauffeur pickup');

  // Optional quick new trip leg creator
  const [showNewTripLeg, setShowNewTripLeg] = useState(false);
  const [legTitle, setLegTitle] = useState('');
  const [legDest, setLegDest] = useState('');
  const [legBudget, setLegBudget] = useState('35000');

  // Add leg to existing circuit state
  const [addingLegToId, setAddingLegToId] = useState<string | null>(null);
  const [appendTripId, setAppendTripId] = useState('');
  const [appendNote, setAppendNote] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ combinedTrips: CombinedTripPlan[]; availableTrips: Trip[] }>(
        '/api/combined-trips',
      );
      setCombinedTrips(res.combinedTrips);
      setAvailableTrips(res.availableTrips);
      if (res.availableTrips.length >= 2) {
        setSelectedTripIds((prev) =>
          prev.length >= 2 ? prev : res.availableTrips.slice(0, 2).map((t) => t.id),
        );
      }
    } catch {
      pushToast('Unable to load combined trip plans', 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleSelectTrip = (id: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleQuickCreateTrip = async () => {
    if (!legTitle.trim() || !legDest.trim()) {
      pushToast('Enter leg title and destination city', 'warning');
      return;
    }
    try {
      const start = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const end = new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10);
      const res = await apiFetch<{ trip: Trip }>('/api/trips', {
        method: 'POST',
        body: JSON.stringify({
          title: legTitle.trim(),
          destination: legDest.trim(),
          origin: 'BLR',
          start_date: start,
          end_date: end,
          budget: Number(legBudget) || 35000,
        }),
      });
      setAvailableTrips((prev) => [res.trip, ...prev]);
      setSelectedTripIds((prev) => [...prev, res.trip.id]);
      setLegTitle('');
      setLegDest('');
      setShowNewTripLeg(false);
      pushToast(`Added "${res.trip.title}" to available trips`, 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to create trip leg', 'error');
    }
  };

  const handleCreateCircuit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedTripIds.length < 2) {
      pushToast('Select at least 2 trips to combine into a circuit', 'warning');
      return;
    }
    setCreating(true);
    try {
      await apiFetch('/api/combined-trips', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          tripIds: selectedTripIds,
          totalBudget: Number(budgetCap) || undefined,
          transferNote: transferNote.trim() || undefined,
        }),
      });
      pushToast('Combined multi-trip circuit created', 'success');
      setShowBuilder(false);
      await loadData();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to combine trips', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleAppendLeg = async (circuitId: string) => {
    if (!appendTripId) return;
    try {
      await apiFetch(`/api/combined-trips/${circuitId}/legs`, {
        method: 'POST',
        body: JSON.stringify({
          tripId: appendTripId,
          transferNote: appendNote.trim() || 'Synchronized inter-city transfer',
        }),
      });
      setAddingLegToId(null);
      setAppendTripId('');
      setAppendNote('');
      pushToast('Appended new leg to combined plan', 'success');
      await loadData();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to append leg', 'error');
    }
  };

  const handleDeleteCircuit = async (circuitId: string) => {
    try {
      await apiFetch(`/api/combined-trips/${circuitId}`, { method: 'DELETE' });
      pushToast('Combined trip plan removed', 'info');
      await loadData();
    } catch {
      pushToast('Failed to delete combined plan', 'error');
    }
  };

  const totalCombinedSpend = combinedTrips.reduce((s, c) => s + c.total_cost, 0);
  const totalLegsCount = combinedTrips.reduce((s, c) => s + c.legs.length, 0);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B7058]">
              Multi-Trip Circuit Builder
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#343D2B] mt-1">
              Combined Trip Plans
            </h1>
            <p className="text-sm text-[#68715A] mt-1">
              Merge multiple destinations into one synchronized arc with inter-leg transfers and
              shared budget governance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  `/concierge?prompt=${encodeURIComponent(
                    'Combine Jaipur Heritage and Goa Weekend into one trip circuit',
                  )}`,
                )
              }
            >
              <Mic className="w-4 h-4 text-[#68764A]" />
              Combine via Voice
            </Button>
            <Button variant="brown" onClick={() => setShowBuilder((v) => !v)}>
              <Plus className="w-4 h-4" />
              {showBuilder ? 'Close Builder' : 'New Combined Circuit'}
            </Button>
          </div>
        </header>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#929987]">ACTIVE CIRCUITS</span>
            <p className="font-display text-2xl font-semibold text-[#343D2B] mt-1 tabular-nums">
              {combinedTrips.length}
            </p>
          </Card>
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#929987]">LINKED TRIP LEGS</span>
            <p className="font-display text-2xl font-semibold text-[#8B7058] mt-1 tabular-nums">
              {totalLegsCount}
            </p>
          </Card>
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#929987]">AGGREGATED CIRCUIT SPEND</span>
            <p className="font-display text-2xl font-semibold text-[#68764A] mt-1 tabular-nums">
              ₹{totalCombinedSpend.toLocaleString('en-IN')}
            </p>
          </Card>
        </div>

        {/* Interactive Builder Form */}
        {showBuilder && (
          <Card highlight className="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-[#343D2B]">
                Assemble Multi-Trip Circuit
              </h2>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowNewTripLeg((v) => !v)}
              >
                <Plus className="w-3.5 h-3.5" />
                Quick-Add New Trip Leg
              </Button>
            </div>

            {showNewTripLeg && (
              <div className="rounded-xl border border-[#8B7058]/35 bg-[#EDE5DA]/50 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label htmlFor="ql-title" className="block font-mono text-[11px] text-[#68715A]">
                    New Trip Title
                  </label>
                  <input
                    id="ql-title"
                    value={legTitle}
                    onChange={(e) => setLegTitle(e.target.value)}
                    placeholder="Udaipur Lake Retreat"
                    className="w-full rounded-lg border border-[#DDE1D2] bg-[#FFFDF7] px-3 py-2 text-xs text-[#343D2B]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ql-dest" className="block font-mono text-[11px] text-[#68715A]">
                    Destination
                  </label>
                  <input
                    id="ql-dest"
                    value={legDest}
                    onChange={(e) => setLegDest(e.target.value)}
                    placeholder="Udaipur"
                    className="w-full rounded-lg border border-[#DDE1D2] bg-[#FFFDF7] px-3 py-2 text-xs text-[#343D2B]"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="ql-budget" className="block font-mono text-[11px] text-[#68715A]">
                    Budget (INR)
                  </label>
                  <input
                    id="ql-budget"
                    type="number"
                    value={legBudget}
                    onChange={(e) => setLegBudget(e.target.value)}
                    className="w-full rounded-lg border border-[#DDE1D2] bg-[#FFFDF7] px-3 py-2 text-xs font-mono text-[#343D2B]"
                  />
                </div>
                <Button type="button" size="sm" onClick={() => void handleQuickCreateTrip()}>
                  Add Leg Option
                </Button>
              </div>
            )}

            <form onSubmit={handleCreateCircuit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="ct-title" className="block font-mono text-xs text-[#68715A]">
                    Combined Circuit Title
                  </label>
                  <input
                    id="ct-title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ct-budget" className="block font-mono text-xs text-[#68715A]">
                    Combined Budget Ceiling (INR)
                  </label>
                  <input
                    id="ct-budget"
                    type="number"
                    value={budgetCap}
                    onChange={(e) => setBudgetCap(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm font-mono text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="ct-desc" className="block font-mono text-xs text-[#68715A]">
                    Circuit Brief
                  </label>
                  <input
                    id="ct-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ct-transfer" className="block font-mono text-xs text-[#68715A]">
                    Inter-Leg Transfer Rule
                  </label>
                  <input
                    id="ct-transfer"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-mono text-xs text-[#68715A]">
                  Select 2 or more trips to chain ({selectedTripIds.length} selected)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableTrips.map((t) => {
                    const checked = selectedTripIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          checked
                            ? 'border-[#68764A] bg-[#E8EBDD]'
                            : 'border-[#DDE1D2] bg-[#F7F6F0] hover:bg-[#FFFDF7]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectTrip(t.id)}
                            className="accent-[#68764A] w-4 h-4"
                          />
                          <div className="min-w-0">
                            <p className="font-display text-sm font-semibold text-[#343D2B] truncate">
                              {t.title}
                            </p>
                            <p className="font-mono text-[11px] text-[#68715A]">
                              {t.origin} → {t.destination} · {t.start_date}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#68764A] tabular-nums shrink-0">
                          ₹{t.total_cost.toLocaleString('en-IN')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowBuilder(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || selectedTripIds.length < 2}>
                  <Layers className="w-4 h-4" />
                  {creating ? 'Combining...' : 'Create Combined Plan'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Active Combined Trip Circuits */}
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : combinedTrips.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Route className="w-8 h-8 text-[#8B7058] mx-auto" />
            <h2 className="font-display text-lg font-semibold text-[#343D2B]">
              No combined trip circuits yet
            </h2>
            <p className="text-sm text-[#68715A]">
              Combine two or more trips—such as Jaipur Heritage and Goa Weekend—into a unified
              multi-leg plan.
            </p>
            <Button onClick={() => setShowBuilder(true)}>Build First Combined Plan</Button>
          </Card>
        ) : (
          <div className="space-y-5">
            {combinedTrips.map((circuit) => {
              const pct = Math.min(
                100,
                Math.round((circuit.total_cost / Math.max(1, circuit.total_budget)) * 100),
              );
              const existingTripIds = new Set(circuit.legs.map((l) => l.trip_id));
              const appendCandidates = availableTrips.filter((t) => !existingTripIds.has(t.id));

              return (
                <Card key={circuit.id} highlight className="p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="warm">{circuit.legs.length} LEGS LINKED</Badge>
                        <Badge tone="success">{circuit.status.toUpperCase()}</Badge>
                      </div>
                      <h2 className="font-display text-xl font-semibold text-[#343D2B] mt-2">
                        {circuit.title}
                      </h2>
                      <p className="text-xs text-[#68715A] mt-1">{circuit.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          navigate(
                            `/concierge?prompt=${encodeURIComponent(
                              `Review combined circuit "${circuit.title}" and suggest expense optimizations`,
                            )}`,
                          )
                        }
                      >
                        Brief Concierge
                      </Button>
                      <button
                        type="button"
                        aria-label={`Delete ${circuit.title}`}
                        onClick={() => void handleDeleteCircuit(circuit.id)}
                        className="p-2 rounded-xl border border-[#DDE1D2] text-[#929987] hover:text-[#A94F45] hover:bg-[#FDF0EE] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ordered Legs Pipeline */}
                  <div className="space-y-2.5">
                    {circuit.legs.map((leg, index) => (
                      <div
                        key={leg.id}
                        className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] p-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-8 h-8 rounded-lg bg-[#EDE5DA] text-[#8B7058] font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                            0{index + 1}
                          </span>
                          <div>
                            <Link
                              to={`/trips/${leg.trip_id}`}
                              className="font-display text-sm font-semibold text-[#343D2B] hover:text-[#68764A] hover:underline"
                            >
                              {leg.trip?.title || `Leg ${index + 1}`}
                            </Link>
                            <p className="font-mono text-[11px] text-[#68715A] mt-0.5">
                              {leg.trip
                                ? `${leg.trip.origin} → ${leg.trip.destination} · ${leg.trip.start_date} to ${leg.trip.end_date}`
                                : leg.trip_id}
                            </p>
                            {leg.transfer_note && (
                              <p className="text-xs text-[#8B7058] mt-1 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3 shrink-0" />
                                {leg.transfer_note}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {leg.trip && (
                            <span className="font-mono text-sm font-semibold text-[#68764A] tabular-nums">
                              ₹{leg.trip.total_cost.toLocaleString('en-IN')}
                            </span>
                          )}
                          <Link
                            to={`/trips/${leg.trip_id}`}
                            className="text-xs font-medium text-[#68715A] hover:text-[#343D2B]"
                          >
                            Dossier →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Budget Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="font-semibold text-[#343D2B] tabular-nums">
                        Combined Total: ₹{circuit.total_cost.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[#68715A] tabular-nums">
                        {pct}% of ₹{circuit.total_budget.toLocaleString('en-IN')} cap
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E8EBDD] overflow-hidden">
                      <div
                        className="h-full bg-[#8B7058] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Append Leg Inline Trigger */}
                  {appendCandidates.length > 0 && (
                    <div className="pt-2 border-t border-[#DDE1D2]">
                      {addingLegToId === circuit.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label="Select trip leg to append"
                            value={appendTripId}
                            onChange={(e) => setAppendTripId(e.target.value)}
                            className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-3 py-2 text-xs text-[#343D2B]"
                          >
                            <option value="">Choose trip to append...</option>
                            {appendCandidates.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title} ({c.destination})
                              </option>
                            ))}
                          </select>
                          <input
                            value={appendNote}
                            onChange={(e) => setAppendNote(e.target.value)}
                            placeholder="Transfer note (e.g. Evening flight)"
                            className="flex-1 min-w-[180px] rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-3 py-2 text-xs text-[#343D2B]"
                          />
                          <Button size="sm" onClick={() => void handleAppendLeg(circuit.id)}>
                            Append Leg
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAddingLegToId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingLegToId(circuit.id);
                            setAppendTripId(appendCandidates[0]?.id ?? '');
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Another Trip Leg
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
