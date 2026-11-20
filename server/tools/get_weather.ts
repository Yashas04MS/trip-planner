import { store } from '../lib/store';
import { fetchOpenMeteoForecast } from '../providers/open-meteo';
import type { ToolDefinition } from './types';

interface GetWeatherArgs {
  city: string;
  start: string;
  end: string;
}

export const getWeatherTool: ToolDefinition<GetWeatherArgs> = {
  name: 'get_weather',
  description: 'Fetch daily weather forecast for destination city via Open-Meteo.',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string' },
      start: { type: 'string', description: 'YYYY-MM-DD' },
      end: { type: 'string', description: 'YYYY-MM-DD' },
    },
    required: ['city', 'start', 'end'],
  },
  async execute(args, ctx) {
    const forecast = await fetchOpenMeteoForecast(args.city, args.start, args.end);
    store.setSessionResearchArtifacts(ctx.sessionId, { weather: forecast });
    return { ...forecast };
  },
};
