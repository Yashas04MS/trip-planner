import { env } from '../config/env';
import { store } from '../lib/store';
import { searchDuffelFlights } from '../providers/duffel';
import { buildMockFlights } from '../providers/mock-travel';
import type { ToolDefinition } from './types';

interface SearchFlightsArgs {
  origin: string;
  dest: string;
  depart_date: string;
  return_date: string;
  max_price?: number;
}

export const searchFlightsTool: ToolDefinition<SearchFlightsArgs> = {
  name: 'search_flights',
  description:
    'Search round-trip flight offers between origin and destination airports within optional budget.',
  parameters: {
    type: 'object',
    properties: {
      origin: { type: 'string', description: 'Origin airport IATA code e.g. BLR' },
      dest: { type: 'string', description: 'Destination airport or city e.g. GOI' },
      depart_date: { type: 'string', description: 'Departure date YYYY-MM-DD' },
      return_date: { type: 'string', description: 'Return date YYYY-MM-DD' },
      max_price: { type: 'number', description: 'Maximum round-trip price in INR' },
    },
    required: ['origin', 'dest', 'depart_date', 'return_date'],
  },
  async execute(args, ctx) {
    let offers;
    if (!env.USE_MOCK_TRAVEL && env.DUFFEL_ACCESS_TOKEN && ctx.chaosMode !== 'flight_api_error') {
      offers = await searchDuffelFlights({
        origin: args.origin,
        destination: args.dest,
        depart_date: args.depart_date,
        return_date: args.return_date,
        max_price: args.max_price,
      });
    } else {
      // Simulate retry-and-fallback resilience on chaosMode
      try {
        offers = buildMockFlights({
          origin: args.origin,
          destination: args.dest,
          depart_date: args.depart_date,
          return_date: args.return_date,
          max_price: args.max_price,
          chaosMode: ctx.chaosMode,
          attempt: 1,
        });
      } catch {
        // Retry once cleanly with fallback mock catalogue
        offers = buildMockFlights({
          origin: args.origin,
          destination: args.dest,
          depart_date: args.depart_date,
          return_date: args.return_date,
          max_price: args.max_price,
          chaosMode: 'off',
          attempt: 2,
        });
      }
    }

    store.setSessionResearchArtifacts(ctx.sessionId, { flightOptions: offers });

    return {
      count: offers.length,
      offers,
      recovered_from_error: ctx.chaosMode === 'flight_api_error',
    };
  },
};
