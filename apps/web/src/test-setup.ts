/**
 * Global test setup for Vitest + JSDOM.
 *
 * JSDOM does not implement `window.matchMedia`. This stub provides a no-op
 * implementation so hooks / utilities that rely on it (e.g. checkIsStandalone)
 * don't throw at import-time.  Individual tests can still override via
 * `vi.spyOn(window, 'matchMedia')`.
 */

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},      // deprecated
    removeListener: () => {},   // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
