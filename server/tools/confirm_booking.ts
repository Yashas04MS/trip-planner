import { consumeApprovedGate } from '../agents/approval-gate';
import { store } from '../lib/store';
import {
  cancelMockBooking,
  confirmMockFlightBooking,
  confirmMockHotelBooking,
} from '../providers/mock-travel';
import type { ToolDefinition } from './types';

interface ConfirmBookingArgs {
  approval_id: string;
}

export const confirmBookingTool: ToolDefinition<ConfirmBookingArgs> = {
  name: 'confirm_booking',
  description:
    'Execute flight and hotel bookings ONLY after an approval record is approved and unexpired. Single-use and idempotent.',
  parameters: {
    type: 'object',
    properties: {
      approval_id: { type: 'string' },
    },
    required: ['approval_id'],
  },
  async execute(args, ctx) {
    const approval = await consumeApprovedGate(args.approval_id);
    const { outbound_flight: flight, hotel, destination, origin, start_date, end_date, budget } =
      approval.payload;

    const trip = await store.createOrUpdateTrip(ctx.userId, ctx.sessionId, {
      id: approval.trip_id ?? undefined,
      title: approval.payload.trip_title || `${destination} Weekend Escape`,
      destination,
      origin,
      start_date,
      end_date,
      budget,
      total_cost: approval.total_cost,
      status: 'booked',
    });

    let flightRef: { provider: string; provider_ref: string } | null = null;
    try {
      flightRef = await confirmMockFlightBooking(flight);
      const flightBooking = await store.addBooking(ctx.sessionId, {
        trip_id: trip.id,
        approval_id: approval.id,
        type: 'flight',
        provider: flightRef.provider,
        provider_ref: flightRef.provider_ref,
        details: {
          airline: flight.airline,
          flight_number: flight.flight_number,
          origin: flight.origin,
          destination: flight.destination,
          depart_at: flight.depart_at,
          arrive_at: flight.arrive_at,
          return_flight_number: flight.return_flight_number,
          return_depart_at: flight.return_depart_at,
          return_arrive_at: flight.return_arrive_at,
          seat_class: flight.seat_class,
        },
        price: flight.price_inr,
        status: 'confirmed',
        idempotency_key: `${approval.id}:flight`,
      });

      const hotelRef = await confirmMockHotelBooking(hotel);
      const hotelBooking = await store.addBooking(ctx.sessionId, {
        trip_id: trip.id,
        approval_id: approval.id,
        type: 'hotel',
        provider: hotelRef.provider,
        provider_ref: hotelRef.provider_ref,
        details: {
          name: hotel.name,
          area: hotel.area,
          nights: hotel.nights,
          stars: hotel.stars,
          room: 'Courtyard Terrace Suite',
          check_in: `${start_date}T15:00:00+05:30`,
          check_out: `${end_date}T11:00:00+05:30`,
        },
        price: hotel.total_price_inr,
        status: 'confirmed',
        idempotency_key: `${approval.id}:hotel`,
      });

      await store.updatePlanStep(ctx.sessionId, 'get_approval', 'done', `Approved via ${approval.resolved_via ?? 'ui'}`);
      await store.updatePlanStep(
        ctx.sessionId,
        'book',
        'done',
        `Booked ${flightRef.provider_ref} & ${hotelRef.provider_ref}`,
      );

      return {
        trip_id: trip.id,
        approval_id: approval.id,
        bookings: [flightBooking, hotelBooking],
        flight_ref: flightRef.provider_ref,
        hotel_ref: hotelRef.provider_ref,
      };
    } catch (err) {
      // Roll back partial flight booking so user is never half-booked
      if (flightRef) {
        await cancelMockBooking(flightRef.provider_ref);
      }
      await store.updatePlanStep(ctx.sessionId, 'book', 'failed', 'Rolled back partial reservation');
      throw err;
    }
  },
};
