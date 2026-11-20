import { Type, type FunctionDeclaration } from '@google/genai';
import { RetryableError } from '../lib/errors';
import { logger } from '../lib/logger';
import { store } from '../lib/store';
import { checkCalendarTool } from './check_calendar';
import { combineTripsTool } from './combine_trips';
import { confirmBookingTool } from './confirm_booking';
import { createCalendarEventTool } from './create_calendar_event';
import { getUserContextTool } from './get_user_context';
import { getWeatherTool } from './get_weather';
import { logExpenseTool } from './log_expense';
import { proposeBookingTool } from './propose_booking';
import { rescheduleTripTool } from './reschedule_trip';
import { scheduleRemindersTool } from './schedule_reminders';
import { searchFlightsTool } from './search_flights';
import { searchHotelsTool } from './search_hotels';
import { sendConfirmationTool } from './send_confirmation';
import type { ToolContext, ToolDefinition } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_TOOLS: ToolDefinition<any, any>[] = [
  getUserContextTool,
  checkCalendarTool,
  searchFlightsTool,
  searchHotelsTool,
  getWeatherTool,
  proposeBookingTool,
  confirmBookingTool,
  createCalendarEventTool,
  sendConfirmationTool,
  scheduleRemindersTool,
  rescheduleTripTool,
  logExpenseTool,
  combineTripsTool,
];

const TOOL_MAP = new Map(ALL_TOOLS.map((t) => [t.name, t]));

function mapJsonSchemaType(t: string): Type {
  switch (t) {
    case 'number':
    case 'integer':
      return Type.NUMBER;
    case 'boolean':
      return Type.BOOLEAN;
    case 'array':
      return Type.ARRAY;
    case 'object':
      return Type.OBJECT;
    default:
      return Type.STRING;
  }
}

export function getGeminiFunctionDeclarations(): FunctionDeclaration[] {
  return ALL_TOOLS.map((tool) => {
    const props: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(tool.parameters.properties)) {
      const schema = v as { type?: string; description?: string; items?: { type?: string } };
      props[k] = {
        type: mapJsonSchemaType(schema.type || 'string'),
        ...(schema.description ? { description: schema.description } : {}),
        ...(schema.items
          ? { items: { type: mapJsonSchemaType(schema.items.type || 'string') } }
          : {}),
      };
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: Type.OBJECT,
        properties: props,
        ...(tool.parameters.required ? { required: tool.parameters.required } : {}),
      },
    } as FunctionDeclaration;
  });
}

export async function runToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<{
  ok: boolean;
  tool: string;
  result: Record<string, unknown>;
  error?: string;
}> {
  const tool = TOOL_MAP.get(name);
  if (!tool) {
    return {
      ok: false,
      tool: name,
      result: { error: `Unknown tool ${name}` },
      error: `Unknown tool ${name}`,
    };
  }

  const logEntry = await store.logToolCallStart(
    ctx.sessionId,
    name,
    args,
    ctx.planStepId ?? null,
  );
  const startMs = Date.now();

  try {
    let output: Record<string, unknown>;
    try {
      output = await tool.execute(args, ctx);
    } catch (err) {
      if (err instanceof RetryableError) {
        await new Promise((r) => setTimeout(r, 150));
        output = await tool.execute(args, ctx);
      } else {
        throw err;
      }
    }

    const latencyMs = Date.now() - startMs;
    await store.logToolCallFinish(ctx.sessionId, logEntry.id, 'ok', latencyMs, output, null);
    logger.info('Tool executed', { sessionId: ctx.sessionId, tool: name, latencyMs });
    return { ok: true, tool: name, result: output };
  } catch (err) {
    const latencyMs = Date.now() - startMs;
    const message = err instanceof Error ? err.message : 'Tool execution failed';
    await store.logToolCallFinish(
      ctx.sessionId,
      logEntry.id,
      'error',
      latencyMs,
      { error: message },
      message,
    );
    logger.warn('Tool failed', { sessionId: ctx.sessionId, tool: name, error: message });
    return { ok: false, tool: name, result: { error: message }, error: message };
  }
}

export async function runToolsParallel(
  calls: Array<{ name: string; args: Record<string, unknown>; planStepId?: string | null }>,
  baseCtx: Omit<ToolContext, 'planStepId'>,
) {
  return Promise.allSettled(
    calls.map((c) =>
      runToolCall(c.name, c.args, {
        ...baseCtx,
        planStepId: c.planStepId ?? null,
      }),
    ),
  );
}
