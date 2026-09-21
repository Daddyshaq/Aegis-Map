import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWhat3Words, useWhat3WordsAutosuggest, useWhat3WordsLookup } from '../use-w3w';

vi.mock('@/lib/api-client', () => ({
  api: {
    w3w: {
      convertTo3wa: vi.fn(async (lat: number, lng: number) => ({
        words: '///filled.count.soap',
        lat,
        lng,
        country: 'NG',
        nearestPlace: 'Abuja',
      })),
      convertToCoordinates: vi.fn(async (words: string) => ({
        words: `///${words}`,
        lat: 9.0765,
        lng: 7.3986,
        country: 'NG',
        nearestPlace: 'Abuja',
      })),
      autosuggest: vi.fn(async (_input: string) => [
        {
          words: '///filled.count.soap',
          nearestPlace: 'Abuja, Federal Capital Territory',
          country: 'NG',
          distanceToFocusKm: 0,
        },
      ]),
    },
  },
}));

describe('useWhat3Words hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useWhat3Words returns 3-word address for coordinates', async () => {
    const { result } = renderHook(() => useWhat3Words(9.0765, 7.3986), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.words).toBe('///filled.count.soap');
  });

  it('useWhat3Words does not query when coordinates are null', () => {
    const { result } = renderHook(() => useWhat3Words(null, null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useWhat3WordsLookup converts words to coordinates', async () => {
    const { result } = renderHook(() => useWhat3WordsLookup('filled.count.soap'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.lat).toBe(9.0765);
    expect(result.current.data?.lng).toBe(7.3986);
  });

  it('useWhat3WordsLookup ignores invalid words format', () => {
    const { result } = renderHook(() => useWhat3WordsLookup('invalid-address'), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('useWhat3WordsAutosuggest suggests addresses for partial input', async () => {
    const { result } = renderHook(() => useWhat3WordsAutosuggest('filled.co'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.words).toBe('///filled.count.soap');
  });
});
