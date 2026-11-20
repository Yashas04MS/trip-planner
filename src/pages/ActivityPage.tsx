import { Download, ShieldCheck, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ApprovalRequest, NotificationItem, ToolCallLog } from '../../shared/types';
import { ToolCallFeed } from '../components/agent/ToolCallFeed';
import { AppShell } from '../components/layout/AppShell';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { apiFetch } from '../lib/api';

type ActivityFilter = 'all' | 'tools' | 'approvals' | 'notifications';

export function ActivityPage() {
  const [toolCalls, setToolCalls] = useState<ToolCallLog[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{
          toolCalls: ToolCallLog[];
          approvals: ApprovalRequest[];
          notifications: NotificationItem[];
        }>('/api/trips/activity/logs');
        if (!cancelled) {
          setToolCalls(data.toolCalls);
          setApprovals(data.approvals);
          setNotifications(data.notifications);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      approvals,
      toolCalls,
      notifications,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wayfinder-audit-ledger.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B7058]">
              Deterministic Audit Trail
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#343D2B] mt-1">
              Activity &amp; Autonomous Outcomes
            </h1>
          </div>

          <Button variant="secondary" onClick={handleExportJson}>
            <Download className="w-4 h-4 text-[#8B7058]" />
            Export JSON Ledger
          </Button>
        </header>

        {/* 3 Summary KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#929987]">AUTONOMOUS TOOL RUNS</span>
            <p className="font-display text-2xl font-semibold text-[#68764A] mt-1 tabular-nums">
              {toolCalls.length}
            </p>
          </Card>
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#929987]">EXPLICIT APPROVALS</span>
            <p className="font-display text-2xl font-semibold text-[#8B7058] mt-1 tabular-nums">
              {approvals.length}
            </p>
          </Card>
          <Card className="p-4">
            <span className="font-mono text-[11px] text-[#929987]">DISPATCHED ALERTS</span>
            <p className="font-display text-2xl font-semibold text-[#343D2B] mt-1 tabular-nums">
              {notifications.length}
            </p>
          </Card>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'All Records'],
              ['approvals', 'Approvals'],
              ['tools', 'Tool Logs'],
              ['notifications', 'Notifications'],
            ] as Array<[ActivityFilter, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                filter === key
                  ? 'bg-[#68764A] text-white'
                  : 'bg-[#FFFDF7] border border-[#DDE1D2] text-[#68715A] hover:text-[#343D2B]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="space-y-6">
            {(filter === 'all' || filter === 'approvals') && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#68764A]" />
                  <h2 className="font-display text-sm font-semibold text-[#343D2B]">
                    Authorization Gate Ledger
                  </h2>
                </div>
                {approvals.length === 0 ? (
                  <p className="text-xs text-[#68715A]">
                    No approvals issued yet. Start a trip brief in Concierge to generate an
                    authorization record.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {approvals.map((app) => (
                      <div
                        key={app.id}
                        className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-medium text-[#343D2B]">{app.summary}</p>
                          <p className="font-mono text-[#929987] mt-0.5">
                            ID: {app.id.slice(0, 8)} · Channel: {app.resolved_via ?? 'pending'}
                          </p>
                        </div>
                        <Badge
                          tone={
                            app.status === 'consumed' || app.status === 'approved'
                              ? 'success'
                              : app.status === 'rejected' || app.status === 'expired'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {app.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {(filter === 'all' || filter === 'tools') && <ToolCallFeed logs={toolCalls} />}

            {(filter === 'all' || filter === 'notifications') && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#8B7058]" />
                  <h2 className="font-display text-sm font-semibold text-[#343D2B]">
                    Dispatched Notifications
                  </h2>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#68715A]">No notifications dispatched.</p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] px-4 py-3"
                      >
                        <p className="font-semibold text-[#343D2B]">{n.title}</p>
                        <p className="text-[#68715A] mt-0.5">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* Deterministic Audit Certificate Footer */}
            <div className="rounded-2xl border border-[#DDE1D2] bg-[#F0F0E6] px-5 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#68715A]">
              <span className="font-mono">
                AUDIT INTEGRITY · HUMAN-IN-THE-LOOP AUTHORIZATION ENFORCED
              </span>
              <span className="font-mono text-[#8B7058]">
                {approvals.length} approvals · {toolCalls.length} tool logs verified
              </span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
