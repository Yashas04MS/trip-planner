import { Building2, CheckCircle2, Plane } from 'lucide-react';
import type { BookingRecord } from '../../../shared/types';
import { Badge } from '../ui/Badge';

export function BookingConfirmationCard({ booking }: { booking: BookingRecord }) {
  const details = booking.details as Record<string, string | number | undefined>;
  const isFlight = booking.type === 'flight';

  return (
    <div className="ticket-notches rounded-2xl border border-[#DDE1D2] bg-[#FFFDF7] shadow-sm overflow-hidden">
      {/* Top ticket half */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#8B7058]">
            {isFlight ? (
              <Plane className="w-4 h-4 text-[#68764A]" />
            ) : (
              <Building2 className="w-4 h-4 text-[#8B7058]" />
            )}
            <span>{isFlight ? 'Executive Boarding Stub' : 'Hospitality Voucher'}</span>
          </div>

          <Badge tone={booking.status === 'changed' ? 'warning' : 'success'}>
            <CheckCircle2 className="w-3 h-3" />
            {booking.status === 'changed' ? 'REBOOKED' : 'CONFIRMED'}
          </Badge>
        </div>

        {isFlight ? (
          <div className="flex items-center justify-between gap-4 pt-1">
            <div>
              <p className="font-display text-2xl font-semibold text-[#343D2B] tracking-tight">
                {String(details.origin || 'BLR')}
              </p>
              <p className="font-mono text-xs text-[#68715A] tabular-nums">
                {details.depart_at ? String(details.depart_at).slice(11, 16) : '18:30'}
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="font-mono text-[11px] font-medium text-[#8B7058]">
                {String(details.flight_number || 'AI 519')}
              </span>
              <div className="w-full border-b border-dashed border-[#A7B58A] relative">
                <span className="absolute -left-1 -top-[3px] w-1.5 h-1.5 rounded-full bg-[#8B7058]" />
                <span className="absolute -right-1 -top-[3px] w-1.5 h-1.5 rounded-full bg-[#68764A]" />
              </div>
              <span className="text-[11px] text-[#929987]">{String(details.airline || '')}</span>
            </div>

            <div className="text-right">
              <p className="font-display text-2xl font-semibold text-[#343D2B] tracking-tight">
                {String(details.destination || 'GOI')}
              </p>
              <p className="font-mono text-xs text-[#68715A] tabular-nums">
                {details.arrive_at ? String(details.arrive_at).slice(11, 16) : '19:50'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-display text-lg font-semibold text-[#343D2B]">
              {String(details.name || 'Boutique Stay')}
            </p>
            <p className="text-xs text-[#68715A]">
              {String(details.area || '')} · {String(details.nights || 2)} nights ·{' '}
              {String(details.room || 'Suite')}
            </p>
          </div>
        )}
      </div>

      {/* Dotted earthy brown ticket divider */}
      <div className="border-t border-dashed border-[#8B7058]/35 mx-4" />

      {/* Bottom ticket stub half with barcode graphic */}
      <div className="px-5 py-3.5 bg-[#F0F0E6]/75 space-y-2.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[#929987] block text-[11px]">Provider Ref</span>
            <span className="font-mono font-semibold text-[#68764A]">
              {booking.provider_ref}
            </span>
          </div>
          {details.seat_class && (
            <div>
              <span className="text-[#929987] block text-[11px]">Allocation</span>
              <span className="text-[#343D2B] font-medium">{String(details.seat_class)}</span>
            </div>
          )}
          <div className="text-right">
            <span className="text-[#929987] block text-[11px]">Authorized</span>
            <span className="font-mono font-semibold text-[#343D2B] tabular-nums">
              ₹{booking.price.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Crisp Barcode SVG */}
        <div className="pt-1 flex flex-col items-center">
          <svg
            aria-hidden="true"
            className="w-full h-7 text-[#343D2B]/80"
            preserveAspectRatio="none"
            viewBox="0 0 240 32"
          >
            {[0, 6, 12, 22, 28, 34, 46, 52, 60, 66, 74, 84, 90, 98, 108, 114, 120, 132, 140, 148, 154, 164, 170, 180, 186, 194, 204, 210, 220, 226, 236].map(
              (x, idx) => (
                <rect
                  key={x}
                  x={x}
                  y={0}
                  width={idx % 3 === 0 ? 5 : idx % 2 === 0 ? 3 : 2}
                  height={32}
                  fill="currentColor"
                />
              ),
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
