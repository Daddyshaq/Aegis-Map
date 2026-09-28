import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocationPicker } from '../location-picker';

vi.mock('@/components/map/map-view', () => ({
  MapView: ({
    onPickerChange,
  }: {
    onPickerChange?: (pos: { lat: number; lng: number }) => void;
  }) => (
    <div data-testid="mock-map-view">
      <button
        type="button"
        data-testid="simulate-map-drag"
        onClick={() => onPickerChange?.({ lat: 9.1234, lng: 7.5678 })}
      >
        Simulate Pin Move
      </button>
    </div>
  ),
}));

vi.mock('@/hooks/use-geo', () => ({
  useGeoSearch: () => ({ data: [], isFetching: false }),
  useReverseGeocode: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-w3w', () => ({
  useWhat3Words: (lat: number | null | undefined, lng: number | null | undefined) => ({
    data:
      lat && lng
        ? {
            words: '///filled.count.soap',
            lat,
            lng,
            country: 'NG',
            nearestPlace: 'Abuja',
          }
        : null,
    isFetching: false,
  }),
  useWhat3WordsLookup: (words: string, enabled: boolean) => ({
    data:
      enabled && words === 'filled.count.soap'
        ? {
            words: '///filled.count.soap',
            lat: 9.0765,
            lng: 7.3986,
            country: 'NG',
            nearestPlace: 'Abuja Central',
          }
        : null,
    isFetching: false,
  }),
  useWhat3WordsAutosuggest: () => ({
    data: [],
    isFetching: false,
  }),
}));

describe('LocationPicker', () => {
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

  it('renders input for address or 3-word address search', () => {
    const onChange = vi.fn();
    render(<LocationPicker value={{ lat: 9.0765, lng: 7.3986 }} onChange={onChange} />, {
      wrapper,
    });

    const searchInput = screen.getByPlaceholderText(/Search address, place, or \/\/\/what3words/i);
    expect(searchInput).toBeInTheDocument();
    expect(screen.getByTestId('mock-map-view')).toBeInTheDocument();
  });

  it('displays What3Words address for the current location', async () => {
    const onChange = vi.fn();
    render(<LocationPicker value={{ lat: 9.0765, lng: 7.3986 }} onChange={onChange} />, {
      wrapper,
    });

    await waitFor(() => {
      expect(screen.getByText('///filled.count.soap')).toBeInTheDocument();
    });
  });

  it('picks coordinates when pin moves on the map', async () => {
    const onChange = vi.fn();
    render(<LocationPicker value={{ lat: 9.0765, lng: 7.3986 }} onChange={onChange} />, {
      wrapper,
    });

    const moveBtn = screen.getByTestId('simulate-map-drag');
    await userEvent.click(moveBtn);

    expect(onChange).toHaveBeenCalledWith({ lat: 9.1234, lng: 7.5678 });
  });
});
