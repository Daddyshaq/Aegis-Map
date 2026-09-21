import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@crisis/types': fileURLToPath(new URL('../types/src/index.ts', import.meta.url)),
      '@crisis/config': fileURLToPath(new URL('../config/src/index.ts', import.meta.url)),
    },
  },
});
