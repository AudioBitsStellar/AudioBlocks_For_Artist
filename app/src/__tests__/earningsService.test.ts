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
import { EarningsDataPoint, EarningsResponse } from "@/types";

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

const manyMonths: EarningsDataPoint[] = [
  { month: "Jan", earnings: 1000, royalties: 200 },
  { month: "Feb", earnings: 1200, royalties: 250 },
  { month: "Mar", earnings: 900, royalties: 180 },
];

const singleMonth: EarningsDataPoint[] = [{ month: "Jan", earnings: 500, royalties: 50 }];

const successResponse: EarningsResponse = {
  success: true,
  data: {
    totalEarnings: 3100,
    comparedToLastMonth: 200,
    data: manyMonths,
  },
};

describe("useEarningsServices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useGetEarnings – revenue queries (happy path)", () => {
    it("fetches and returns the earnings summary", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(successResponse);
      expect(mockGet).toHaveBeenCalledWith(EARNINGS_ENDPOINTS.GET_EARNINGS);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("passes enabled:true by default and triggers the request", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.isFetching).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it("skips fetching when enabled is false", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(false), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isLoading || result.current.isFetched).toBe(true));

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("useGetEarnings – royalty calculations / payout history (data shape)", () => {
    it("reflects total earnings and month-over-month comparison", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const summary = result.current.data?.data;
      expect(summary?.totalEarnings).toBe(3100);
      expect(summary?.comparedToLastMonth).toBe(200);
    });

    it("returns per-month earnings and royalties in the payout history", async () => {
      mockGet.mockResolvedValue({ data: successResponse });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const points = result.current.data?.data.data ?? [];
      expect(points).toHaveLength(3);
      expect(points[0]).toEqual({ month: "Jan", earnings: 1000, royalties: 200 });
      expect(
        points.every((p) => typeof p.earnings === "number" && typeof p.royalties === "number")
      ).toBe(true);
    });

    it("handles a single track/month of history", async () => {
      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: { totalEarnings: 500, comparedToLastMonth: 0, data: singleMonth },
        } satisfies EarningsResponse,
      });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const summary = result.current.data?.data;
      expect(summary?.data).toHaveLength(1);
      expect(summary?.totalEarnings).toBe(500);
    });

    it("handles many months/tracks of history", async () => {
      const longHistory: EarningsDataPoint[] = Array.from({ length: 12 }, (_, i) => ({
        month: `M${i + 1}`,
        earnings: 100 * (i + 1),
        royalties: 10 * (i + 1),
      }));

      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: {
            totalEarnings: longHistory.reduce((sum, p) => sum + p.earnings, 0),
            comparedToLastMonth: 50,
            data: longHistory,
          },
        } satisfies EarningsResponse,
      });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data.data).toHaveLength(12);
    });

    it("returns zeroed earnings for an account with no revenue yet", async () => {
      mockGet.mockResolvedValue({
        data: {
          success: true,
          data: { totalEarnings: 0, comparedToLastMonth: 0, data: [] },
        } satisfies EarningsResponse,
      });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const summary = result.current.data?.data;
      expect(summary?.totalEarnings).toBe(0);
      expect(summary?.data).toEqual([]);
    });
  });

  describe("useGetEarnings – error paths", () => {
    it("surfaces a network failure", async () => {
      mockGet.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect((result.current.error as Error).message).toBe("Network error");
    });

    it("surfaces a 401 unauthorized error", async () => {
      mockGet.mockRejectedValue({ status: 401, message: "Unauthorized" });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it("surfaces a 500 server error", async () => {
      mockGet.mockRejectedValue({ status: 500, message: "Server error" });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it("exposes isLoading while in flight and clears it on completion", async () => {
      let resolvePromise!: (v: unknown) => void;
      mockGet.mockImplementation(
        () =>
          new Promise((res) => {
            resolvePromise = res;
          })
      );

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
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

  describe("useGetEarnings – shape", () => {
    it("exposes the expected return shape", () => {
      const services = useEarningsServices();
      expect(services).toHaveProperty("useGetEarnings");
      expect(typeof services.useGetEarnings).toBe("function");
    });
  });
});
