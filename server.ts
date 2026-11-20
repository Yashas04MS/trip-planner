import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './server/config/env';
import { logger } from './server/lib/logger';
import { checkSupabaseTablesReady } from './server/lib/supabase';
import { agoraRouter } from './server/routes/agora.routes';
import { approvalsRouter } from './server/routes/approvals.routes';
import { authRouter } from './server/routes/auth.routes';
import { calendarRouter } from './server/routes/calendar.routes';
import { combinedRouter } from './server/routes/combined.routes';
import { cronRouter } from './server/routes/cron.routes';
import { demoRouter } from './server/routes/demo.routes';
import { expensesRouter } from './server/routes/expenses.routes';
import { llmRouter } from './server/routes/llm.routes';
import { tripsRouter } from './server/routes/trips.routes';
import { voiceRouter } from './server/routes/voice.routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', async (_req, res) => {
    const sbStatus = await checkSupabaseTablesReady();
    res.json({
      ok: true,
      service: 'wayfinder',
      agoraConfigured: env.hasAgora,
      agoraRtcConfigured: env.hasAgoraRtc,
      murfConfigured: env.hasMurf,
      geminiConfigured: env.hasGemini,
      supabaseConfigured: env.hasSupabase,
      supabaseConnected: sbStatus.connected,
      supabaseTablesReady: sbStatus.tablesReady,
      supabaseError: sbStatus.error ?? null,
      googleOAuthConfigured: env.hasGoogleOAuth,
      resendConfigured: env.hasResend,
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/agora', agoraRouter);
  app.use('/api/voice', voiceRouter);
  app.use('/api/llm', llmRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/combined-trips', combinedRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/demo', demoRouter);
  app.use('/api/cron', cronRouter);

  return app;
}

async function startServer() {
  const app = createApp();
  const isProd = env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Wayfinder server listening on port ${env.PORT}`, {
      mode: env.NODE_ENV,
      gemini: env.hasGemini,
      agora: env.hasAgora,
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start Wayfinder server:', err);
  process.exit(1);
});
