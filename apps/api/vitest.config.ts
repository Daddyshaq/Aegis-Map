import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@crisis/types': fileURLToPath(new URL('../../packages/types/src/index.ts', import.meta.url)),
      '@crisis/config': fileURLToPath(
        new URL('../../packages/config/src/index.ts', import.meta.url),
      ),
      '@crisis/utils': fileURLToPath(new URL('../../packages/utils/src/index.ts', import.meta.url)),
      '@crisis/validation': fileURLToPath(
        new URL('../../packages/validation/src/index.ts', import.meta.url),
      ),
      '@crisis/database': fileURLToPath(
        new URL('../../packages/database/src/index.ts', import.meta.url),
      ),
    },
  },
});
