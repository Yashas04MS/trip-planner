import { CalendarCheck2, MapPin } from 'lucide-react';
import type { ItineraryItem } from '../../../shared/types';
import { Card } from '../ui/Card';

export function ItineraryTimeline({ items }: { items: ItineraryItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="font-display text-sm font-semibold text-[#343D2B]">
          Itinerary Timeline
        </h3>
        <p className="mt-1.5 text-sm text-[#68715A]">
          Confirmed flights, hotel check-ins, and Google Calendar holds will appear here
          chronologically.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-[#343D2B]">
          Synced Itinerary
        </h3>
        <span className="text-xs text-[#547A55] font-medium flex items-center gap-1.5">
          <CalendarCheck2 className="w-3.5 h-3.5" />
          Calendar linked
        </span>
      </div>

      <ol className="relative pl-5 space-y-4 border-l border-dashed border-[#8B7058]/50 ml-2">
        {items.map((item) => (
          <li key={item.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#8B7058] ring-4 ring-[#FFFDF7]"
            />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm text-[#343D2B]">{item.title}</p>
                <p className="text-xs text-[#68715A] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-[#8B7058]" />
                  {item.location}
                </p>
              </div>
              <span className="font-mono text-[11px] text-[#8B7058] font-medium tabular-nums shrink-0">
                {new Date(item.starts_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                ·{' '}
                {new Date(item.starts_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {item.calendar_event_id && (
              <p className="mt-1 font-mono text-[11px] text-[#929987]">
                Event ID: {item.calendar_event_id}
              </p>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
