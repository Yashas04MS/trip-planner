import { Router } from 'express';
import { z } from 'zod';
import { store } from '../lib/store';
import { requireUserAuth, type AuthenticatedRequest } from '../middleware/auth';

export const combinedRouter = Router();

combinedRouter.get('/', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const [combinedTrips, trips] = await Promise.all([
    store.listCombinedTripsForUser(userId),
    store.listTripsForUser(userId),
  ]);
  return res.json({ combinedTrips, availableTrips: trips });
});

const CreateCombinedSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(400).optional().default(''),
  tripIds: z.array(z.string().min(1)).min(2, 'Select at least 2 trips to combine'),
  totalBudget: z.number().positive().optional(),
  transferNote: z.string().max(240).optional(),
});

combinedRouter.post('/', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateCombinedSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message || 'Select at least 2 trips to combine' });
  }
  const sessions = await store.listSessionsForUser(req.userId!);
  const combinedTrip = await store.createCombinedTrip(
    req.userId!,
    {
      title: parsed.data.title,
      description:
        parsed.data.description ||
        'Unified multi-trip circuit with synchronized transfers and consolidated billing.',
      tripIds: parsed.data.tripIds,
      totalBudget: parsed.data.totalBudget,
      defaultTransferNote: parsed.data.transferNote,
    },
    sessions[0]?.id ?? null,
  );
  return res.status(201).json({ combinedTrip });
});

const AddLegSchema = z.object({
  tripId: z.string().min(1),
  transferNote: z.string().max(240).optional().default(''),
});

combinedRouter.post('/:id/legs', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = AddLegSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'tripId is required' });
  }
  const updated = await store.addLegToCombinedTrip(
    req.userId!,
    String(req.params.id),
    parsed.data.tripId,
    parsed.data.transferNote,
  );
  if (!updated) {
    return res.status(404).json({ error: 'Combined trip or target trip not found' });
  }
  return res.json({ combinedTrip: updated });
});

combinedRouter.delete('/:id', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const ok = await store.deleteCombinedTrip(req.userId!, String(req.params.id));
  if (!ok) {
    return res.status(404).json({ error: 'Combined plan not found' });
  }
  return res.json({ ok: true });
});
