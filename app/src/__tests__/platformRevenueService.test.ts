import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn().mockResolvedValue({
    get: mockGet,
  }),
}));

import useEarningsServices from "@/services/earningsService";
import { EARNINGS_ENDPOINTS } from "@/api/api-endpoint";
import { PlatformRevenue, PlatformRevenueResponse } from "@/types";

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

const platformData: PlatformRevenue[] = [
  { platform: "AudioBlocks", revenue: 5000, percentage: 45.5, streams: 120000 },
  { platform: "Spotify", revenue: 3000, percentage: 27.3, streams: 85000 },
  { platform: "Apple Music", revenue: 2000, percentage: 18.2, streams: 50000 },
  { platform: "YouTube Music", revenue: 1000, percentage: 9.0, streams: 30000 },
];

const successResponse: PlatformRevenueResponse = {
  success: true,
  data: {
    totalRevenue: 11000,
    platforms: platformData,
  },
};

describe("useEarningsServices – useGetPlatformRevenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("happy path", () => {
    it("fetches and returns platform revenue breakdown", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(successResponse);
      expect(mockGet).toHaveBeenCalledWith(EARNINGS_ENDPOINTS.GET_PLATFORM_REVENUE);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("passes enabled:true by default and triggers the request", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.isFetching).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it("skips fetching when enabled is false", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(false), {
        wrapper: Wrapper,
      });

      // With enabled:false the query stays in a disabled state — give it a tick
      // then verify the API was never called.
      await new Promise((r) => setTimeout(r, 50));

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("data shape", () => {
    it("returns totalRevenue and platforms array", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const summary = result.current.data?.data;
      expect(summary?.totalRevenue).toBe(11000);
      expect(summary?.platforms).toHaveLength(4);
    });

    it("each platform has revenue, percentage, and streams", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const platforms = result.current.data?.data.platforms ?? [];
      expect(
        platforms.every(
          (p) =>
            typeof p.platform === "string" &&
            typeof p.revenue === "number" &&
            typeof p.percentage === "number" &&
            typeof p.streams === "number"
        )
      ).toBe(true);
    });

    it("handles a single platform", async () => {
      const singlePlatform: PlatformRevenueResponse = {
        success: true,
        data: {
          totalRevenue: 5000,
          platforms: [{ platform: "AudioBlocks", revenue: 5000, percentage: 100, streams: 120000 }],
        },
      };

      mockGet.mockResolvedValue({ data: singlePlatform });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data.platforms).toHaveLength(1);
      expect(result.current.data?.data.platforms[0].percentage).toBe(100);
    });

    it("handles empty platforms for a new account", async () => {
      const emptyResponse: PlatformRevenueResponse = {
        success: true,
        data: { totalRevenue: 0, platforms: [] },
      };

      mockGet.mockResolvedValue({ data: emptyResponse });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data.totalRevenue).toBe(0);
      expect(result.current.data?.data.platforms).toEqual([]);
    });
  });

  describe("error paths", () => {
    it("surfaces a network failure", async () => {
      mockGet.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect((result.current.error as Error).message).toBe("Network error");
    });

    it("surfaces a 401 unauthorized error", async () => {
      mockGet.mockRejectedValue({ status: 401, message: "Unauthorized" });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it("surfaces a 500 server error", async () => {
      mockGet.mockRejectedValue({ status: 500, message: "Server error" });

      const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe("shape", () => {
    it("exposes useGetPlatformRevenue on the service hook", () => {
      const services = useEarningsServices();
      expect(services).toHaveProperty("useGetPlatformRevenue");
      expect(typeof services.useGetPlatformRevenue).toBe("function");
    });
  });
});
