import preset from '@crisis/ui/tailwind-preset';
import type { Config } from 'tailwindcss';

/**
 * The design system lives in the shared `@crisis/ui` preset. This config only
 * wires up the content sources (this app + the shared UI package source).
 */
export default {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
} satisfies Config;
