import { store } from '../lib/store';
import { buildMockFlights } from '../providers/mock-travel';
import type { ToolDefinition } from './types';

interface RescheduleTripArgs {
  trip_id: string;
  disruption_id: string;
  flight_id?: string;
}

export const rescheduleTripTool: ToolDefinition<RescheduleTripArgs> = {
  name: 'reschedule_trip',
  description:
    'Rebook an impacted flight booking onto a selected recovery flight option and resolve the open disruption.',
  parameters: {
    type: 'object',
    properties: {
      trip_id: { type: 'string' },
      disruption_id: { type: 'string' },
      flight_id: { type: 'string' },
    },
    required: ['trip_id', 'disruption_id'],
  },
  async execute(args, ctx) {
    const bundle = await store.getTripBundle(args.trip_id);
    if (!bundle) {
      throw new Error('Trip not found');
    }
    const disruption = bundle.disruptions.find((d) => d.id === args.disruption_id);
    if (!disruption) {
      throw new Error('Disruption not found');
    }

    const alternatives =
      disruption.detail.alternatives ??
      buildMockFlights({
        origin: bundle.trip.origin,
        destination: bundle.trip.destination,
        depart_date: bundle.trip.start_date,
        return_date: bundle.trip.end_date,
      });

    const chosen =
      alternatives.find((f) => f.id === args.flight_id) ??
      alternatives.find((f) => f.id === 'fl-ix-804') ??
      alternatives[0];

    const flightBooking = bundle.bookings.find((b) => b.type === 'flight');
    if (flightBooking) {
      await store.updateBooking(bundle.trip.id, flightBooking.id, {
        status: 'changed',
        provider_ref: `${flightBooking.provider_ref}-R1`,
        details: {
          ...flightBooking.details,
          airline: chosen.airline,
          flight_number: chosen.flight_number,
          depart_at: chosen.depart_at,
          arrive_at: chosen.arrive_at,
          seat_class: chosen.seat_class,
        },
      });
    }

    await store.createOrUpdateTrip(ctx.userId, ctx.sessionId, {
      ...bundle.trip,
      status: 'changed',
    });

    await store.addItineraryItem(ctx.sessionId, {
      trip_id: bundle.trip.id,
      booking_id: flightBooking?.id ?? null,
      kind: 'flight',
      title: `Rebooked · ${chosen.airline} ${chosen.flight_number} (${chosen.origin} → ${chosen.destination})`,
      location: `${chosen.origin} → ${chosen.destination}`,
      starts_at: chosen.depart_at,
      ends_at: chosen.arrive_at,
      calendar_event_id: `gcal_rebook_${Date.now()}`,
      status: 'scheduled',
    });

    const resolved = await store.resolveDisruption(
      bundle.trip.id,
      disruption.id,
      `Rebooked onto ${chosen.airline} ${chosen.flight_number} (${chosen.depart_at.slice(11, 16)})`,
    );

    await store.addNotification(ctx.sessionId, {
      user_id: ctx.userId,
      trip_id: bundle.trip.id,
      type: 'disruption_resolved',
      title: `Flight rebooked · ${chosen.flight_number}`,
      body: `Updated boarding pass and calendar event for ${bundle.trip.title}.`,
      read_at: null,
    });

    return {
      disruption: resolved,
      new_flight: chosen,
    };
  },
};
