import { Router } from 'express';
import { z } from 'zod';
import { resolveApprovalFromUi } from '../agents/approval-gate';
import { executeApprovedBookingPipeline } from '../agents/booking.agent';
import { store } from '../lib/store';
import { requireUserAuth, type AuthenticatedRequest } from '../middleware/auth';

export const approvalsRouter = Router();

const ResolveSchema = z.object({
  decision: z.enum(['approve', 'reject']),
});

approvalsRouter.post('/:id/resolve', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = ResolveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'decision must be approve or reject' });
  }

  try {
    const approval = await resolveApprovalFromUi({
      approvalId: String(req.params.id),
      userId: req.userId!,
      decision: parsed.data.decision,
    });

    const sessionExtras = store.getSessionExtras(approval.session_id);

    if (parsed.data.decision === 'approve') {
      const exec = await executeApprovedBookingPipeline(approval.id, {
        sessionId: approval.session_id,
        userId: req.userId!,
        userEmail: req.userEmail,
        chaosMode: sessionExtras.chaosMode,
      });

      if (exec.ok) {
        await store.addMessage(
          approval.session_id,
          'assistant',
          `Confirmed. Flight reference ${exec.flightRef} and stay reference ${exec.hotelRef} are locked in. Your Google Calendar holds, email dossier, and departure reminders are active.`,
        );
      } else {
        await store.addMessage(
          approval.session_id,
          'assistant',
          `Booking could not be finalized: ${exec.error || 'provider error'}. Any partial hold was rolled back.`,
        );
      }

      const snapshot = await store.getSessionSnapshot(approval.session_id);
      return res.json({ approval, execution: exec, snapshot });
    }

    await store.updatePlanStep(
      approval.session_id,
      'get_approval',
      'adapting',
      'Rejected by traveler — ready for updated preferences',
    );
    await store.addMessage(
      approval.session_id,
      'assistant',
      'Understood, I held off on booking. Tell me what you would like adjusted — such as a quieter area, different flight time, or lower nightly rate.',
    );

    const snapshot = await store.getSessionSnapshot(approval.session_id);
    return res.json({ approval, snapshot });
  } catch (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : 'Unable to resolve approval',
    });
  }
});
