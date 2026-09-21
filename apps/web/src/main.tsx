import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

import './index.css';

/**
 * Renders a plain, dependency-free failure screen. Used when the app module
 * fails to load — most commonly because required `VITE_*` environment variables
 * are missing, which `@/lib/env` throws for at import time.
 */
function renderConfigError(root: HTMLElement, error: unknown): void {
  const message =
    error instanceof Error
      ? error.message
      : 'The application could not start due to a configuration error.';
  root.replaceChildren();

  const wrap = document.createElement('div');
  wrap.setAttribute('role', 'alert');
  wrap.style.cssText =
    'min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:1.5rem;font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;';

  const card = document.createElement('div');
  card.style.cssText = 'max-width:32rem;text-align:center;';

  const heading = document.createElement('h1');
  heading.textContent = 'Aegis Map could not start';
  heading.style.cssText = 'font-size:1.25rem;font-weight:600;margin:0 0 0.5rem;';

  const detail = document.createElement('p');
  detail.textContent = message;
  detail.style.cssText = 'font-size:0.875rem;line-height:1.5;color:#cbd5e1;margin:0;';

  card.append(heading, detail);
  wrap.append(card);
  root.append(wrap);
}

async function bootstrap(): Promise<void> {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    // Nothing to render into — surface loudly in the console.
    console.error('Aegis Map: root element #root was not found.');
    return;
  }

  try {
    // Imported dynamically so environment-validation errors (thrown at module
    // load in `@/lib/env`) surface here as a friendly screen rather than a blank
    // page or an uncaught exception.
    const { App } = await import('./App');
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error('Failed to start Aegis Map:', error);
    renderConfigError(rootEl, error);
    return;
  }

  // Register the service worker for offline support and Web Push. In dev this is
  // a no-op shim. `registerType: 'prompt'` means updates are surfaced, not forced.
  const updateSW = registerSW({
    onNeedRefresh() {
      toast('A new version of Aegis Map is available.', {
        action: { label: 'Update', onClick: () => void updateSW(true) },
        duration: Infinity,
      });
    },
    onOfflineReady() {
      toast.success('Aegis Map is ready to work offline.');
    },
  });
}

void bootstrap();
