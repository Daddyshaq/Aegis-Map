/**
 * Test environment bootstrap.
 *
 * Runs (via Vitest `setupFiles`) BEFORE any test module — and therefore before
 * `src/config/env.ts` reads `process.env` at import time. We provide the minimum
 * required configuration so the real app can boot end-to-end.
 *
 * These are deliberately fake, non-secret values. The Supabase URL points at an
 * unroutable local port so that if a test ever reaches a real DB call it fails
 * fast (connection refused) instead of hanging — we never assert against a live
 * database here, only against the HTTP/plugin/auth/validation/error pipeline.
 */
process.env.NODE_ENV = 'production'; // disables the pino-pretty transport (no worker thread)
process.env.LOG_LEVEL = 'silent';
process.env.API_HOST = '127.0.0.1';
process.env.API_PORT = '4100'; // unused: tests call buildApp() and never listen()
process.env.RATE_LIMIT_MAX = '1000';
process.env.SUPABASE_URL = 'http://127.0.0.1:9';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-at-least-16-chars-long';
// Leave VAPID unset so pushEnabled is false; push isn't exercised in these tests.
