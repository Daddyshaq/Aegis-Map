import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * The suite is a BACKEND-FREE smoke test: it boots the SPA against the Vite dev
 * server (started below) with public placeholder configuration and verifies the
 * app shell, routing, the not-found page, and the sign-in form render and
 * behave. Full-stack journeys (reporting, moderation, alerts) require a running
 * API + Supabase and belong in a separate, environment-provisioned suite.
 */
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  // The Vite dev server compiles each route on first hit, so first paint can be
  // slow under parallel load (especially on cold CI runners). Give assertions
  // and navigation generous headroom.
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    // Bind IPv4 explicitly: on some hosts `localhost` resolves to ::1 only,
    // which the IPv4 readiness probe (BASE_URL) can't reach.
    command: `pnpm exec vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Public, build-safe placeholders so the app boots without a real backend.
    // env.ts requires these three; the app degrades to an anonymous session.
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? 'e2e-placeholder-anon-key',
      VITE_API_URL: process.env.VITE_API_URL ?? 'http://127.0.0.1:4000',
    },
  },
});
