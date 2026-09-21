import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Resolve a path relative to this config file. */
const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// A dedicated Vitest config (not the app's vite.config.ts) so the PWA plugin and
// its service-worker build never run during unit tests. Aliases mirror
// vite.config.ts / tsconfig paths so `@/…` and `@crisis/*` resolve identically.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': r('./src'),
      '@crisis/types': r('../../packages/types/src/index.ts'),
      '@crisis/validation': r('../../packages/validation/src/index.ts'),
      '@crisis/config': r('../../packages/config/src/index.ts'),
      '@crisis/utils': r('../../packages/utils/src/index.ts'),
      '@crisis/ui': r('../../packages/ui/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
