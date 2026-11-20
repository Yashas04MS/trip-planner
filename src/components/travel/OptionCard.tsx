import { AlertCircle, Building2, Plane, Star } from 'lucide-react';
import type { FlightOffer, HotelOffer } from '../../../shared/types';
import { Card } from '../ui/Card';

export function FlightOptionCard({ flight }: { flight: FlightOffer }) {
  return (
    <Card
      highlight={Boolean(flight.recommended)}
      className="p-4 flex flex-col justify-between gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E3E9D8] border border-[#DDE1D2] flex items-center justify-center text-[#68764A]">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-[#343D2B]">
              {flight.airline} {flight.flight_number}
            </p>
            <p className="text-xs text-[#68715A]">
              {flight.fare_class} · {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}
            </p>
          </div>
        </div>
        <span className="font-display text-base font-semibold text-[#68764A] tabular-nums">
          ₹{flight.price_inr.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
        <span className="text-[#343D2B] font-medium">
          {flight.origin} {flight.depart_at.slice(11, 16)}
        </span>
        <span className="flex-1 border-b border-dashed border-[#8B7058] relative h-0">
          <span className="absolute -left-0.5 -top-[3px] w-1.5 h-1.5 rounded-full bg-[#8B7058]" />
          <span className="absolute -right-0.5 -top-[3px] w-1.5 h-1.5 rounded-full bg-[#68764A]" />
        </span>
        <span className="text-[#343D2B] font-medium">
          {flight.destination} {flight.arrive_at.slice(11, 16)}
        </span>
      </div>

      {flight.conflict_note && (
        <p className="text-xs text-[#A94F45] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {flight.conflict_note}
        </p>
      )}
      {flight.reason && !flight.conflict_note && (
        <p className="text-xs text-[#547A55] font-medium">{flight.reason}</p>
      )}
    </Card>
  );
}

export function HotelOptionCard({ hotel }: { hotel: HotelOffer }) {
  const soldOut = hotel.availability === 'sold_out';

  return (
    <Card
      highlight={Boolean(hotel.recommended && !soldOut)}
      className={`p-4 flex flex-col justify-between gap-3 ${soldOut ? 'opacity-75 bg-[#F0F0E6]' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#EDE5DA] border border-[#8B7058]/25 flex items-center justify-center text-[#8B7058] shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p
              className={`font-display text-sm font-semibold truncate ${
                soldOut ? 'line-through text-[#929987]' : 'text-[#343D2B]'
              }`}
            >
              {hotel.name}
            </p>
            <p className="text-xs text-[#68715A] truncate">
              {hotel.area} · {hotel.stars}★ · {hotel.rating.toFixed(1)}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {soldOut ? (
            <span className="text-xs font-mono font-semibold text-[#A94F45]">SOLD OUT</span>
          ) : (
            <>
              <p className="font-display text-base font-semibold text-[#68764A] tabular-nums">
                ₹{hotel.total_price_inr.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-[#929987] tabular-nums">
                ₹{hotel.price_per_night_inr.toLocaleString('en-IN')}/night
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-[#68715A]">
        <span className="truncate">{hotel.amenities.slice(0, 2).join(' · ')}</span>
        <span className="inline-flex items-center gap-1 text-[#8B7058] font-medium shrink-0 tabular-nums">
          <Star className="w-3 h-3 fill-current" />
          {hotel.rating.toFixed(1)}
        </span>
      </div>

      {hotel.reason && (
        <p className={`text-xs font-medium ${soldOut ? 'text-[#A87832]' : 'text-[#547A55]'}`}>
          {hotel.reason}
        </p>
      )}
    </Card>
  );
}
