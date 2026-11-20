import crypto from 'node:crypto';
import type { ChaosMode, FlightOffer, HotelOffer } from '../../shared/types';
import { RetryableError, ToolError } from '../lib/errors';

const CITY_AIRPORTS: Record<string, string> = {
  goa: 'GOI',
  goi: 'GOI',
  gox: 'GOX',
  bengaluru: 'BLR',
  bangalore: 'BLR',
  blr: 'BLR',
  mumbai: 'BOM',
  bom: 'BOM',
  delhi: 'DEL',
  del: 'DEL',
  udaipur: 'UDR',
  udr: 'UDR',
  jaipur: 'JAI',
  jai: 'JAI',
};

export function resolveAirportCode(place: string): string {
  const clean = place.trim().toLowerCase();
  return CITY_AIRPORTS[clean] || place.trim().slice(0, 3).toUpperCase();
}

export function buildMockFlights(params: {
  origin: string;
  destination: string;
  depart_date: string;
  return_date: string;
  max_price?: number;
  chaosMode?: ChaosMode;
  attempt?: number;
}): FlightOffer[] {
  if (params.chaosMode === 'flight_api_error' && (params.attempt ?? 1) === 1) {
    throw new RetryableError(
      'Upstream flight GDS gateway returned 503 Service Unavailable',
      'FLIGHT_UPSTREAM_503',
    );
  }

  const orig = resolveAirportCode(params.origin || 'BLR');
  const dest = resolveAirportCode(params.destination || 'GOI');
  const dep = params.depart_date || '2026-11-27';
  const ret = params.return_date || '2026-11-29';

  const offers: FlightOffer[] = [
    {
      id: 'fl-6e-214',
      airline: 'IndiGo',
      airline_code: '6E',
      flight_number: '6E 214',
      origin: orig,
      destination: dest,
      depart_at: `${dep}T14:15:00+05:30`,
      arrive_at: `${dep}T15:40:00+05:30`,
      return_flight_number: '6E 219',
      return_depart_at: `${ret}T16:40:00+05:30`,
      return_arrive_at: `${ret}T18:05:00+05:30`,
      duration_minutes: 85,
      stops: 0,
      cabin: 'Economy',
      price_inr: 11800,
      fare_class: 'Saver Flex',
      seat_class: '4C · Extra Legroom',
      conflict_note: 'Overlaps Friday 16:00 standup transit window',
    },
    {
      id: 'fl-ai-519',
      airline: 'Air India',
      airline_code: 'AI',
      flight_number: 'AI 519',
      origin: orig,
      destination: dest,
      depart_at: `${dep}T18:30:00+05:30`,
      arrive_at: `${dep}T19:50:00+05:30`,
      return_flight_number: 'AI 524',
      return_depart_at: `${ret}T19:15:00+05:30`,
      return_arrive_at: `${ret}T20:35:00+05:30`,
      duration_minutes: 80,
      stops: 0,
      cabin: 'Economy',
      price_inr: 14200,
      fare_class: 'Classic Non-Stop',
      seat_class: '6A · Quiet Zone',
      recommended: true,
      reason: 'Departs cleanly after 16:00 Friday standup with direct return',
    },
    {
      id: 'fl-ix-804',
      airline: 'Air India Express',
      airline_code: 'IX',
      flight_number: 'IX 804',
      origin: orig,
      destination: dest,
      depart_at: `${dep}T20:45:00+05:30`,
      arrive_at: `${dep}T22:05:00+05:30`,
      return_flight_number: 'IX 809',
      return_depart_at: `${ret}T21:10:00+05:30`,
      return_arrive_at: `${ret}T22:30:00+05:30`,
      duration_minutes: 80,
      stops: 0,
      cabin: 'Economy',
      price_inr: 12900,
      fare_class: 'Xpress Value',
      seat_class: '8F · Window',
    },
    {
      id: 'fl-ai-882',
      airline: 'Air India',
      airline_code: 'AI',
      flight_number: 'AI 882',
      origin: orig,
      destination: dest,
      depart_at: `${dep}T09:30:00+05:30`,
      arrive_at: `${dep}T10:50:00+05:30`,
      return_flight_number: 'AI 887',
      return_depart_at: `${ret}T17:50:00+05:30`,
      return_arrive_at: `${ret}T19:10:00+05:30`,
      duration_minutes: 80,
      stops: 0,
      cabin: 'Premium Economy',
      price_inr: 16500,
      fare_class: 'Premium Comfort',
      seat_class: '2A · Priority Boarding',
    },
  ];

  return params.max_price
    ? offers.filter((o) => o.price_inr <= params.max_price!)
    : offers;
}

