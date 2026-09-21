import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/** Resolve a path relative to this config file. */
const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // The monorepo keeps a single .env at the repo root (the API reads it too),
  // so point Vite there instead of the default per-app lookup in apps/web.
  envDir: r('../../'),
  plugins: [
    react(),
    VitePWA({
      // Custom service worker (src/sw.ts) so we own push handling + offline UX.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      // We register the SW explicitly from the app for a controlled update flow.
      injectRegister: null,
      manifest: {
        name: 'Aegis Map — Crisis Reporting & Safe Locations',
        short_name: 'Aegis Map',
        description:
          'Report crises, find verified safe locations, and get location-based safety alerts.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['utilities', 'navigation', 'safety', 'weather'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Report Crisis',
            short_name: 'Report',
            description: 'Report an incident or hazard immediately',
            url: '/report',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Safe Locations',
            short_name: 'Shelters',
            description: 'Find shelters, hospitals, and relief points',
            url: '/safe-locations',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Safe Routes',
            short_name: 'Routes',
            description: 'Plan safe routes avoiding reported hazard zones',
            url: '/routing',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Emergency Alerts',
            short_name: 'Alerts',
            description: 'View active crisis alerts in your area',
            url: '/alerts',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        // Keep the SW out of the dev server so it never interferes with HMR.
        enabled: false,
        type: 'module',
      },
    }),
  ],
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
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    sourcemap: true,
    target: 'es2022',
  },
});
