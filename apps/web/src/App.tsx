import { QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { RouteFallback } from '@/components/route-fallback';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createQueryClient } from '@/lib/query-client';
import { AuthProvider } from '@/providers/auth-provider';
import { RealtimeProvider } from '@/providers/realtime-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { AppRoutes } from '@/router';

/**
 * Application root. Provider order matters:
 *   Theme → Query → Auth → Realtime → Tooltip → Router.
 * Auth and Realtime both depend on the Query client; Realtime invalidates caches
 * on Supabase events; the Toaster reads the resolved theme.
 */
export function App() {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeProvider>
            <TooltipProvider delayDuration={200}>
              <BrowserRouter>
                <Suspense fallback={<RouteFallback />}>
                  <AppRoutes />
                </Suspense>
              </BrowserRouter>
              <Toaster />
            </TooltipProvider>
          </RealtimeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
