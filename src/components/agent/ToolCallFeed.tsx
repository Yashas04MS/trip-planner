import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import { useState } from 'react';
import type { ToolCallLog } from '../../../shared/types';
import { Card } from '../ui/Card';

export function ToolCallFeed({ logs }: { logs: ToolCallLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-[#343D2B]">
          <Terminal className="w-4 h-4 text-[#68764A]" />
          <span>Tool Execution Feed</span>
        </div>
        <p className="mt-1.5 text-sm text-[#68715A]">
          Real-time tool invocations, arguments, and latencies will stream here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-[#343D2B]">
          Coordinated Tool Calls
        </h3>
        <span className="font-mono text-xs text-[#68715A] tabular-nums">
          {logs.length} call{logs.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2">
        {logs.map((log) => {
          const isOpen = expandedId === log.id;
          return (
            <div
              key={log.id}
              className="rounded-xl border border-[#DDE1D2] bg-[#F7F6F0] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : log.id)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#F0F0E6] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#68715A] shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#68715A] shrink-0" />
                  )}
                  <span className="font-mono text-xs font-medium text-[#68764A] truncate">
                    {log.tool}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 font-mono text-[11px] tabular-nums shrink-0">
                  <span
                    className={
                      log.status === 'ok'
                        ? 'text-[#547A55] font-medium'
                        : log.status === 'error'
                          ? 'text-[#A94F45] font-medium'
                          : 'text-[#8B7058]'
                    }
                  >
                    {log.status}
                  </span>
                  {log.latency_ms !== null && (
                    <span className="text-[#929987]">{log.latency_ms}ms</span>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[#DDE1D2] bg-[#F0F0E6] p-3 font-mono text-[11px] text-[#343D2B] space-y-2 overflow-x-auto">
                  <div>
                    <span className="text-[#8B7058] font-medium">args: </span>
                    <pre className="whitespace-pre-wrap break-all mt-0.5">
                      {JSON.stringify(log.args, null, 2)}
                    </pre>
                  </div>
                  {log.result && (
                    <div>
                      <span className="text-[#68764A] font-medium">result: </span>
                      <pre className="whitespace-pre-wrap break-all mt-0.5">
                        {JSON.stringify(log.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
