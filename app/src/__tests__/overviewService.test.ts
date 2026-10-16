import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { renderHook } from "@testing-library/react";
import useOverviewServices, { OVERVIEW_QUERY_KEY } from "@/services/overviewService";
import { useGet } from "@/api/queryClient";
import { OVERVIEW_ENDPOINTS } from "@/api/api-endpoint";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";

vi.mock("@/api/queryClient", () => ({
  useGet: vi.fn(),
}));

const mockUseGet = useGet as Mock;

describe("overviewService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OVERVIEW_QUERY_KEY", () => {
    it("exports the dashboard query key for overview", () => {
      expect(OVERVIEW_QUERY_KEY).toEqual(DASHBOARD_QUERY_KEYS.overview);
    });
  });

  describe("service structure", () => {
    it("exposes all public query hooks", () => {
      const services = useOverviewServices();
      expect(services).toHaveProperty("useGetOverviewKpi");
      expect(typeof services.useGetOverviewKpi).toBe("function");
      expect(services).toHaveProperty("useGetStatistics");
      expect(typeof services.useGetStatistics).toBe("function");
      expect(services).toHaveProperty("useGetRecentActivity");
      expect(typeof services.useGetRecentActivity).toBe("function");
    });
  });

  describe("useGetOverviewKpi", () => {
    const mockOverviewData = {
      success: true,
      data: {
        songsPublished: 12,
        totalEarnings: 3450,
        listenersCount: 22000,
        mostStreamedRegion: "Europe",
      },
    };

    it("fetches overview KPI with correct endpoint and cache settings", () => {
      mockUseGet.mockReturnValue({
        data: mockOverviewData,
        isLoading: false,
        isError: false,
        isSuccess: true,
      });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi());

      expect(mockUseGet).toHaveBeenCalledWith(
        OVERVIEW_QUERY_KEY,
        OVERVIEW_ENDPOINTS.GET_OVERVIEW,
        {
          enabled: true,
          staleTime: DASHBOARD_CACHE.overview,
        }
      );
      expect(result.current.data).toEqual(mockOverviewData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it("respects enabled flag set to false", () => {
      mockUseGet.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useOverviewServices().useGetOverviewKpi(false));

      expect(mockUseGet).toHaveBeenCalledWith(
        OVERVIEW_QUERY_KEY,
        OVERVIEW_ENDPOINTS.GET_OVERVIEW,
        {
          enabled: false,
          staleTime: DASHBOARD_CACHE.overview,
        }
      );
    });

    it("handles zero / empty data state gracefully", () => {
      const zeroData = {
        success: true,
        data: {
          songsPublished: 0,
          totalEarnings: 0,
          listenersCount: 0,
          mostStreamedRegion: "N/A",
        },
      };

      mockUseGet.mockReturnValue({
        data: zeroData,
        isLoading: false,
        isError: false,
        isSuccess: true,
      });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi());

      expect(result.current.data?.data.songsPublished).toBe(0);
      expect(result.current.data?.data.totalEarnings).toBe(0);
      expect(result.current.data?.data.listenersCount).toBe(0);
    });

    it("handles very large KPI datasets", () => {
      const largeData = {
        success: true,
        data: {
          songsPublished: 999999,
          totalEarnings: 1000000000,
          listenersCount: 50000000,
          mostStreamedRegion: "Global",
        },
      };

      mockUseGet.mockReturnValue({
        data: largeData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi());

      expect(result.current.data?.data.totalEarnings).toBe(1000000000);
      expect(result.current.data?.data.listenersCount).toBe(50000000);
    });

    it("handles API errors gracefully", () => {
      const error = new Error("Failed to fetch dashboard overview");
      mockUseGet.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error,
      });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(error);
    });

    it("handles in-flight loading state", () => {
      mockUseGet.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetOverviewKpi());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useGetStatistics", () => {
    const mockStatsData = {
      success: true,
      data: [
        { label: "Total Plays", value: 15000 },
        { label: "Earnings", value: 4200 },
        { label: "Fans", value: 3100 },
      ],
    };

    it("fetches aggregated statistics (total plays, earnings, fans) with correct endpoint and cache", () => {
      mockUseGet.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        isError: false,
        isSuccess: true,
      });

      const { result } = renderHook(() => useOverviewServices().useGetStatistics());

      expect(mockUseGet).toHaveBeenCalledWith(
        DASHBOARD_QUERY_KEYS.statistics,
        OVERVIEW_ENDPOINTS.GET_STATISTICS,
        {
          enabled: true,
          staleTime: DASHBOARD_CACHE.statistics,
        }
      );
      expect(result.current.data).toEqual(mockStatsData);
      expect(result.current.data?.data).toHaveLength(3);
    });

    it("respects enabled flag set to false", () => {
      mockUseGet.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useOverviewServices().useGetStatistics(false));

      expect(mockUseGet).toHaveBeenCalledWith(
        DASHBOARD_QUERY_KEYS.statistics,
        OVERVIEW_ENDPOINTS.GET_STATISTICS,
        {
          enabled: false,
          staleTime: DASHBOARD_CACHE.statistics,
        }
      );
    });

    it("handles zero data edge case gracefully", () => {
      const emptyStats = {
        success: true,
        data: [],
      };

      mockUseGet.mockReturnValue({
        data: emptyStats,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetStatistics());

      expect(result.current.data?.data).toHaveLength(0);
    });

    it("handles very large datasets gracefully", () => {
      const largeStats = {
        success: true,
        data: Array.from({ length: 10000 }, (_, i) => ({
          label: `Metric ${i}`,
          value: i * 250,
        })),
      };

      mockUseGet.mockReturnValue({
        data: largeStats,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetStatistics());

      expect(result.current.data?.data).toHaveLength(10000);
      expect(result.current.data?.data[9999].value).toBe(9999 * 250);
    });

    it("handles API failure when fetching statistics", () => {
      const error = new Error("Internal Server Error");
      mockUseGet.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error,
      });

      const { result } = renderHook(() => useOverviewServices().useGetStatistics());

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe("Internal Server Error");
    });
  });

  describe("useGetRecentActivity", () => {
    const mockActivityData = {
      success: true,
      data: [
        {
          id: "act-1",
          action: "Song Uploaded",
          timestamp: "2026-03-01T12:00:00Z",
          details: "Midnight Melody",
        },
        {
          id: "act-2",
          action: "Royalty Received",
          timestamp: "2026-03-01T14:30:00Z",
          details: "$120.00 from Streaming",
        },
      ],
    };

    it("fetches recent activity list with correct query key and cache policy", () => {
      mockUseGet.mockReturnValue({
        data: mockActivityData,
        isLoading: false,
        isError: false,
        isSuccess: true,
      });

      const { result } = renderHook(() => useOverviewServices().useGetRecentActivity());

      expect(mockUseGet).toHaveBeenCalledWith(
        DASHBOARD_QUERY_KEYS.recentActivity,
        OVERVIEW_ENDPOINTS.GET_RECENT_ACTIVITY,
        {
          enabled: true,
          staleTime: DASHBOARD_CACHE.recentActivity,
        }
      );
      expect(result.current.data).toEqual(mockActivityData);
      expect(result.current.data?.data).toHaveLength(2);
    });

    it("respects enabled flag set to false", () => {
      mockUseGet.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useOverviewServices().useGetRecentActivity(false));

      expect(mockUseGet).toHaveBeenCalledWith(
        DASHBOARD_QUERY_KEYS.recentActivity,
        OVERVIEW_ENDPOINTS.GET_RECENT_ACTIVITY,
        {
          enabled: false,
          staleTime: DASHBOARD_CACHE.recentActivity,
        }
      );
    });

    it("handles empty activity list gracefully (zero data)", () => {
      mockUseGet.mockReturnValue({
        data: { success: true, data: [] },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetRecentActivity());

      expect(result.current.data?.data).toEqual([]);
    });

    it("handles very large activity datasets", () => {
      const largeActivities = {
        success: true,
        data: Array.from({ length: 5000 }, (_, i) => ({
          id: `act-${i}`,
          action: `Event ${i}`,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          details: `Detail ${i}`,
        })),
      };

      mockUseGet.mockReturnValue({
        data: largeActivities,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useOverviewServices().useGetRecentActivity());

      expect(result.current.data?.data).toHaveLength(5000);
      expect(result.current.data?.data[0].id).toBe("act-0");
    });

    it("handles API error when fetching recent activity", () => {
      const error = new Error("Network timeout");
      mockUseGet.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error,
      });

      const { result } = renderHook(() => useOverviewServices().useGetRecentActivity());

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe("Network timeout");
    });
  });
});
