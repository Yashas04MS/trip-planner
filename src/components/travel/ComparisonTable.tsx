import type { FlightOffer, HotelOffer } from '../../../shared/types';
import { Card } from '../ui/Card';

export function ComparisonTable({
  flights,
  hotels,
}: {
  flights: FlightOffer[];
  hotels: HotelOffer[];
}) {
  if (flights.length === 0 && hotels.length === 0) return null;

  return (
    <Card className="p-5 space-y-5 overflow-x-auto">
      {flights.length > 0 && (
        <div>
          <h4 className="font-display text-sm font-semibold text-[#343D2B] mb-2.5">
            Flight Options Comparison
          </h4>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#DDE1D2] text-[#68715A]">
                <th className="py-2 pr-3 font-medium">Flight</th>
                <th className="py-2 pr-3 font-medium">Depart</th>
                <th className="py-2 pr-3 font-medium">Fit</th>
                <th className="py-2 text-right font-medium">Round-Trip</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-[#DDE1D2]/60 hover:bg-[#F0F0E6]/60"
                >
                  <td className="py-2.5 pr-3 font-medium text-[#343D2B] whitespace-nowrap">
                    {f.airline} {f.flight_number}
                  </td>
                  <td className="py-2.5 pr-3 font-mono tabular-nums text-[#68715A] whitespace-nowrap">
                    {f.depart_at.slice(11, 16)}
                  </td>
                  <td className="py-2.5 pr-3">
                    {f.conflict_note ? (
                      <span className="text-[#A94F45] font-medium">Standup conflict</span>
                    ) : f.recommended ? (
                      <span className="text-[#547A55] font-medium">Recommended</span>
                    ) : (
                      <span className="text-[#929987]">Clear</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-[#343D2B] font-medium whitespace-nowrap">
                    ₹{f.price_inr.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hotels.length > 0 && (
        <div>
          <h4 className="font-display text-sm font-semibold text-[#343D2B] mb-2.5">
            Hospitality Availability Matrix
          </h4>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#DDE1D2] text-[#68715A]">
                <th className="py-2 pr-3 font-medium">Property</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 text-right font-medium">2 Nights</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => (
                <tr
                  key={h.id}
                  className="border-b border-[#DDE1D2]/60 hover:bg-[#F0F0E6]/60"
                >
                  <td className="py-2.5 pr-3 font-medium text-[#343D2B]">{h.name}</td>
                  <td className="py-2.5 pr-3">
                    {h.availability === 'sold_out' ? (
                      <span className="text-[#A94F45] font-medium">Sold out</span>
                    ) : h.recommended ? (
                      <span className="text-[#547A55] font-medium">Selected</span>
                    ) : (
                      <span className="text-[#68715A]">Available</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-[#343D2B] font-medium whitespace-nowrap">
                    ₹{h.total_price_inr.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
