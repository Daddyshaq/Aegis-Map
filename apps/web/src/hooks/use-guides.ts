import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

/** Published emergency guides (public). */
export function useGuides() {
  return useQuery({
    queryKey: queryKeys.guides.all,
    queryFn: () => api.guides.list(),
    staleTime: 5 * 60_000,
  });
}

export function useGuide(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.guides.detail(slug ?? ''),
    queryFn: () => api.guides.get(slug as string),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
