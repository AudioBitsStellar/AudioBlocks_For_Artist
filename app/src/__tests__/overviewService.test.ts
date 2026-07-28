import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import useOverviewServices from '@/services/overviewService';
import { useGet } from '@/api/queryClient';
import { OVERVIEW_ENDPOINTS } from '@/api/api-endpoint';
import React from 'react';
import { OverviewKpi } from '@/types';

vi.mock('@/api/queryClient', () => ({
  useGet: vi.fn(),
}));

const mockGet = useGet as Mock;

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
);

describe('overviewService', () => {
  const successResponse = {
    success: true,
    data: {
      songsPublished: 10,
      totalEarnings: 2500,
      listenersCount: 15000,
      mostStreamedRegion: 'North America',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGetOverviewKpi – success states', () => {
    it('returns the data successfully when the backend call succeeds', async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
      const data = result.current.data?.data;
      expect(data?.songsPublished).toBe(10);
      expect(data?.totalEarnings).toBe(2500);
      expect(data?.listenersCount).toBe(15000);
      expect(data?.mostStreamedRegion).toBe('North America');
    });

    it('tolerates missing optional fields gracefully', async () => {
      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: {
            songsPublished: 5,
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

  describe('useGetStatistics', () => {
    it('should retrieve aggregated statistics correctly', () => {
      const mockData = {
        data: [
          { label: 'Total Plays', value: 10000 },
          { label: 'Earnings', value: 5000 },
          { label: 'Fans', value: 3000 },
        ],
      };

      (useGet as Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetStatistics());

      expect(useGet).toHaveBeenCalledWith(
        ['get-artist-statistics'],
        OVERVIEW_ENDPOINTS.GET_STATISTICS,
        { enabled: true, staleTime: 300000 }
      );
      expect(result.current.data).toEqual(mockData);
    });

    it('should handle very large datasets gracefully', () => {
      const largeData = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          label: `Metric ${i}`,
          value: i * 100,
        })),
      };

      (useGet as Mock).mockReturnValue({
        data: largeData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetStatistics());

      expect(result.current.data.data.length).toBe(10000);
      expect(result.current.data.data[9999].value).toBe(999900);
    });

    it('should handle API errors when fetching statistics', () => {
      (useGet as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Failed to fetch stats'),
      });

      const { result } = renderHook(() => useOverviewServices().useGetStatistics());

      expect(result.current.isError).toBe(true);
      expect(result.current.error.message).toBe('Failed to fetch stats');
    });
  });

  describe('useGetRecentActivity', () => {
    it('should retrieve recent activity list', () => {
      const mockData = {
        data: [
          { id: '1', action: 'Uploaded Song', timestamp: '2023-01-01T10:00:00Z', details: 'Song A' },
          { id: '2', action: 'New Fan', timestamp: '2023-01-02T12:00:00Z', details: 'User B' },
        ],
      };

      (useGet as Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetRecentActivity());

      expect(useGet).toHaveBeenCalledWith(
        ['get-artist-recent-activity'],
        OVERVIEW_ENDPOINTS.GET_RECENT_ACTIVITY,
        { enabled: true, staleTime: 120000 }
      );
      expect(result.current.data).toEqual(mockData);
    });

    it('should handle empty activity list', () => {
      (useGet as Mock).mockReturnValue({
        data: { data: [] },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetRecentActivity());

      expect(result.current.data.data).toEqual([]);
    });

    it('should handle API failure gracefully', () => {
      (useGet as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
      });

      const { result } = renderHook(() => useOverviewServices().useGetRecentActivity());

      expect(result.current.isError).toBe(true);
      expect(result.current.error.message).toBe('Network error');
    });
  });
});
