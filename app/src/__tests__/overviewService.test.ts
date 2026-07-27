import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/api/axios', () => ({
  createApiClient: vi.fn().mockResolvedValue({
    get: mockGet,
  }),
}));

import useOverviewServices from '@/services/overviewService';
import { OVERVIEW_ENDPOINTS } from '@/api/api-endpoint';
import { OverviewKpi, OverviewResponse } from '@/types';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: makeQueryClient() }, children);
}

const baseKpi: OverviewKpi = {
  songsPublished: 12,
  totalEarnings: 4321.5,
  listenersCount: 8900,
  mostStreamedRegion: 'Lagos',
};

const successResponse: OverviewResponse = {
  success: true,
  data: baseKpi,
};

describe('useOverviewServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGetOverviewKpi – happy path', () => {
    it('fetches and returns dashboard KPI data', async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(successResponse);
      expect(mockGet).toHaveBeenCalledWith(OVERVIEW_ENDPOINTS.GET_OVERVIEW);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('calculates and reflects summary statistics from the response', async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // "Summary" = the aggregated numbers on the dashboard cards.
      const aggregated = result.current.data?.data;
      expect(aggregated).toBeDefined();
      expect(aggregated?.songsPublished).toBe(12);
      expect(aggregated?.totalEarnings).toBeCloseTo(4321.5);
      expect(aggregated?.listenersCount).toBe(8900);
      expect(aggregated?.mostStreamedRegion).toBe('Lagos');
    });

    it('returns zeroed metrics for an empty account', async () => {
      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: {
            songsPublished: 0,
            totalEarnings: 0,
            listenersCount: 0,
            mostStreamedRegion: '',
          },
        } satisfies OverviewResponse,
      });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const aggregated = result.current.data?.data;
      expect(aggregated?.songsPublished).toBe(0);
      expect(aggregated?.totalEarnings).toBe(0);
      expect(aggregated?.listenersCount).toBe(0);
      expect(aggregated?.mostStreamedRegion).toBe('');
    });

    it('passes enabled:true by default and triggers the request', async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.isFetching).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('skips fetching when enabled is false', async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(
        () => useOverviewServices().useGetOverviewKpi(false),
        { wrapper: Wrapper },
      );

      // Give React Query a tick to settle.
      await waitFor(() => expect(result.current.isLoading || result.current.isFetched).toBe(true));

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useGetOverviewKpi – partial data', () => {
    it('returns data with only some metrics present (others missing)', async () => {
      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: {
            songsPublished: 5,
            // totalEarnings omitted – backend degraded
            totalEarnings: undefined as unknown as number,
            listenersCount: 0,
            mostStreamedRegion: '—',
          },
        },
      });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const data = result.current.data?.data;
      expect(data?.songsPublished).toBe(5);
      expect(data?.listenersCount).toBe(0);
      expect(data?.mostStreamedRegion).toBe('—');
    });

    it('falls back gracefully when success is false but data is absent', async () => {
      mockGet.mockResolvedValue({
        data: { success: false, data: undefined as unknown as OverviewKpi },
      });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // The hook itself does not throw – consumers can branch on `success`.
      expect(result.current.data?.success).toBe(false);
    });
  });

  describe('useGetOverviewKpi – error states', () => {
    it('surfaces an error when the API call fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect((result.current.error as Error).message).toBe('Network error');
    });

    it('surfaces a 500 server error from the backend', async () => {
      mockGet.mockRejectedValue({ status: 500, message: 'Server error' });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it('exposes isLoading while in flight and clears it on completion', async () => {
      let resolvePromise!: (v: unknown) => void;
      mockGet.mockImplementation(
        () => new Promise((res) => {
          resolvePromise = res;
        }),
      );

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        resolvePromise({ data: successResponse });
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useGetOverviewKpi – shape', () => {
    it('exposes the expected return shape', () => {
      const services = useOverviewServices();
      expect(services).toHaveProperty('useGetOverviewKpi');
      expect(typeof services.useGetOverviewKpi).toBe('function');
    });
  });
});
