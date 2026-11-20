import type { ExpenseCategory } from '../../shared/types';
import { store } from '../lib/store';
import type { ToolDefinition } from './types';

interface LogExpenseArgs {
  merchant: string;
  amount: number;
  category?: ExpenseCategory;
  description?: string;
  trip_id?: string;
  reimbursable?: boolean;
}

export const logExpenseTool: ToolDefinition<LogExpenseArgs> = {
  name: 'log_expense',
  description:
    'Log a travel expense (dining, transport, flight, hotel, experience) into the executive Expense Tracker USP ledger.',
  parameters: {
    type: 'object',
    properties: {
      merchant: { type: 'string', description: 'Vendor or merchant name' },
      amount: { type: 'number', description: 'Spend amount in INR' },
      category: {
        type: 'string',
        description: 'One of flight, hotel, transport, dining, experience, other',
      },
      description: { type: 'string', description: 'Brief context for the charge' },
      trip_id: { type: 'string', description: 'Optional linked trip ID' },
      reimbursable: { type: 'boolean', description: 'Whether expense is reimbursable' },
    },
    required: ['merchant', 'amount'],
  },
  async execute(args, ctx) {
    const validCategories: ExpenseCategory[] = [
      'flight',
      'hotel',
      'transport',
      'dining',
      'experience',
      'other',
    ];
    const category =
      args.category && validCategories.includes(args.category) ? args.category : 'other';

    const expense = await store.addExpense(ctx.sessionId, {
      user_id: ctx.userId,
      trip_id: args.trip_id ?? null,
      combined_trip_id: null,
      booking_id: null,
      category,
      merchant: args.merchant.trim() || 'Executive Spend',
      description: args.description?.trim() || `${args.merchant} concierge expense`,
      amount: Math.max(1, Math.round(Number(args.amount) || 0)),
      currency: 'INR',
      payment_method: 'Amex Corp •• 4102',
      reimbursable: args.reimbursable ?? true,
      status: 'logged',
      spent_at: new Date().toISOString(),
    });

    return {
      expense_id: expense.id,
      merchant: expense.merchant,
      amount: expense.amount,
      category: expense.category,
      reimbursable: expense.reimbursable,
    };
  },
};
