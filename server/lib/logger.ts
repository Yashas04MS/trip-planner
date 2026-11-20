export interface LogContext {
  sessionId?: string;
  userId?: string;
  agent?: string;
  tool?: string;
  [key: string]: unknown;
}

function formatLog(level: 'info' | 'warn' | 'error', message: string, ctx?: LogContext) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(ctx ?? {}),
  });
}

export const logger = {
  info(message: string, ctx?: LogContext) {
    console.log(formatLog('info', message, ctx));
  },
  warn(message: string, ctx?: LogContext) {
    console.warn(formatLog('warn', message, ctx));
  },
  error(message: string, ctx?: LogContext) {
    console.error(formatLog('error', message, ctx));
  },
};
