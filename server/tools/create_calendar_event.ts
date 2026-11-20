import { store } from '../lib/store';
import { insertGoogleCalendarEvent } from '../providers/google-calendar';
import type { ToolDefinition } from './types';

interface CreateCalendarEventArgs {
  trip_id: string;
}

export const createCalendarEventTool: ToolDefinition<CreateCalendarEventArgs> = {
  name: 'create_calendar_event',
  description:
    'Create Google Calendar itinerary events for all confirmed bookings in a trip.',
  parameters: {
    type: 'object',
    properties: {
      trip_id: { type: 'string' },
    },
    required: ['trip_id'],
  },
  async execute(args, ctx) {
    const bundle = await store.getTripBundle(args.trip_id);
    if (!bundle) {
      throw new Error('Trip not found');
    }

    const createdItems = [];
    for (const booking of bundle.bookings) {
      if (booking.type === 'flight') {
        const d = booking.details as Record<string, string>;
        const summary = `Flight ${d.flight_number || ''} · ${d.origin || ''} → ${d.destination || ''}`;
        const cal = await insertGoogleCalendarEvent(ctx.userId, {
          summary,
          location: `${d.origin || ''} Airport`,
          description: `Wayfinder Booking Ref: ${booking.provider_ref}`,
          startIso: d.depart_at || `${bundle.trip.start_date}T18:30:00+05:30`,
          endIso: d.arrive_at || `${bundle.trip.start_date}T19:50:00+05:30`,
        });
        const item = await store.addItineraryItem(ctx.sessionId, {
          trip_id: bundle.trip.id,
          booking_id: booking.id,
          kind: 'flight',
          title: summary,
          location: `${d.origin || 'BLR'} → ${d.destination || 'GOI'}`,
          starts_at: d.depart_at || `${bundle.trip.start_date}T18:30:00+05:30`,
          ends_at: d.arrive_at || `${bundle.trip.start_date}T19:50:00+05:30`,
          calendar_event_id: cal.eventId,
          status: 'scheduled',
        });
        createdItems.push({ ...item, synced_to_google: cal.syncedToGoogle });
      } else {
        const d = booking.details as Record<string, string>;
        const summary = `Stay · ${d.name || 'Hotel'}`;
        const cal = await insertGoogleCalendarEvent(ctx.userId, {
          summary,
          location: d.area || bundle.trip.destination,
          description: `Wayfinder Hotel Ref: ${booking.provider_ref}`,
          startIso: d.check_in || `${bundle.trip.start_date}T20:30:00+05:30`,
          endIso: d.check_out || `${bundle.trip.end_date}T11:00:00+05:30`,
        });
        const item = await store.addItineraryItem(ctx.sessionId, {
          trip_id: bundle.trip.id,
          booking_id: booking.id,
          kind: 'hotel',
          title: summary,
          location: d.area || bundle.trip.destination,
          starts_at: d.check_in || `${bundle.trip.start_date}T20:30:00+05:30`,
          ends_at: d.check_out || `${bundle.trip.end_date}T11:00:00+05:30`,
          calendar_event_id: cal.eventId,
          status: 'scheduled',
        });
        createdItems.push({ ...item, synced_to_google: cal.syncedToGoogle });
      }
    }

    await store.updatePlanStep(
      ctx.sessionId,
      'create_calendar_events',
      'done',
      `${createdItems.length} itinerary event(s) scheduled`,
    );

    return {
      count: createdItems.length,
      events: createdItems,
    };
  },
};
