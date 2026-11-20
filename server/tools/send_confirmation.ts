import { store } from '../lib/store';
import { sendTripConfirmationEmail } from '../providers/resend';
import type { ToolDefinition } from './types';

interface SendConfirmationArgs {
  trip_id: string;
}

export const sendConfirmationTool: ToolDefinition<SendConfirmationArgs> = {
  name: 'send_confirmation',
  description:
    'Send trip booking confirmation dossier email to the traveler via Resend.',
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
    const profile = await store.getProfile(ctx.userId);
    const emailRes = await sendTripConfirmationEmail({
      to: profile.email,
      travelerName: profile.full_name,
      trip: bundle.trip,
      bookings: bundle.bookings,
    });

    await store.addNotification(ctx.sessionId, {
      user_id: ctx.userId,
      trip_id: bundle.trip.id,
      type: 'confirmation_sent',
      title: `Dossier sent · ${bundle.trip.title}`,
      body: `Confirmation emailed to ${profile.email} (${emailRes.emailId}).`,
      read_at: null,
    });

    await store.updatePlanStep(
      ctx.sessionId,
      'send_confirmation',
      'done',
      `Delivered (${emailRes.deliveredVia})`,
    );

    return {
      email_id: emailRes.emailId,
      delivered_via: emailRes.deliveredVia,
      recipient: profile.email,
    };
  },
};
