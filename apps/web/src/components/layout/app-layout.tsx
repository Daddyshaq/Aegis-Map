import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { ErrorBoundary } from '@/components/error-boundary';
import { EmergencyBanner } from '@/components/layout/emergency-banner';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { InstallPromptBanner } from '@/components/pwa/install-prompt-banner';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { RouteFallback } from '@/components/route-fallback';

/** Standard chrome: skip link, header, alert banner, page content, footer. */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <OfflineIndicator />
      <Header />
      <EmergencyBanner />
      <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <InstallPromptBanner />
    </div>
  );
}
