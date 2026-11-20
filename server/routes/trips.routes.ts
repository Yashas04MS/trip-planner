import { Router } from 'express';
import { z } from 'zod';
import { runDisruptionRecovery } from '../agents/followup.agent';
import { store } from '../lib/store';
import { requireUserAuth, type AuthenticatedRequest } from '../middleware/auth';

export const tripsRouter = Router();

tripsRouter.get('/', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const [trips, disruptions, notifications] = await Promise.all([
    store.listTripsForUser(userId),
    store.listDisruptionsForUser(userId),
    store.listNotificationsForUser(userId),
  ]);
  return res.json({ trips, disruptions, notifications });
});

tripsRouter.get('/activity/logs', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const [toolCalls, approvals, sessions, notifications] = await Promise.all([
    store.getAllToolCallsForUser(userId),
    store.getAllApprovalsForUser(userId),
    store.listSessionsForUser(userId),
    store.listNotificationsForUser(userId),
  ]);
  return res.json({ toolCalls, approvals, sessions, notifications });
});

tripsRouter.get('/:id', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const bundle = await store.getTripBundle(String(req.params.id));
  if (!bundle || bundle.trip.user_id !== req.userId) {
    return res.status(404).json({ error: 'Trip not found' });
  }
  return res.json(bundle);
});

const CreateTripSchema = z.object({
  title: z.string().min(2).max(120),
  destination: z.string().min(2).max(80),
  origin: z.string().min(2).max(8).optional().default('BLR'),
  start_date: z.string().min(4),
  end_date: z.string().min(4),
  budget: z.coerce.number().positive(),
  total_cost: z.coerce.number().nonnegative().optional(),
});

tripsRouter.post('/', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateTripSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Valid title, destination, dates, and budget are required' });
  }
  const d = parsed.data;
  const trip = await store.createOrUpdateTrip(req.userId!, null, {
    title: d.title.trim(),
    destination: d.destination.trim(),
    origin: d.origin.trim().toUpperCase(),
    start_date: d.start_date,
    end_date: d.end_date,
    budget: d.budget,
    total_cost: d.total_cost ?? Math.round(d.budget * 0.85),
    status: 'planning',
  });
  return res.status(201).json({ trip });
});

tripsRouter.patch(
  '/:id/reminders/:reminderId',
  requireUserAuth,
  async (req: AuthenticatedRequest, res) => {
    const trip = await store.getTrip(String(req.params.id));
    if (!trip || trip.user_id !== req.userId) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    const done = Boolean(req.body?.done);
    const reminder = await store.toggleReminder(trip.id, String(req.params.reminderId), done);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    return res.json({ reminder });
  },
);

const RescheduleSchema = z.object({
  disruptionId: z.string().min(1),
  flightId: z.string().optional(),
  sessionId: z.string().optional(),
});

tripsRouter.post('/:id/reschedule', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const bundle = await store.getTripBundle(String(req.params.id));
  if (!bundle || bundle.trip.user_id !== req.userId) {
    return res.status(404).json({ error: 'Trip not found' });
  }
  const parsed = RescheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'disruptionId is required' });
  }

  const sessions = await store.listSessionsForUser(req.userId!);
  const sessionId = parsed.data.sessionId || sessions[0]?.id || '';

  const recovery = await runDisruptionRecovery({
    tripId: bundle.trip.id,
    disruptionId: parsed.data.disruptionId,
    flightId: parsed.data.flightId,
    ctx: {
      sessionId,
      userId: req.userId!,
      userEmail: req.userEmail,
      chaosMode: 'off',
    },
  });

  const updatedBundle = await store.getTripBundle(bundle.trip.id);
  return res.json({ recovery: recovery.result, bundle: updatedBundle });
});
