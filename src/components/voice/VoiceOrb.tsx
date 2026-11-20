import { AudioLines, Mic, Volume2 } from 'lucide-react';
import type { OrbState } from '../../../shared/types';

interface VoiceOrbProps {
  state: OrbState;
  connected: boolean;
  onToggleConnect: () => void;
}

const STATE_LABELS: Record<OrbState, string> = {
  idle: 'Standby · Ready for voice',
  listening: 'Listening · Speak naturally',
  thinking: 'Coordinating agents...',
  speaking: 'Wayfinder speaking',
};

export function VoiceOrb({ state, connected, onToggleConnect }: VoiceOrbProps) {
  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative flex items-center justify-center w-[184px] h-[184px] sm:w-[220px] sm:h-[220px]">
        {/* Soft sage/ivory ambient halo */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 rounded-full transition-opacity duration-300 ${
            connected ? 'opacity-100' : 'opacity-50'
          }`}
          style={{
            background:
              'radial-gradient(circle, rgba(167,181,138,0.34) 0%, rgba(139,112,88,0.12) 55%, transparent 74%)',
          }}
        />

        {/* Listening dynamic ripples */}
        {state === 'listening' && (
          <>
            <span
              aria-hidden="true"
              className="absolute inset-3 rounded-full border border-[#68764A]/45 animate-orb-ripple"
            />
            <span
              aria-hidden="true"
              className="absolute inset-3 rounded-full border border-[#8B7058]/35 animate-orb-ripple"
              style={{ animationDelay: '0.7s' }}
            />
          </>
        )}

        {/* Thinking segmented ring */}
        {state === 'thinking' && (
          <svg
            aria-hidden="true"
            viewBox="0 0 220 220"
            className="absolute inset-0 w-full h-full animate-orb-spin"
          >
            <circle
              cx="110"
              cy="110"
              r="102"
              fill="none"
              stroke="#8B7058"
              strokeWidth="2"
              strokeDasharray="34 18 12 18"
              strokeOpacity="0.65"
            />
          </svg>
        )}

        {/* Core interactive VoiceOrb sphere matching reference HTML */}
        <button
          type="button"
          onClick={onToggleConnect}
          aria-label={
            connected ? 'Voice session active — click to disconnect' : 'Start voice session'
          }
          data-orb-state={state}
          className={`relative w-[158px] h-[158px] sm:w-[192px] sm:h-[192px] rounded-full border border-white/60 shadow-[0_14px_48px_rgba(104,118,74,0.28)] flex flex-col items-center justify-center transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#68764A] cursor-pointer overflow-hidden ${
            state === 'idle' ? 'animate-orb-breathe' : ''
          }`}
          style={{
            background: connected
              ? 'radial-gradient(circle at 32% 28%, #C9D4B2 0%, #91A276 38%, #68764A 74%, #4F5D3B 100%)'
              : 'radial-gradient(circle at 32% 28%, #EDE5DA 0%, #B8A592 48%, #8B7058 95%)',
          }}
        >
          {/* Specular glass highlight */}
          <span
            aria-hidden="true"
            className="absolute top-3 left-6 w-20 h-9 rounded-full bg-white/30 blur-md -rotate-12 pointer-events-none"
          />

          <div className="relative z-10 w-20 h-20 rounded-full bg-white/15 backdrop-blur-xs flex flex-col items-center justify-center">
            {state === 'speaking' ? (
              <div className="flex items-center gap-1 h-7" aria-hidden="true">
                {[0.55, 0.95, 0.7, 1, 0.6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-white transition-all duration-150"
                    style={{ height: `${Math.round(h * 26)}px` }}
                  />
                ))}
              </div>
            ) : state === 'thinking' ? (
              <AudioLines className="w-7 h-7 text-white animate-pulse" />
            ) : state === 'listening' ? (
              <Volume2 className="w-7 h-7 text-white" />
            ) : (
              <Mic className="w-7 h-7 text-white" />
            )}
          </div>
          <span className="relative z-10 mt-2 font-display text-xs font-semibold tracking-wide text-white/95">
            {connected ? 'Live' : 'Connect'}
          </span>
        </button>
      </div>

      <p className="mt-3 text-xs font-medium text-[#68715A] tracking-wide">
        {connected ? STATE_LABELS[state] : 'Tap orb to open concierge channel'}
      </p>
    </div>
  );
}
