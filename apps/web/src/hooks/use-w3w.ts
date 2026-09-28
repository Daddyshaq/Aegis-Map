import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

/**
 * Fetch 3-word address (What3Words) for coordinates (e.g. for displaying pin address).
 */
export function useWhat3Words(lat: number | null | undefined, lng: number | null | undefined) {
  const enabled =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);
  return useQuery({
    queryKey: queryKeys.w3w.words(lat ?? 0, lng ?? 0),
    queryFn: () => api.w3w.convertTo3wa(lat as number, lng as number),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Convert 3 words to coordinates.
 */
export function useWhat3WordsLookup(words: string, enabled = true) {
  const trimmed = words.trim().replace(/^\/{3}/, '');
  const isValid = trimmed.split('.').filter(Boolean).length === 3;
  return useQuery({
    queryKey: queryKeys.w3w.coords(trimmed),
    queryFn: () => api.w3w.convertToCoordinates(trimmed),
    enabled: enabled && isValid,
    staleTime: 5 * 60_000,
  });
}

/**
 * Autosuggest 3-word addresses matching partial input.
 */
export function useWhat3WordsAutosuggest(input: string) {
  const trimmed = input.trim();
  const enabled = trimmed.length >= 2;
  return useQuery({
    queryKey: queryKeys.w3w.suggest(trimmed),
    queryFn: () => api.w3w.autosuggest(trimmed),
    enabled,
    staleTime: 60_000,
  });
}
