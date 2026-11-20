import { Router } from 'express';
import { runDisruptionsCheckJob } from '../jobs/disruption.job';
import { runRemindersJob } from '../jobs/reminders.job';
import { requireCronSecret } from '../middleware/auth';

export const cronRouter = Router();

cronRouter.post('/reminders', requireCronSecret, async (_req, res) => {
  const out = await runRemindersJob();
  return res.json(out);
});

cronRouter.post('/disruptions', requireCronSecret, async (_req, res) => {
  const out = await runDisruptionsCheckJob();
  return res.json(out);
});
