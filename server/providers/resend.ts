import { Resend } from 'resend';
import type { BookingRecord, Trip } from '../../shared/types';
import { env } from '../config/env';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendTripConfirmationEmail(params: {
  to: string;
  travelerName: string;
  trip: Trip;
  bookings: BookingRecord[];
}): Promise<{ emailId: string; deliveredVia: 'resend' | 'sandbox_outbox' }> {
  const bookingRows = params.bookings
    .map(
      (b) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #2f3826;">${escapeHtml(b.type.toUpperCase())}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2f3826;">${escapeHtml(b.provider_ref)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #2f3826;">INR ${b.price.toLocaleString('en-IN')}</td>
        </tr>`,
    )
    .join('');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#0e1607;color:#dce6cd;padding:32px;border-radius:16px;">
      <h1 style="font-family:Sora,Arial,sans-serif;color:#bdcd99;margin:0 0 8px;">Wayfinder Concierge Confirmation</h1>
      <p style="color:#c6c8ba;margin:0 0 24px;">Prepared for ${escapeHtml(params.travelerName)} · ${escapeHtml(params.trip.title)}</p>
      <table style="width:100%;border-collapse:collapse;background:#1a2212;border-radius:12px;">
        <thead>
          <tr>
            <th align="left" style="padding:10px 12px;color:#e1c1a5;">Item</th>
            <th align="left" style="padding:10px 12px;color:#e1c1a5;">Reference</th>
            <th align="left" style="padding:10px 12px;color:#e1c1a5;">Total</th>
          </tr>
        </thead>
        <tbody>${bookingRows}</tbody>
      </table>
      <p style="margin-top:24px;color:#bdcd99;font-weight:600;">Total Authorized: INR ${params.trip.total_cost.toLocaleString('en-IN')}</p>
    </div>
  `;

  if (env.hasResend && params.to) {
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: params.to,
        subject: `Wayfinder Itinerary Confirmed · ${params.trip.title}`,
        html,
      });
      return {
        emailId: result.data?.id || `resend_${Date.now()}`,
        deliveredVia: 'resend',
      };
    } catch {
      // fall through to sandbox confirmation id
    }
  }

  return {
    emailId: `wf_mail_${Math.random().toString(36).slice(2, 10)}`,
    deliveredVia: 'sandbox_outbox',
  };
}
