import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface MapBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  categoryId?: string;
  minSeverity?: string;
  verifiedOnly?: boolean;
}

/**
 * Loads crisis map features for the given viewport bounds. Disabled until
 * bounds are known so we never fetch the whole world.
 */
export function useMapFeatures(bounds: MapBounds | null) {
  return useQuery({
    queryKey: queryKeys.map(bounds ?? undefined),
    queryFn: () => api.map.features(bounds as MapBounds),
    enabled: !!bounds,
    staleTime: 20_000,
  });
}
