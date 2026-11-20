import { store } from '../lib/store';
import { runToolCall, runToolsParallel } from '../tools/registry';
import type { ToolContext } from '../tools/types';

export async function runFollowupForTrip(
  tripId: string,
  ctx: Omit<ToolContext, 'planStepId'>,
) {
  const { steps } = await store.getPlanAndSteps(ctx.sessionId);
  const emailStepId = steps.find((s) => s.key === 'send_confirmation')?.id ?? null;
  const remStepId = steps.find((s) => s.key === 'schedule_reminders')?.id ?? null;

  await Promise.all([
    store.updatePlanStep(ctx.sessionId, 'send_confirmation', 'running'),
    store.updatePlanStep(ctx.sessionId, 'schedule_reminders', 'running'),
  ]);

  return runToolsParallel(
    [
      { name: 'send_confirmation', args: { trip_id: tripId }, planStepId: emailStepId },
      { name: 'schedule_reminders', args: { trip_id: tripId }, planStepId: remStepId },
    ],
    ctx,
  );
}

export async function runDisruptionRecovery(params: {
  tripId: string;
  disruptionId: string;
  flightId?: string;
  ctx: Omit<ToolContext, 'planStepId'>;
}) {
  return runToolCall(
    'reschedule_trip',
    {
      trip_id: params.tripId,
      disruption_id: params.disruptionId,
      ...(params.flightId ? { flight_id: params.flightId } : {}),
    },
    { ...params.ctx, planStepId: null },
  );
}
