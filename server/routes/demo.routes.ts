import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { simulateTripDisruption } from '../jobs/disruption.job';
import { store } from '../lib/store';
import { requireUserAuth, type AuthenticatedRequest } from '../middleware/auth';

export const demoRouter = Router();

demoRouter.use((_req, res, next) => {
  if (env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Demo routes are disabled in production' });
  }
  return next();
});

demoRouter.post('/disruption', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  let tripId = typeof req.body?.tripId === 'string' ? req.body.tripId : '';
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : null;

  if (!tripId) {
    const trips = await store.listTripsForUser(userId);
    const target = trips.find((t) => t.status === 'booked') ?? trips[0];
    if (!target) {
      return res.status(404).json({ error: 'No trip available to simulate disruption' });
    }
    tripId = target.id;
  }

  const trip = await store.getTrip(tripId);
  if (!trip || trip.user_id !== userId) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  const disruption = await simulateTripDisruption({ tripId, sessionId });
  return res.json({ disruption });
});

const ChaosSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.enum(['off', 'hotel_sold_out', 'flight_api_error', 'calendar_error']),
});

demoRouter.post('/chaos', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = ChaosSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid chaos mode payload' });
  }
  const session = await store.getSession(parsed.data.sessionId);
  if (!session || session.user_id !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  store.setSessionResearchArtifacts(session.id, { chaosMode: parsed.data.mode });
  return res.json({ sessionId: session.id, chaosMode: parsed.data.mode });
});
