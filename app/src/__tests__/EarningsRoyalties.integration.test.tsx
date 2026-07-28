import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Hoist mocks so vi.mock factory can reference them.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('@/api/axios', () => ({
  createApiClient: vi.fn().mockResolvedValue({ get: mockGet }),
}));

vi.mock('@/utils/jwt', () => ({
  getDisplayNameFromToken: () => 'Test Artist',
}));

import EarningsRoyalties from '@/components/EarningsRoyalties';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeClient()}>
      {children}
    </QueryClientProvider>
  );
}

const MOCK_EARNINGS_RESPONSE = {
  data: {
    success: true,
    data: {
      totalEarnings: 12500,
      comparedToLastMonth: 340,
      data: [
        { month: 'Jan', earnings: 800, royalties: 600 },
        { month: 'Feb', earnings: 950, royalties: 700 },
        { month: 'Mar', earnings: 1100, royalties: 900 },
        { month: 'Apr', earnings: 1300, royalties: 1050 },
        { month: 'May', earnings: 1500, royalties: 1200 },
        { month: 'Jun', earnings: 1800, royalties: 1400 },
      ],
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EarningsRoyalties integration', () => {
  it('renders the loading skeleton while fetching', () => {
    // Never resolve so the component stays in loading state.
    mockGet.mockReturnValue(new Promise(() => {}));

    render(<EarningsRoyalties />, { wrapper: Wrapper });

    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders earnings data after a successful fetch', async () => {
    mockGet.mockResolvedValue(MOCK_EARNINGS_RESPONSE);

    render(<EarningsRoyalties />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/12,500/)).toBeInTheDocument();
    });

    expect(screen.getByText(/more than last month/i)).toBeInTheDocument();
    expect(screen.getByText('Earnings & Royalties')).toBeInTheDocument();
  });

  it('renders an error message when the fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    render(<EarningsRoyalties />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/failed to load earnings/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when the API returns no data points', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: { totalEarnings: 0, comparedToLastMonth: 0, data: [] },
      },
    });

    render(<EarningsRoyalties />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/no earnings data yet/i)).toBeInTheDocument();
    });
  });

  it('shows the date-range selector and print button', async () => {
    mockGet.mockResolvedValue(MOCK_EARNINGS_RESPONSE);

    render(<EarningsRoyalties />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/12,500/)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/print earnings report/i)).toBeInTheDocument();
    expect(screen.getByText(/last 12 months/i)).toBeInTheDocument();
  });
});
