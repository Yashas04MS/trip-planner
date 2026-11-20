import { store } from '../lib/store';
import { buildMockFlights, buildMockHotels } from '../providers/mock-travel';
import type { ToolDefinition } from './types';

interface ProposeBookingArgs {
  flight_id: string;
  hotel_id: string;
  destination?: string;
  origin?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  adaptations?: string[];
}

export const proposeBookingTool: ToolDefinition<ProposeBookingArgs> = {
  name: 'propose_booking',
  description:
    'Create a human-in-the-loop Approval Card with the selected flight and hotel options, total cost, and planned calendar/email side effects. Never executes a booking.',
  parameters: {
    type: 'object',
    properties: {
      flight_id: { type: 'string' },
      hotel_id: { type: 'string' },
      destination: { type: 'string' },
      origin: { type: 'string' },
      start_date: { type: 'string' },
      end_date: { type: 'string' },
      budget: { type: 'number' },
      adaptations: { type: 'array', items: { type: 'string' } },
    },
    required: ['flight_id', 'hotel_id'],
  },
  async execute(args, ctx) {
    const extras = store.getSessionExtras(ctx.sessionId);
    const dest = args.destination || 'Goa';
    const origin = args.origin || 'BLR';
    const startDate = args.start_date || '2026-11-27';
    const endDate = args.end_date || '2026-11-29';
    const budget = args.budget ?? 40000;

    const flights =
      extras.flightOptions.length > 0
        ? extras.flightOptions
        : buildMockFlights({
            origin,
            destination: dest,
            depart_date: startDate,
            return_date: endDate,
          });
    const hotels =
      extras.hotelOptions.length > 0
        ? extras.hotelOptions
        : buildMockHotels({
            city: dest,
            check_in: startDate,
            check_out: endDate,
          });

    const flight =
      flights.find((f) => f.id === args.flight_id) ??
      flights.find((f) => f.recommended) ??
      flights[0];

    let hotel =
      hotels.find((h) => h.id === args.hotel_id) ??
      hotels.find((h) => h.availability === 'available' && h.recommended) ??
      hotels.find((h) => h.availability === 'available');

    if (!hotel || hotel.availability === 'sold_out') {
      hotel = hotels.find((h) => h.availability === 'available') ?? hotels[1];
    }

    const totalCost = flight.price_inr + hotel.total_price_inr;

    const trip = await store.createOrUpdateTrip(ctx.userId, ctx.sessionId, {
      id: extras.tripId ?? undefined,
      title: `${dest} Weekend Escape`,
      destination: dest,
      origin: flight.origin,
      start_date: startDate,
      end_date: endDate,
      budget,
      total_cost: totalCost,
      status: 'planning',
    });

    const adaptations = args.adaptations ? [...args.adaptations] : [];
    if (hotels[0]?.availability === 'sold_out' && adaptations.length === 0) {
      adaptations.push(
        `${hotels[0].name} was sold out; automatically switched to ${hotel.name}.`,
      );
    }
    if (extras.calendarBlocks.length > 0 && !adaptations.some((a) => a.includes('standup') || a.includes('calendar'))) {
      adaptations.push(
        `Shifted departure to ${flight.flight_number} (${flight.depart_at.slice(11, 16)}) to clear your 16:00 standup.`,
      );
    }

    const sideEffects = [
      `Confirm ${flight.airline} ${flight.flight_number} (${flight.origin} → ${flight.destination})`,
      `Reserve ${hotel.name} (${hotel.nights} nights)`,
      'Add itinerary events to Google Calendar',
      'Send confirmation dossier via Resend',
      'Schedule 24h flight & 3h check-in reminders',
    ];

    const approval = await store.createApproval({
      session_id: ctx.sessionId,
      trip_id: trip.id,
      summary: `${flight.airline} ${flight.flight_number} + ${hotel.name} (${hotel.nights} nights) · ₹${totalCost.toLocaleString('en-IN')}`,
      total_cost: totalCost,
      payload: {
        trip_title: trip.title,
        destination: dest,
        origin: flight.origin,
        start_date: startDate,
        end_date: endDate,
        budget,
        outbound_flight: flight,
        hotel,
        weather: extras.weather ?? undefined,
        adaptations,
        side_effects: sideEffects,
      },
    });

    await store.updatePlanStep(ctx.sessionId, 'get_approval', 'awaiting_approval', approval.summary);
    await store.updatePlanStatus(ctx.sessionId, 'awaiting_approval');

    return {
      kind: 'awaiting_approval',
      approval_id: approval.id,
      trip_id: trip.id,
      total_cost: totalCost,
      within_budget: totalCost <= budget,
      summary: approval.summary,
      side_effects: sideEffects,
    };
  },
};
