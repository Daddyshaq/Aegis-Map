import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance } from 'fastify';

import { corsOrigins, env, isProd } from './config/env';
import { authPlugin } from './plugins/auth';
import { errorHandlerPlugin } from './plugins/errorHandler';
import { registerV1Routes } from './routes/v1';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Pretty transport only outside production to avoid a hard dep in prod.
      transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    trustProxy: true,
    bodyLimit: 1_048_576, // 1 MiB JSON bodies; file uploads go through multipart.
  });

  // Sensible defaults (httpErrors, etc.).
  await app.register(sensible);

  // Security headers. CSP is handled by the web app; the API serves JSON only.
  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: false });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      if (corsOrigins.includes('*')) return cb(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');
      const matched = corsOrigins.some(
        (allowed) => allowed.toLowerCase().replace(/\/+$/, '') === cleanOrigin.toLowerCase(),
      );
      if (matched) return cb(null, true);

      // Automatically allow Vercel production & preview deployments (*.vercel.app)
      if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/i.test(cleanOrigin)) {
        return cb(null, true);
      }

      // Automatically allow localhost development
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleanOrigin)) {
        return cb(null, true);
      }

      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-application', 'x-request-id', 'Accept'],
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    allowList: (req) => req.url === '/api/v1/health' || req.url === '/api/v1/ready',
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_BYTES,
      files: 1,
      fields: 10,
    },
  });

  // Auth + centralised error handling.
  await app.register(authPlugin);
  await app.register(errorHandlerPlugin);

  // Versioned API surface.
  await app.register(registerV1Routes, { prefix: '/api/v1' });

  return app;
}
