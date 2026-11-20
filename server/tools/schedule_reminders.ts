import { store } from '../lib/store';
import type { ToolDefinition } from './types';

interface ScheduleRemindersArgs {
  trip_id: string;
}

export const scheduleRemindersTool: ToolDefinition<ScheduleRemindersArgs> = {
  name: 'schedule_reminders',
  description:
    'Schedule 24-hour pre-departure and 3-hour hotel check-in reminders for a booked trip.',
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

    const flightBooking = bundle.bookings.find((b) => b.type === 'flight');
    const departIso =
      (flightBooking?.details?.depart_at as string | undefined) ||
      `${bundle.trip.start_date}T18:30:00+05:30`;
    const departMs = Date.parse(departIso);

    const rem1 = await store.addReminder({
      trip_id: bundle.trip.id,
      user_id: ctx.userId,
      remind_at: new Date(departMs - 24 * 60 * 60 * 1000).toISOString(),
      message: `Web check-in open for ${bundle.trip.title} (${flightBooking?.provider_ref ?? 'Flight'})`,
      sent_at: null,
    });

    const rem2 = await store.addReminder({
      trip_id: bundle.trip.id,
      user_id: ctx.userId,
      remind_at: new Date(departMs - 3 * 60 * 60 * 1000).toISOString(),
      message: `Chauffeur dispatch & airport security reminder for ${bundle.trip.destination}`,
      sent_at: null,
    });

    await store.updatePlanStep(
      ctx.sessionId,
      'schedule_reminders',
      'done',
      '24h check-in & 3h dispatch alerts scheduled',
    );

    return {
      count: 2,
      reminders: [rem1, rem2],
    };
  },
};
