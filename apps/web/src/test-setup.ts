import '@testing-library/jest-dom/vitest';

Object.assign(import.meta.env, {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key',
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:4400',
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
