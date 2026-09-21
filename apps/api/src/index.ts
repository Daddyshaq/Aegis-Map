import type { FastifyInstance } from 'fastify';

import { buildApp } from './app';
import { env, pushEnabled } from './config/env';
import { supabaseAdmin } from './lib/supabase';
import { configurePush } from './services/push.service';

/**
 * Server entrypoint. Builds the Fastify app, configures Web Push, starts the
 * background expiry sweep, and wires graceful shutdown.
 */

let expirySweep: NodeJS.Timeout | undefined;

/**
 * Periodically transition reports past their TTL to EXPIRED so stale hazards
 * fall off the map without operator intervention. Best-effort: a failed sweep
 * is logged and retried on the next tick rather than crashing the server.
 */
function startExpirySweep(app: FastifyInstance): void {
  if (env.EXPIRY_SWEEP_MINUTES <= 0) {
    app.log.info('Expiry sweep disabled (EXPIRY_SWEEP_MINUTES=0)');
    return;
  }

  const intervalMs = env.EXPIRY_SWEEP_MINUTES * 60_000;

  const runSweep = async (): Promise<void> => {
    try {
      const { data, error } = await supabaseAdmin.rpc('expire_stale_reports');
      if (error) throw error;
      if (typeof data === 'number' && data > 0) {
        app.log.info({ expired: data }, 'Expiry sweep completed');
      }
    } catch (err) {
      app.log.error({ err }, 'Expiry sweep failed');
    }
  };

  expirySweep = setInterval(() => {
    void runSweep();
  }, intervalMs);
  // Do not keep the event loop alive solely for the sweep.
  expirySweep.unref();

  // Kick off one sweep shortly after boot so a restart clears any backlog.
  setTimeout(() => void runSweep(), 5_000).unref();

  app.log.info({ everyMinutes: env.EXPIRY_SWEEP_MINUTES }, 'Expiry sweep scheduled');
}

async function main(): Promise<void> {
  const app = await buildApp();

  // Configure Web Push once at startup (no-op when VAPID keys are absent).
  configurePush();
  if (!pushEnabled) {
    app.log.warn('Web Push disabled: VAPID keys not configured');
  }

  startExpirySweep(app);

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Shutting down');
    if (expirySweep) clearInterval(expirySweep);
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => void shutdown(signal));
  }

  // Surface async faults instead of dying silently.
  process.on('unhandledRejection', (reason) => {
    app.log.error({ err: reason }, 'Unhandled promise rejection');
  });

  try {
    await app.listen({ host: env.API_HOST, port: env.API_PORT });
  } catch (err) {
    app.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

void main();
