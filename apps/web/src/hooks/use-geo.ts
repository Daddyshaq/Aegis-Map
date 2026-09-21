import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

/**
 * Forward geocoding search. Callers should debounce `query`; the request is
 * disabled for very short strings to avoid noisy upstream calls.
 */
export function useGeoSearch(query: string, limit = 5) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.geo(trimmed),
    queryFn: () => api.geo.search(trimmed, limit),
    enabled: trimmed.length >= 3,
    staleTime: 60_000,
  });
}

/** Reverse geocoding is used imperatively (e.g. after a map pin drop). */
export function useReverseGeocode() {
  return useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => api.geo.reverse(lat, lng),
  });
}
