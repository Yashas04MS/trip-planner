import { store } from '../lib/store';
import type { ToolDefinition } from './types';

export const getUserContextTool: ToolDefinition<Record<string, never>> = {
  name: 'get_user_context',
  description:
    'Load the traveler profile, home airport, default budget, currency, hotel star preferences, and calendar connection state.',
  parameters: {
    type: 'object',
    properties: {},
  },
  async execute(_args, ctx) {
    const [profile, preferences, calendarConn] = await Promise.all([
      store.getProfile(ctx.userId),
      store.getPreferences(ctx.userId),
      store.getCalendarConnection(ctx.userId),
    ]);

    return {
      user_id: profile.id,
      full_name: profile.full_name,
      home_city: profile.home_city,
      home_airport: profile.home_airport,
      default_budget: preferences.default_budget,
      currency: preferences.currency,
      cabin: preferences.cabin,
      hotel_stars: preferences.hotel_stars,
      interests: preferences.interests,
      avoid: preferences.avoid,
      calendar_connected: Boolean(calendarConn),
    };
  },
};
