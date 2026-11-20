import { CheckCircle2, Clock, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import type { Plan, PlanStep, PlanStepStatus } from '../../../shared/types';
import { Card } from '../ui/Card';

function StepStatusIcon({ status }: { status: PlanStepStatus }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-4 h-4 text-[#547A55] shrink-0" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-[#68764A] animate-spin shrink-0" />;
    case 'adapting':
      return <RefreshCw className="w-4 h-4 text-[#A87832] shrink-0" />;
    case 'awaiting_approval':
      return <ShieldAlert className="w-4 h-4 text-[#8B7058] shrink-0" />;
    case 'failed':
      return <ShieldAlert className="w-4 h-4 text-[#A94F45] shrink-0" />;
    default:
      return <Clock className="w-4 h-4 text-[#929987] shrink-0" />;
  }
}

export function PlanTimeline({
  plan,
  steps,
}: {
  plan: Plan | null;
  steps: PlanStep[];
}) {
  if (!plan || steps.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="font-display text-sm font-semibold text-[#343D2B]">
          Orchestration Plan
        </h3>
        <p className="mt-1.5 text-sm text-[#68715A]">
          Once you share a travel brief, Wayfinder builds a dependency graph and runs calendar,
          flights, stays, and weather checks in parallel.
        </p>
      </Card>
    );
  }

  const parallelKeys = new Set(['check_calendar', 'search_flights', 'search_hotels', 'get_weather']);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-[#343D2B]">
            Agent Execution Trace
          </h3>
          <p className="mt-1 text-xs text-[#68715A] line-clamp-2">{plan.goal}</p>
        </div>
        <span className="font-mono text-xs text-[#68764A] font-medium tabular-nums shrink-0">
          {steps.filter((s) => s.status === 'done').length}/{steps.length}
        </span>
      </div>

      <ol className="space-y-2">
        {steps.map((step) => {
          const isParallel = parallelKeys.has(step.key);
          return (
            <li
              key={step.id}
              className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                step.status === 'adapting' || step.status === 'awaiting_approval'
                  ? 'border-[#8B7058]/40 bg-[#EDE5DA]/55'
                  : step.status === 'running'
                    ? 'border-[#68764A]/45 bg-[#E8EBDD]'
                    : 'border-[#DDE1D2] bg-[#F7F6F0]'
              }`}
            >
              <div className="mt-0.5">
                <StepStatusIcon status={step.status} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#343D2B] truncate">{step.title}</span>
                  <span className="font-mono text-[11px] text-[#68715A] bg-[#FFFDF7] px-1.5 py-0.5 rounded border border-[#DDE1D2] shrink-0">
                    {step.agent}
                    {isParallel ? ' · parallel' : ''}
                  </span>
                </div>
                {step.result_summary && (
                  <p className="mt-0.5 text-xs text-[#68715A]">{step.result_summary}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
