import { store } from '../lib/store';
import type { ToolDefinition } from './types';

interface CombineTripsArgs {
  title: string;
  description?: string;
  trip_ids: string[];
  total_budget?: number;
  transfer_note?: string;
}

export const combineTripsTool: ToolDefinition<CombineTripsArgs> = {
  name: 'combine_trips',
  description:
    'Combine multiple trips into a linked multi-trip circuit plan with inter-leg transit notes and unified budget tracking.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Title of the combined multi-trip circuit' },
      description: { type: 'string', description: 'Short summary of the combined route' },
      trip_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ordered trip IDs to combine into legs',
      },
      total_budget: { type: 'number', description: 'Unified INR budget cap for the circuit' },
      transfer_note: { type: 'string', description: 'Connecting transfer or flight instruction' },
    },
    required: ['title', 'trip_ids'],
  },
  async execute(args, ctx) {
    const plan = await store.createCombinedTrip(
      ctx.userId,
      {
        title: args.title,
        description:
          args.description ||
          'Synchronized multi-stop itinerary with unified transfers and consolidated spend.',
        tripIds: args.trip_ids,
        totalBudget: args.total_budget,
        defaultTransferNote: args.transfer_note || 'Private transfer / connecting flight',
      },
      ctx.sessionId,
    );

    return {
      combined_trip_id: plan.id,
      title: plan.title,
      legs_count: plan.legs.length,
      total_cost: plan.total_cost,
      total_budget: plan.total_budget,
    };
  },
};
