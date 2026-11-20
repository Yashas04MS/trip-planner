import { Building2, Calendar, Check, Plane, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ApprovalRequest } from '../../../shared/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  busy: boolean;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string) => Promise<void> | void;
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((Date.parse(approval.expires_at) - Date.now()) / 1000)),
  );
  const [resolvingDecision, setResolvingDecision] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (approval.status !== 'pending') return;
    const timer = setInterval(() => {
      setSecondsLeft(
        Math.max(0, Math.floor((Date.parse(approval.expires_at) - Date.now()) / 1000)),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [approval.expires_at, approval.status]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const { outbound_flight: flight, hotel, adaptations, side_effects, budget } =
    approval.payload;

  const isPending = approval.status === 'pending' && secondsLeft > 0;
  const budgetPct = Math.min(100, Math.round((approval.total_cost / Math.max(1, budget)) * 100));
  const underBudget = budget - approval.total_cost;

  const handleAction = async (decision: 'approve' | 'reject') => {
    setResolvingDecision(decision);
    try {
      if (decision === 'approve') {
        await onApprove(approval.id);
      } else {
        await onReject(approval.id);
      }
    } finally {
      setResolvingDecision(null);
    }
  };

  return (
    <Card highlight={isPending} className="p-5 space-y-4" data-testid="approval-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E3E9D8] text-[#68764A] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-semibold text-[#343D2B]">
                Needs Your Approval
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#EDE5DA] text-[#8B7058] font-mono text-[11px] font-medium">
                Authorizer
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#68715A]">
              {approval.payload.trip_title} · {approval.payload.start_date} to{' '}
              {approval.payload.end_date}
            </p>
          </div>
        </div>

        <Badge
          tone={
            approval.status === 'approved' || approval.status === 'consumed'
              ? 'success'
              : approval.status === 'rejected' || approval.status === 'expired'
                ? 'danger'
                : 'warning'
          }
        >
          {isPending ? `Expires ${mins}:${secs}` : approval.status.toUpperCase()}
        </Badge>
      </div>

      {adaptations.length > 0 && (
        <div className="rounded-xl border border-[#8B7058]/30 bg-[#EDE5DA]/55 px-3.5 py-2.5 space-y-1">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8B7058] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Automatic Adaptations Applied
          </p>
          {adaptations.map((note, idx) => (
            <p key={idx} className="text-xs text-[#343D2B]">
              {note}
            </p>
          ))}
        </div>
      )}

      {/* Boarding-pass route & itemized breakdown */}
      <div className="rounded-xl bg-[#F7F6F0] border border-[#DDE1D2] p-4 space-y-3">
        <div className="flex items-center justify-between font-mono text-xs font-medium text-[#68715A]">
          <span>ROUTE ITINERARY</span>
          <span className="text-[#8B7058]">
            {flight.origin} → {flight.destination}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <p className="font-display text-lg font-semibold text-[#343D2B] tabular-nums">
              {flight.depart_at.slice(11, 16)}
            </p>
            <p className="text-[11px] text-[#929987] font-mono">{flight.origin}</p>
          </div>
          <div className="flex-1 flex items-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-[#8B7058]" />
            <div className="flex-1 border-t-2 border-dashed border-[#A7B58A]" />
            <Plane className="w-3.5 h-3.5 text-[#68764A]" />
            <div className="flex-1 border-t-2 border-dashed border-[#A7B58A]" />
            <span className="w-2 h-2 rounded-full bg-[#68764A]" />
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold text-[#343D2B] tabular-nums">
              {flight.arrive_at.slice(11, 16)}
            </p>
            <p className="text-[11px] text-[#929987] font-mono">{flight.destination}</p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#DDE1D2] text-xs">
          <div className="flex items-center justify-between gap-2 text-[#68715A]">
            <span className="flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5 text-[#68764A]" />
              {flight.airline} {flight.flight_number} ({flight.seat_class})
            </span>
            <span className="font-mono font-medium text-[#343D2B] tabular-nums">
              ₹{flight.price_inr.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[#68715A]">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#8B7058]" />
              {hotel.name} ({hotel.nights} nights)
            </span>
            <span className="font-mono font-medium text-[#343D2B] tabular-nums">
              ₹{hotel.total_price_inr.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Budget utilization meter */}
        <div className="pt-2 space-y-1.5">
          <div className="flex justify-between font-mono text-xs">
            <span className="font-semibold text-[#343D2B] tabular-nums">
              Total: ₹{approval.total_cost.toLocaleString('en-IN')}
            </span>
            <span className={underBudget >= 0 ? 'text-[#547A55]' : 'text-[#A94F45]'}>
              {underBudget >= 0
                ? `₹${underBudget.toLocaleString('en-IN')} under ₹${budget.toLocaleString('en-IN')} cap`
                : `₹${Math.abs(underBudget).toLocaleString('en-IN')} over cap`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#E8EBDD] overflow-hidden">
            <div
              className="h-full bg-[#68764A] rounded-full transition-all duration-500"
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#EDE5DA]/50 rounded-xl p-3 space-y-1.5">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#8B7058] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Automated Actions on Approval
        </p>
        <ul className="space-y-1 text-xs text-[#68715A]">
          {side_effects.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#68764A] shrink-0" />
              <span>{item}</span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B7058] shrink-0" />
            <span>Auto-record flight &amp; hotel charges to Expense Tracker ledger</span>
          </li>
        </ul>
      </div>

      {isPending && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              className="flex-1"
              disabled={resolvingDecision !== null}
              onClick={() => void handleAction('approve')}
            >
              <Check className="w-4 h-4" />
              {resolvingDecision === 'approve' ? 'Authorizing...' : 'Approve and book'}
            </Button>
            <Button
              variant="secondary"
              disabled={resolvingDecision !== null}
              onClick={() => void handleAction('reject')}
            >
              <X className="w-4 h-4" />
              {resolvingDecision === 'reject' ? 'Holding...' : 'Adjust Plan'}
            </Button>
          </div>
          <p className="text-center text-[11px] text-[#929987]">
            Tip: You can also just say{' '}
            <span className="font-semibold text-[#343D2B]">“Yes, book it”</span>
          </p>
        </div>
      )}

      {!isPending && approval.resolved_via && (
        <p className="text-xs text-[#68715A] font-mono">
          Resolved via {approval.resolved_via}
          {approval.resolved_at
            ? ` · ${new Date(approval.resolved_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : ''}
        </p>
      )}
    </Card>
  );
}
