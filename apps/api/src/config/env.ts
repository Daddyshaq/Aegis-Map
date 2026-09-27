import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Load .env from the API package (CWD) and the repo root. dotenv does not
// override already-set vars, so precedence is: real env > apps/api/.env > root .env.
// Resolve the root path from this module's location with fileURLToPath so it is
// correct regardless of CWD and safe on Windows paths that contain spaces
// (URL.pathname would leave them percent-encoded and unreadable by fs).
loadEnv();
loadEnv({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(() => (process.env.PORT ? Number(process.env.PORT) : 4000)),
  CORS_ORIGIN: z
    .string()
    .default('https://aegis-maps.vercel.app,http://localhost:5173,http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 1024 * 1024),
  // How often the background sweep expires stale reports (minutes). 0 disables it.
  EXPIRY_SWEEP_MINUTES: z.coerce.number().int().min(0).default(15),

  SUPABASE_URL: z
    .string()
    .url()
    .transform((val) => val.trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1\/?$/, '')),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(16),

  GEOCODING_PROVIDER: z.enum(['nominatim', 'maptiler', 'google']).default('nominatim'),
  GEOCODING_BASE_URL: z.string().url().default('https://nominatim.openstreetmap.org'),
  GEOCODING_API_KEY: z.string().optional().default(''),

  ROUTING_PROVIDER: z.enum(['osrm', 'openrouteservice', 'graphhopper']).default('osrm'),
  ROUTING_BASE_URL: z.string().url().default('https://router.project-osrm.org'),
  ROUTING_API_KEY: z.string().optional().default(''),

  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  W3W_API_KEY: z.string().optional().default(''),
  W3W_BASE_URL: z.string().url().default('https://api.what3words.com/v3'),

  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().default('mailto:alerts@aegismap.example'),
});

export type AppEnv = z.infer<typeof envSchema>;

function loadConfig(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // Fail fast with a clear message rather than crashing deep in a handler.
    throw new Error(`Invalid API environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadConfig();

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const isProd = env.NODE_ENV === 'production';
export const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
