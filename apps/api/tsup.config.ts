import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle the workspace packages (they ship TS source) but keep node_modules
  // external so native/optional deps resolve at runtime.
  noExternal: [/^@crisis\//],
  splitting: false,
  skipNodeModulesBundle: true,
});
