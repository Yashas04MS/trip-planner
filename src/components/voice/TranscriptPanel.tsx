import { ChevronDown, MessageSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../../shared/types';

export function TranscriptPanel({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-[#DDE1D2] bg-[#FFFDF7] p-4 text-sm text-[#68715A] shadow-sm">
        Your live transcript will appear here once you speak or submit a travel brief.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#DDE1D2] bg-[#FFFDF7]/90 backdrop-blur-sm shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#F0F0E6]/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#68764A]" />
          <span className="font-mono text-xs font-medium uppercase tracking-wide text-[#343D2B]">
            Acoustic Transcript ({messages.length} {messages.length === 1 ? 'Turn' : 'Turns'})
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#68715A] transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div
          aria-label="Conversation transcript"
          className="border-t border-[#DDE1D2] px-4 py-3 space-y-2.5 max-h-[190px] overflow-y-auto"
        >
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className="flex items-start gap-2.5 text-sm">
                <span className="font-mono text-[11px] text-[#929987] tabular-nums pt-0.5 shrink-0">
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <p className="text-[#343D2B] leading-relaxed">
                  <span
                    className={`font-semibold mr-1.5 ${
                      isUser ? 'text-[#8B7058]' : 'text-[#68764A]'
                    }`}
                  >
                    {isUser ? 'You:' : 'Concierge:'}
                  </span>
                  {m.content}
                </p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
