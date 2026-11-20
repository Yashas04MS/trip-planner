import { store } from '../lib/store';
import { buildMockFlights } from '../providers/mock-travel';

export async function simulateTripDisruption(params: {
  tripId: string;
  sessionId?: string | null;
}) {
  const bundle = await store.getTripBundle(params.tripId);
  if (!bundle) {
    throw new Error('Trip not found');
  }
  const flightBooking = bundle.bookings.find((b) => b.type === 'flight');
  const flightNum =
    (flightBooking?.details?.flight_number as string | undefined) || 'AI 519';
  const origDepart =
    (flightBooking?.details?.depart_at as string | undefined) ||
    `${bundle.trip.start_date}T18:30:00+05:30`;

  const alts = buildMockFlights({
    origin: bundle.trip.origin,
    destination: bundle.trip.destination,
    depart_date: bundle.trip.start_date,
    return_date: bundle.trip.end_date,
  })
    .filter((f) => f.flight_number !== flightNum)
    .sort((a, b) => {
      const aHour = Number(a.depart_at.slice(11, 13));
      const bHour = Number(b.depart_at.slice(11, 13));
      const aEvening = aHour >= 17 ? 0 : 1;
      const bEvening = bHour >= 17 ? 0 : 1;
      if (aEvening !== bEvening) return aEvening - bEvening;
      return bHour - aHour;
    });

  const disruption = await store.addDisruption(params.sessionId ?? null, {
    trip_id: bundle.trip.id,
    booking_id: flightBooking?.id ?? null,
    type: 'flight_delay',
    detail: {
      flight_number: flightNum,
      original_depart: origDepart,
      new_depart: `${bundle.trip.start_date}T20:05:00+05:30`,
      delay_minutes: 95,
      reason: 'Incoming aircraft turnaround delay at Bengaluru (BLR)',
      alternatives: alts.slice(0, 2),
    },
    status: 'open',
  });

  await store.addNotification(params.sessionId ?? null, {
    user_id: bundle.trip.user_id,
    trip_id: bundle.trip.id,
    type: 'disruption_detected',
    title: `Delay alert · ${flightNum} (+95m)`,
    body: `Wayfinder detected a 95-minute delay on ${flightNum} and queued two zero-fee rebooking options.`,
    read_at: null,
  });

  return disruption;
}

export async function runDisruptionsCheckJob(): Promise<{ checked: number }> {
  // Periodic poll hook for live flight trackers
  return { checked: 0 };
}
