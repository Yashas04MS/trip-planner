import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useSessionStore } from '../../store/session.store';

export function ToastRegion() {
  const toasts = useSessionStore((s) => s.toasts);
  const dismissToast = useSessionStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 lg:top-5 lg:right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-full pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon =
          t.tone === 'success'
            ? CheckCircle2
            : t.tone === 'warning' || t.tone === 'error'
              ? AlertTriangle
              : Info;
        const styleTone =
          t.tone === 'error'
            ? 'border-[#A94F45]/40 text-[#A94F45]'
            : t.tone === 'warning'
              ? 'border-[#A87832]/45 text-[#A87832]'
              : t.tone === 'success'
                ? 'border-[#68764A]/45 text-[#547A55]'
                : 'border-[#DDE1D2] text-[#68764A]';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border bg-[#FFFDF7]/95 backdrop-blur-md shadow-lg px-4 py-3 text-sm ${styleTone}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-[#343D2B]">{t.title}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="p-1 text-[#929987] hover:text-[#343D2B] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
