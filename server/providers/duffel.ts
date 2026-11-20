import type { FlightOffer } from '../../shared/types';
import { env } from '../config/env';
import { buildMockFlights, resolveAirportCode } from './mock-travel';

export async function searchDuffelFlights(params: {
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string;
  max_price?: number;
}): Promise<FlightOffer[]> {
  if (!env.DUFFEL_ACCESS_TOKEN) {
    return buildMockFlights(params);
  }

  const origin = resolveAirportCode(params.origin);
  const destination = resolveAirportCode(params.destination);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch('https://api.duffel.com/air/offer_requests', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.DUFFEL_ACCESS_TOKEN}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices: [
            { origin, destination, departure_date: params.depart_date },
            { origin: destination, destination: origin, departure_date: params.return_date },
          ],
          passengers: [{ type: 'adult' }],
          cabin_class: 'economy',
        },
      }),
    });
    clearTimeout(timer);

    if (!response.ok) {
      return buildMockFlights(params);
    }

    const json = (await response.json()) as {
      data?: { offers?: Array<Record<string, unknown>> };
    };
    const rawOffers = json.data?.offers ?? [];
    if (rawOffers.length === 0) {
      return buildMockFlights(params);
    }

    return rawOffers.slice(0, 4).map((o, idx) => {
      const owner = (o.owner as { name?: string; iata_code?: string } | undefined) ?? {};
      const slices = (o.slices as Array<{ segments?: Array<Record<string, unknown>> }>) ?? [];
      const firstSeg = slices[0]?.segments?.[0] ?? {};
      const retSeg = slices[1]?.segments?.[0] ?? {};
      const amount = Number((o.total_amount as string) || '14000');

      return {
        id: String(o.id || `duffel-${idx}`),
        airline: owner.name || 'Partner Airline',
        airline_code: owner.iata_code || 'WF',
        flight_number: `${owner.iata_code || 'WF'} ${String(firstSeg.operating_carrier_flight_number || 400 + idx)}`,
        origin,
        destination,
        depart_at: String(firstSeg.departing_at || `${params.depart_date}T18:30:00+05:30`),
        arrive_at: String(firstSeg.arriving_at || `${params.depart_date}T20:00:00+05:30`),
        return_depart_at: String(retSeg.departing_at || `${params.return_date}T19:00:00+05:30`),
        return_arrive_at: String(retSeg.arriving_at || `${params.return_date}T20:30:00+05:30`),
        duration_minutes: 90,
        stops: Math.max(0, (slices[0]?.segments?.length ?? 1) - 1),
        cabin: 'Economy',
        price_inr: Math.round(amount),
        fare_class: 'Duffel Offer',
        seat_class: 'Standard Select',
        recommended: idx === 0,
      };
    });
  } catch {
    return buildMockFlights(params);
  }
}
