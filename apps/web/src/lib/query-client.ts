import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query configuration. Modest stale time keeps crisis data fresh
 * without hammering the API; Realtime invalidations push urgent changes in
 * sooner than the poll interval would.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
