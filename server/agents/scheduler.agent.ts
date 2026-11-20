import { store } from '../lib/store';
import { runToolCall } from '../tools/registry';
import type { ToolContext } from '../tools/types';

export async function runSchedulerForTrip(
  tripId: string,
  ctx: Omit<ToolContext, 'planStepId'>,
) {
  const { steps } = await store.getPlanAndSteps(ctx.sessionId);
  const stepId = steps.find((s) => s.key === 'create_calendar_events')?.id ?? null;
  await store.updatePlanStep(ctx.sessionId, 'create_calendar_events', 'running');
  return runToolCall('create_calendar_event', { trip_id: tripId }, { ...ctx, planStepId: stepId });
}