export function buildMockHotels(params: {
  city: string;
  check_in: string;
  check_out: string;
  max_per_night?: number;
  stars?: number;
  chaosMode?: ChaosMode;
}): HotelOffer[] {
  const nights = Math.max(
    1,
    Math.round(
      (Date.parse(params.check_out || '2026-11-29') -
        Date.parse(params.check_in || '2026-11-27')) /
        (1000 * 60 * 60 * 24),
    ) || 2,
  );

  const cityLabel = params.city || 'Goa';
  const extraSoldOut = params.chaosMode === 'hotel_sold_out';

  const offers: HotelOffer[] = [
    {
      id: 'ht-casa-vagator',
      name: 'Casa Vagator Sanctuary',
      area: `Vagator Hilltop, ${cityLabel}`,
      city: cityLabel,
      stars: 4,
      nights,
      price_per_night_inr: 12500,
      total_price_inr: 12500 * nights,
      rating: 4.9,
      amenities: ['Cliffside pool', 'Airport chauffeur', 'Artisanal breakfast'],
      availability: 'sold_out',
      image_url: '/src/assets/images/goa_coastal_villa_1795204005249.jpg',
      reason: 'First-choice property sold out for requested weekend',
    },
    {
      id: 'ht-ahilya-assagao',
      name: 'Ahilya Courtyard Assagao',
      area: `Assagao Heritage Enclave, ${cityLabel}`,
      city: cityLabel,
      stars: 4,
      nights,
      price_per_night_inr: 11200,
      total_price_inr: 11200 * nights,
      rating: 4.8,
      amenities: ['Sandstone courtyard pool', 'Quiet garden suites', 'Breakfast included'],
      availability: extraSoldOut ? 'sold_out' : 'available',
      image_url: '/src/assets/images/goa_coastal_villa_1795204005249.jpg',
      recommended: !extraSoldOut,
      reason: 'Best 4-star quiet-luxury match within combined ₹40,000 budget',
    },
    {
      id: 'ht-palolem-olive',
      name: 'Palolem Olive Grove Suites',
      area: `Canacona Coast, ${cityLabel}`,
      city: cityLabel,
      stars: 4,
      nights,
      price_per_night_inr: 8900,
      total_price_inr: 8900 * nights,
      rating: 4.6,
      amenities: ['Private verandah', 'Beach access', 'High-speed workspace'],
      availability: 'available',
      image_url: '/src/assets/images/goa_coastal_villa_1795204005249.jpg',
      recommended: extraSoldOut,
      reason: 'Value-optimized boutique stay leaving ₹8,000+ headroom under budget',
    },
    {
      id: 'ht-taj-aguada',
      name: 'Taj Aguada Heritage Wing',
      area: `Sinquerim Fort, ${cityLabel}`,
      city: cityLabel,
      stars: 5,
      nights,
      price_per_night_inr: 17500,
      total_price_inr: 17500 * nights,
      rating: 4.9,
      amenities: ['Sea-view terrace', 'Spa sanctuary', 'Private lounge'],
      availability: 'available',
      image_url: '/src/assets/images/goa_coastal_villa_1795204005249.jpg',
    },
  ];

  return params.max_per_night
    ? offers.filter((o) => o.price_per_night_inr <= params.max_per_night!)
    : offers;
}

export async function confirmMockFlightBooking(
  flight: FlightOffer,
): Promise<{ provider: string; provider_ref: string }> {
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  return {
    provider: `${flight.airline} Sandbox GDS`,
    provider_ref: `WF-${flight.airline_code}${code}`,
  };
}

export async function confirmMockHotelBooking(
  hotel: HotelOffer,
): Promise<{ provider: string; provider_ref: string }> {
  if (hotel.availability === 'sold_out') {
    throw new ToolError(`Hotel ${hotel.name} is sold out`, 'HOTEL_SOLD_OUT');
  }
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  return {
    provider: 'Wayfinder Hospitality Sandbox',
    provider_ref: `HTL-${code}`,
  };
}

export async function cancelMockBooking(providerRef: string): Promise<void> {
  // Deterministic rollback no-op in sandbox
  void providerRef;
}
