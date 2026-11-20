import { store } from '../lib/store';
import { buildMockHotels } from '../providers/mock-travel';
import type { ToolDefinition } from './types';

interface SearchHotelsArgs {
  city: string;
  check_in: string;
  check_out: string;
  max_per_night?: number;
  stars?: number;
}

export const searchHotelsTool: ToolDefinition<SearchHotelsArgs> = {
  name: 'search_hotels',
  description:
    'Search boutique and luxury hotels in the destination city for the stay dates, returning availability and nightly rates.',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string' },
      check_in: { type: 'string', description: 'YYYY-MM-DD' },
      check_out: { type: 'string', description: 'YYYY-MM-DD' },
      max_per_night: { type: 'number' },
      stars: { type: 'number' },
    },
    required: ['city', 'check_in', 'check_out'],
  },
  async execute(args, ctx) {
    const offers = buildMockHotels({
      city: args.city,
      check_in: args.check_in,
      check_out: args.check_out,
      max_per_night: args.max_per_night,
      stars: args.stars,
      chaosMode: ctx.chaosMode,
    });

    store.setSessionResearchArtifacts(ctx.sessionId, { hotelOptions: offers });
    const soldOutCount = offers.filter((h) => h.availability === 'sold_out').length;
    const available = offers.filter((h) => h.availability === 'available');

    return {
      count: offers.length,
      sold_out_detected: soldOutCount > 0,
      first_choice_sold_out: offers[0]?.availability === 'sold_out',
      top_available: available[0] ?? null,
      offers,
    };
  },
};
