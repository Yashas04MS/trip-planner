import { Router } from 'express';
import { z } from 'zod';
import { store } from '../lib/store';
import { requireUserAuth, type AuthenticatedRequest } from '../middleware/auth';

export const expensesRouter = Router();

expensesRouter.get('/', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;
  const [expenses, trips] = await Promise.all([
    store.listExpensesForUser(userId),
    store.listTripsForUser(userId),
  ]);
  const tripMap = new Map(trips.map((t) => [t.id, t]));
  const totalBudget = trips.reduce((sum, t) => sum + (t.budget || 0), 0);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const reimbursableTotal = expenses
    .filter((e) => e.reimbursable)
    .reduce((sum, e) => sum + e.amount, 0);

  return res.json({
    expenses: expenses.map((e) => ({
      ...e,
      trip_title: e.trip_id ? (tripMap.get(e.trip_id)?.title ?? null) : null,
    })),
    summary: {
      totalSpent,
      totalBudget,
      reimbursableTotal,
      count: expenses.length,
    },
  });
});

const CreateExpenseSchema = z.object({
  merchant: z.string().min(1).max(120),
  description: z.string().max(300).optional().default(''),
  category: z.enum(['flight', 'hotel', 'transport', 'dining', 'experience', 'other']),
  amount: z.number().positive().max(10000000),
  trip_id: z.string().nullable().optional(),
  combined_trip_id: z.string().nullable().optional(),
  payment_method: z.string().max(80).optional().default('Amex Corp •• 4102'),
  reimbursable: z.boolean().optional().default(true),
  spent_at: z.string().optional(),
});

expensesRouter.post('/', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Merchant, category, and positive amount are required' });
  }
  const sessions = await store.listSessionsForUser(req.userId!);
  const expense = await store.addExpense(sessions[0]?.id ?? null, {
    user_id: req.userId!,
    trip_id: parsed.data.trip_id ?? null,
    combined_trip_id: parsed.data.combined_trip_id ?? null,
    booking_id: null,
    category: parsed.data.category,
    merchant: parsed.data.merchant.trim(),
    description: parsed.data.description.trim() || `${parsed.data.merchant} charge`,
    amount: Math.round(parsed.data.amount),
    currency: 'INR',
    payment_method: parsed.data.payment_method,
    reimbursable: parsed.data.reimbursable,
    status: 'logged',
    spent_at: parsed.data.spent_at || new Date().toISOString(),
  });
  return res.status(201).json({ expense });
});

const UpdateExpenseSchema = z.object({
  reimbursable: z.boolean().optional(),
  status: z.enum(['logged', 'authorized', 'reimbursed']).optional(),
  category: z.enum(['flight', 'hotel', 'transport', 'dining', 'experience', 'other']).optional(),
});

expensesRouter.patch('/:id', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = UpdateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid expense update' });
  }
  const updated = await store.updateExpense(req.userId!, String(req.params.id), parsed.data);
  if (!updated) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  return res.json({ expense: updated });
});

expensesRouter.delete('/:id', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const ok = await store.deleteExpense(req.userId!, String(req.params.id));
  if (!ok) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  return res.json({ ok: true });
});

expensesRouter.get('/export.csv', requireUserAuth, async (req: AuthenticatedRequest, res) => {
  const [expenses, trips] = await Promise.all([
    store.listExpensesForUser(req.userId!),
    store.listTripsForUser(req.userId!),
  ]);
  const tripMap = new Map(trips.map((t) => [t.id, t.title]));
  const escapeCsv = (val: string | number | boolean | null | undefined) => {
    const str = String(val ?? '');
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const header = [
    'Date',
    'Merchant',
    'Category',
    'Description',
    'Trip',
    'Amount (INR)',
    'Payment Method',
    'Reimbursable',
    'Status',
  ].join(',');

  const rows = expenses.map((e) =>
    [
      escapeCsv(e.spent_at.slice(0, 10)),
      escapeCsv(e.merchant),
      escapeCsv(e.category),
      escapeCsv(e.description),
      escapeCsv(e.trip_id ? tripMap.get(e.trip_id) || 'Linked Trip' : 'Standalone'),
      escapeCsv(e.amount),
      escapeCsv(e.payment_method),
      escapeCsv(e.reimbursable ? 'Yes' : 'No'),
      escapeCsv(e.status),
    ].join(','),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="wayfinder-expenses.csv"');
  return res.send([header, ...rows].join('\n'));
});
