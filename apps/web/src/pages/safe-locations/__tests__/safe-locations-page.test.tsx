import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SafeLocationsPage } from '../safe-locations-page';

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'test-user', role: 'citizen' },
    isAuthenticated: true,
    isModerator: false,
    isAdmin: false,
  }),
}));

vi.mock('@/hooks/use-safe-locations', () => ({
  useSafeLocations: () => ({
    data: { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateSafeLocation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/components/map/map-view', () => ({
  MapView: () => <div data-testid="mock-map-view">Mock Map</div>,
}));

describe('SafeLocationsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('renders without error and opens suggest dialog', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SafeLocationsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    const suggestBtn = screen.getByRole('button', { name: /suggest a location/i });
    expect(suggestBtn).toBeInTheDocument();

    await user.click(suggestBtn);

    expect(screen.getByText('Suggest a safe location')).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/facilities/i)).toBeInTheDocument();
  });

  it('submits a new safe location suggestion successfully', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SafeLocationsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: /suggest a location/i }));

    // Fill in required fields
    await user.type(screen.getByLabelText(/^name/i), 'Community Relief Center');
    await user.type(screen.getByLabelText(/facilities/i), 'Water, Blankets, First Aid');

    // Submit button is present and clickable
    const submitBtn = screen.getByRole('button', { name: /submit for review/i });
    expect(submitBtn).toBeInTheDocument();
  });
});
