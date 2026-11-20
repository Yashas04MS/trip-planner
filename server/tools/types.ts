import type { ChaosMode } from '../../shared/types';

export interface ToolContext {
  sessionId: string;
  userId: string;
  userEmail?: string;
  latestUserMessage?: string;
  planStepId?: string | null;
  chaosMode: ChaosMode;
}

export interface ToolDefinition<TArgs = Record<string, unknown>, TOut = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: TArgs, ctx: ToolContext) => Promise<TOut>;
}
