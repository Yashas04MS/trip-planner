import { store } from '../lib/store';
import { runToolCall } from '../tools/registry';
import type { ToolContext } from '../tools/types';
import { runFollowupForTrip } from './followup.agent';
import { runSchedulerForTrip } from './scheduler.agent';

export async function proposeTripApproval(params: {
  flightId: string;
  hotelId: string;
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  budget: number;
  adaptations: string[];
  ctx: Omit<ToolContext, 'planStepId'>;
}) {
  const { steps } = await store.getPlanAndSteps(params.ctx.sessionId);
  const stepId = steps.find((s) => s.key === 'get_approval')?.id ?? null;

  return runToolCall(
    'propose_booking',
    {
      flight_id: params.flightId,
      hotel_id: params.hotelId,
      destination: params.destination,
      origin: params.origin,
      start_date: params.startDate,
      end_date: params.endDate,
      budget: params.budget,
      adaptations: params.adaptations,
    },
    { ...params.ctx, planStepId: stepId },
  );
}

export async function executeApprovedBookingPipeline(
  approvalId: string,
  ctx: Omit<ToolContext, 'planStepId'>,
) {
  const { steps } = await store.getPlanAndSteps(ctx.sessionId);
  const bookStepId = steps.find((s) => s.key === 'book')?.id ?? null;
  await store.updatePlanStep(ctx.sessionId, 'book', 'running');

  const bookingRes = await runToolCall(
    'confirm_booking',
    { approval_id: approvalId },
    { ...ctx, planStepId: bookStepId },
  );

  if (!bookingRes.ok) {
    await store.updatePlanStatus(ctx.sessionId, 'failed');
    return { ok: false, error: bookingRes.error, tripId: null, flightRef: null, hotelRef: null };
  }

  const tripId = String(bookingRes.result.trip_id);
  const flightRef = String(bookingRes.result.flight_ref);
  const hotelRef = String(bookingRes.result.hotel_ref);

  await store.updatePlanStep(ctx.sessionId, 'verify_and_summarise', 'running');

  // Run Scheduler (calendar) and Follow-up (email + reminders) in parallel
  await Promise.all([
    runSchedulerForTrip(tripId, ctx),
    runFollowupForTrip(tripId, ctx),
  ]);

  await store.updatePlanStep(
    ctx.sessionId,
    'verify_and_summarise',
    'done',
    `Confirmed refs ${flightRef} & ${hotelRef}; calendar, dossier & reminders active`,
  );
  await store.updatePlanStatus(ctx.sessionId, 'completed');

  return {
    ok: true,
    tripId,
    flightRef,
    hotelRef,
  };
}
