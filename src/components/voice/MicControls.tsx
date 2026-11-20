import { Mic, MicOff, PhoneOff, Receipt, Layers, Send, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';

interface MicControlsProps {
  connected: boolean;
  muted: boolean;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onSubmitPrompt: (text: string) => void;
}

export const DEMO_GOAL_PROMPT =
  'Plan me a weekend in Goa next week, under forty thousand rupees. I have a standup on Friday at four.';

export function MicControls({
  connected,
  muted,
  busy,
  onStart,
  onStop,
  onToggleMute,
  onSubmitPrompt,
}: MicControlsProps) {
  const [draft, setDraft] = useState('');
  const [dictating, setDictating] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    onSubmitPrompt(draft.trim());
    setDraft('');
  };

  const handleDictate = () => {
    const SpeechRec =
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => unknown;
          SpeechRecognition?: new () => unknown;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setDraft(DEMO_GOAL_PROMPT);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rec = new (SpeechRec as any)();
      rec.lang = 'en-US';
      rec.interimResults = false;
      setDictating(true);
      rec.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        setDictating(false);
        if (transcript) {
          onSubmitPrompt(transcript);
        }
      };
      rec.onerror = () => setDictating(false);
      rec.onend = () => setDictating(false);
      rec.start();
    } catch {
      setDictating(false);
    }
  };

  return (
    <div className="space-y-3 bg-[#FFFDF7] border border-[#DDE1D2] rounded-2xl p-3.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {!connected ? (
            <Button onClick={onStart} size="sm">
              <Mic className="w-3.5 h-3.5" />
              Connect Voice
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onToggleMute}>
                {muted ? (
                  <MicOff className="w-3.5 h-3.5 text-[#A94F45]" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-[#68764A]" />
                )}
                {muted ? 'Unmute Audio' : 'Mute Audio'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDictate} disabled={busy}>
                <Mic className="w-3.5 h-3.5 text-[#8B7058]" />
                {dictating ? 'Listening...' : 'Push-to-Talk'}
              </Button>
              <Button variant="danger" size="sm" onClick={onStop}>
                <PhoneOff className="w-3.5 h-3.5" />
                End Call
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onSubmitPrompt(DEMO_GOAL_PROMPT)}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#68764A]" />
            Goa Brief
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onSubmitPrompt('Log a cab expense of ₹1,850 at Uber Premier')}
          >
            <Receipt className="w-3.5 h-3.5 text-[#8B7058]" />
            Log Expense
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              onSubmitPrompt('Combine Jaipur Heritage and Goa Weekend into one trip circuit')
            }
          >
            <Layers className="w-3.5 h-3.5 text-[#8B7058]" />
            Combine Trips
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label htmlFor="concierge-prompt" className="sr-only">
          Speak or type a travel request
        </label>
        <input
          id="concierge-prompt"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          placeholder="Type instructions, log an expense (e.g. 'Log cab ₹1,850'), or say 'yes, book it'..."
          className="flex-1 min-w-0 rounded-xl border border-[#DDE1D2] bg-[#F0F0E6] px-4 py-2.5 text-sm text-[#343D2B] placeholder:text-[#929987] focus:outline-none focus:border-[#68764A] focus:bg-[#FFFDF7] transition-colors"
        />
        <Button type="submit" disabled={busy || !draft.trim()}>
          <Send className="w-4 h-4" />
          Send
        </Button>
      </form>
    </div>
  );
}
