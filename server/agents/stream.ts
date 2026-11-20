import type { Response } from 'express';

export function openSseStream(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
}

export function writeOpenAiChunk(res: Response, content: string, id = `chatcmpl-${Date.now()}`): void {
  const payload = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'wayfinder-orchestrator',
    choices: [
      {
        index: 0,
        delta: { content },
        finish_reason: null,
      },
    ],
  };
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function writeSseEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function closeOpenAiStream(res: Response, id = `chatcmpl-${Date.now()}`): void {
  const donePayload = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'wayfinder-orchestrator',
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: 'stop',
      },
    ],
  };
  res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}
