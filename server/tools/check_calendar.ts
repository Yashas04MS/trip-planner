import { store } from '../lib/store';
import { queryCalendarFreeBusy } from '../providers/google-calendar';
import type { ToolDefinition } from './types';

interface CheckCalendarArgs {
  start: string;
  end: string;
}

export const checkCalendarTool: ToolDefinition<CheckCalendarArgs> = {
  name: 'check_calendar',
  description:
    'Check user calendar availability and busy blocks for the proposed trip window to detect meeting conflicts.',
  parameters: {
    type: 'object',
    properties: {
      start: { type: 'string', description: 'ISO date or datetime start' },
      end: { type: 'string', description: 'ISO date or datetime end' },
    },
    required: ['start', 'end'],
  },
  async execute(args, ctx) {
    if (ctx.chaosMode === 'calendar_error') {
      store.setSessionResearchArtifacts(ctx.sessionId, { calendarBlocks: [] });
      return {
        status: 'calendar_unavailable',
        connected: false,
        busy_blocks: [],
        note: 'Calendar service temporarily unavailable; proceeding without live busy blocks.',
      };
    }

    const startIso = args.start.includes('T') ? args.start : `${args.start}T00:00:00+05:30`;
    const endIso = args.end.includes('T') ? args.end : `${args.end}T23:59:59+05:30`;

    const result = await queryCalendarFreeBusy(
      ctx.userId,
      startIso,
      endIso,
      ctx.latestUserMessage,
    );

    store.setSessionResearchArtifacts(ctx.sessionId, {
      calendarBlocks: result.busy,
    });

    return {
      status: result.connected ? 'ok' : result.busy.length > 0 ? 'conflict_detected' : 'calendar_unavailable',
      connected: result.connected,
      busy_blocks: result.busy,
      note: result.note,
    };
  },
};
