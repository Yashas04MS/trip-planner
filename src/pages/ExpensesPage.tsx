import {
  CheckCircle2,
  Download,
  Mic,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExpenseCategory, ExpenseRecord, Trip } from '../../shared/types';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { apiFetch, getInMemoryAuthToken } from '../lib/api';
import { useSessionStore } from '../store/session.store';

type ExpenseWithTrip = ExpenseRecord & { trip_title?: string | null };

const CATEGORIES: Array<{ id: ExpenseCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'flight', label: 'Flight' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'transport', label: 'Transport' },
  { id: 'dining', label: 'Dining' },
  { id: 'experience', label: 'Experience' },
  { id: 'other', label: 'Other' },
];

export function ExpensesPage() {
  const navigate = useNavigate();
  const pushToast = useSessionStore((s) => s.pushToast);

  const [expenses, setExpenses] = useState<ExpenseWithTrip[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [tripFilter, setTripFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('dining');
  const [description, setDescription] = useState('');
  const [tripId, setTripId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Amex Corp •• 4102');
  const [reimbursable, setReimbursable] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, tripsRes] = await Promise.all([
        apiFetch<{ expenses: ExpenseWithTrip[] }>('/api/expenses'),
        apiFetch<{ trips: Trip[] }>('/api/trips'),
      ]);
      setExpenses(expRes.expenses);
      setTrips(tripsRes.trips);
    } catch {
      pushToast('Unable to load expense ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!merchant.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      pushToast('Enter a valid merchant and positive INR amount', 'warning');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          merchant: merchant.trim(),
          amount: numericAmount,
          category,
          description: description.trim() || `${merchant.trim()} (${category})`,
          trip_id: tripId || null,
          payment_method: paymentMethod,
          reimbursable,
        }),
      });
      pushToast('Expense recorded to ledger', 'success');
      setMerchant('');
      setAmount('');
      setDescription('');
      setShowAdd(false);
      await loadData();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to save expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCycleStatus = async (exp: ExpenseWithTrip) => {
    const nextStatus: Record<ExpenseRecord['status'], ExpenseRecord['status']> = {
      logged: 'authorized',
      authorized: 'reimbursed',
      reimbursed: 'logged',
    };
    try {
      const res = await apiFetch<{ expense: ExpenseRecord }>(`/api/expenses/${exp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus[exp.status] }),
      });
      setExpenses((prev) => prev.map((item) => (item.id === exp.id ? { ...item, ...res.expense } : item)));
      pushToast(`Status updated to ${res.expense.status}`, 'success');
    } catch {
      pushToast('Unable to update status', 'error');
    }
  };

  const handleToggleReimbursable = async (exp: ExpenseWithTrip) => {
    try {
      const res = await apiFetch<{ expense: ExpenseRecord }>(`/api/expenses/${exp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ reimbursable: !exp.reimbursable }),
      });
      setExpenses((prev) => prev.map((item) => (item.id === exp.id ? { ...item, ...res.expense } : item)));
    } catch {
      pushToast('Unable to toggle reimbursable flag', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      setExpenses((prev) => prev.filter((item) => item.id !== id));
      pushToast('Expense removed from ledger', 'info');
    } catch {
      pushToast('Unable to delete expense', 'error');
    }
  };

  const handleExportCsv = async () => {
    try {
      const token = getInMemoryAuthToken();
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch('/api/expenses/export.csv', {
        headers,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wayfinder-expenses.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast('Downloaded wayfinder-expenses.csv', 'success');
    } catch {
      pushToast('Unable to export CSV', 'error');
    }
  };

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (tripFilter !== 'all' && e.trip_id !== tripFilter) return false;
      if (
        q &&
        !e.merchant.toLowerCase().includes(q) &&
        !e.description.toLowerCase().includes(q) &&
        !e.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, tripFilter, searchQuery]);

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);
  const reimbursableShare = expenses
    .filter((e) => e.reimbursable)
    .reduce((s, e) => s + e.amount, 0);
  const reimbursedTotal = expenses
    .filter((e) => e.status === 'reimbursed')
    .reduce((s, e) => s + e.amount, 0);
  const autoSyncedCount = expenses.filter((e) => Boolean(e.booking_id)).length;

  const categoryTotals = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B7058]">
              Wayfinder USP · Automated Spend Ledger
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#343D2B] mt-1">
              Expense Tracker
            </h1>
            <p className="text-sm text-[#68715A] mt-1">
              Every voice-approved booking and trip receipt automatically syncs here with one-click
              reimbursement status and CSV export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  `/concierge?prompt=${encodeURIComponent(
                    'Log a cab expense of ₹1,850 at Uber Premier',
                  )}`,
                )
              }
            >
              <Mic className="w-4 h-4 text-[#68764A]" />
              Log via Voice
            </Button>
            <Button variant="secondary" onClick={() => void handleExportCsv()}>
              <Download className="w-4 h-4 text-[#8B7058]" />
              Export CSV
            </Button>
            <Button variant="brown" onClick={() => setShowAdd((v) => !v)}>
              <Plus className="w-4 h-4" />
              {showAdd ? 'Close Form' : 'Log Expense'}
            </Button>
          </div>
        </header>

        {/* 4 Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#929987]">TOTAL LEDGER SPEND</span>
            <p className="font-display text-2xl font-semibold text-[#343D2B] mt-1 tabular-nums">
              ₹{totalSpend.toLocaleString('en-IN')}
            </p>
          </Card>
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#8B7058]">REIMBURSABLE SHARE</span>
            <p className="font-display text-2xl font-semibold text-[#8B7058] mt-1 tabular-nums">
              ₹{reimbursableShare.toLocaleString('en-IN')}
            </p>
          </Card>
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#547A55]">SETTLED / REIMBURSED</span>
            <p className="font-display text-2xl font-semibold text-[#547A55] mt-1 tabular-nums">
              ₹{reimbursedTotal.toLocaleString('en-IN')}
            </p>
          </Card>
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#68764A]">AUTO-SYNCED BOOKINGS</span>
            <p className="font-display text-2xl font-semibold text-[#68764A] mt-1 tabular-nums">
              {autoSyncedCount}
            </p>
          </Card>
        </div>

        {/* Inline Add Expense Form */}
        {showAdd && (
          <Card highlight className="p-6">
            <h2 className="font-display text-base font-semibold text-[#343D2B] mb-4">
              Record New Travel Expense
            </h2>
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ex-merchant" className="block font-mono text-xs text-[#68715A]">
                  Merchant / Vendor
                </label>
                <input
                  id="ex-merchant"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Gunpowder Assagao"
                  className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-3.5 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ex-amount" className="block font-mono text-xs text-[#68715A]">
                  Amount (INR)
                </label>
                <input
                  id="ex-amount"
                  required
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="3200"
                  className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-3.5 py-2.5 text-sm font-mono text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ex-cat" className="block font-mono text-xs text-[#68715A]">
                  Category
                </label>
                <select
                  id="ex-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-3.5 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                >
                  <option value="flight">Flight</option>
                  <option value="hotel">Hotel</option>
                  <option value="transport">Transport</option>
                  <option value="dining">Dining</option>
                  <option value="experience">Experience</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ex-trip" className="block font-mono text-xs text-[#68715A]">
                  Linked Trip (Optional)
                </label>
                <select
                  id="ex-trip"
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-3.5 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                >
                  <option value="">Standalone / Unassigned</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.destination})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ex-method" className="block font-mono text-xs text-[#68715A]">
                  Payment Card / Method
                </label>
                <input
                  id="ex-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-3.5 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ex-desc" className="block font-mono text-xs text-[#68715A]">
                  Notes / Purpose
                </label>
                <input
                  id="ex-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Executive dinner & transfer"
                  className="w-full rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-3.5 py-2.5 text-sm text-[#343D2B] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7]"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="inline-flex items-center gap-2 text-xs text-[#343D2B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reimbursable}
                    onChange={(e) => setReimbursable(e.target.checked)}
                    className="accent-[#68764A] w-4 h-4"
                  />
                  Mark as corporate reimbursable expense
                </label>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Recording...' : 'Save to Expense Ledger'}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        )}

        {/* Category Breakdown + Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-4 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#8B7058]" />
              <h2 className="font-display text-sm font-semibold text-[#343D2B]">
                Category Spend Mix
              </h2>
            </div>

            {categoryTotals.length === 0 ? (
              <p className="text-xs text-[#68715A]">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryTotals.map(([cat, sum]) => {
                  const pct = Math.round((sum / Math.max(1, totalSpend)) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize font-medium text-[#343D2B]">{cat}</span>
                        <span className="font-mono text-[#68715A] tabular-nums">
                          ₹{sum.toLocaleString('en-IN')} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E8EBDD] overflow-hidden">
                        <div
                          className="h-full bg-[#8B7058] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-8 p-5 space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryFilter(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      categoryFilter === c.id
                        ? 'bg-[#68764A] text-white'
                        : 'bg-[#F0F0E6] text-[#68715A] hover:text-[#343D2B]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 text-[#929987] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    aria-label="Search expenses"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vendor..."
                    className="w-full rounded-lg border border-[#DDE1D2] bg-[#F7F6F0] pl-8 pr-3 py-1.5 text-xs text-[#343D2B] focus:outline-none focus:border-[#68764A]"
                  />
                </div>
                <select
                  aria-label="Filter by trip"
                  value={tripFilter}
                  onChange={(e) => setTripFilter(e.target.value)}
                  className="rounded-lg border border-[#DDE1D2] bg-[#F7F6F0] px-2.5 py-1.5 text-xs text-[#343D2B]"
                >
                  <option value="all">All Trips</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.destination}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="rounded-xl bg-[#F7F6F0] border border-[#DDE1D2] p-6 text-center text-xs text-[#68715A]">
                No expenses match your filter. Click &ldquo;Log Expense&rdquo; or book a trip via
                Voice Concierge.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] hover:bg-[#FFFDF7] p-3.5 flex flex-wrap items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-sm font-semibold text-[#343D2B]">
                          {exp.merchant}
                        </p>
                        <Badge tone="neutral">{exp.category.toUpperCase()}</Badge>
                        {exp.booking_id && (
                          <Badge tone="success">
                            <CheckCircle2 className="w-3 h-3" />
                            AUTO-SYNCED
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#68715A] mt-0.5 truncate">
                        {exp.description}
                        {exp.trip_title ? ` · ${exp.trip_title}` : ''} · {exp.payment_method}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleToggleReimbursable(exp)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${
                          exp.reimbursable
                            ? 'border-[#8B7058]/35 bg-[#EDE5DA] text-[#8B7058]'
                            : 'border-[#DDE1D2] bg-[#FFFDF7] text-[#929987]'
                        }`}
                      >
                        {exp.reimbursable ? 'Reimbursable' : 'Personal'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleCycleStatus(exp)}
                        title="Click to cycle status"
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium uppercase cursor-pointer transition-colors ${
                          exp.status === 'reimbursed'
                            ? 'bg-[#E3E9D8] text-[#547A55]'
                            : exp.status === 'authorized'
                              ? 'bg-[#EDE5DA] text-[#8B7058]'
                              : 'bg-[#FFF6E5] text-[#A87832]'
                        }`}
                      >
                        {exp.status}
                      </button>

                      <span className="font-mono text-sm font-semibold text-[#343D2B] tabular-nums min-w-[78px] text-right">
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </span>

                      <button
                        type="button"
                        aria-label={`Delete ${exp.merchant}`}
                        onClick={() => void handleDelete(exp.id)}
                        className="p-1.5 rounded-lg text-[#929987] hover:text-[#A94F45] hover:bg-[#FDF0EE] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
