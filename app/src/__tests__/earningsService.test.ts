import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

// All HTTP access is mocked: no test in this file reaches the backend.
vi.mock("@/api/axios", () => {
  const client = { get: mockGet };
  return { apiClient: client, createApiClient: () => client };
});

import useEarningsServices, {
  type RoyaltyPayout,
  type RoyaltyPayoutsResponse,
} from "@/services/earningsService";

const ENDPOINT = "/api/royalty-payouts";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return Wrapper;
}

const payout = (overrides: Partial<RoyaltyPayout> = {}): RoyaltyPayout => ({
  id: "payout-1",
  amount: 120,
  asset: "XLM",
  transactionHash: "tx-1",
  status: "paid",
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const response = (data: RoyaltyPayout[], extra: Partial<RoyaltyPayoutsResponse> = {}) => ({
  data,
  total: data.length,
  page: 1,
  limit: 100,
  ...extra,
});

describe("earningsService", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  describe("revenue fetching", () => {
    it("returns royalty payouts from a successful API response", async () => {
      const body = response([payout()]);
      mockGet.mockResolvedValue({ data: body });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(body);
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet.mock.calls[0][0]).toBe(ENDPOINT);
      // React Query's abort signal is forwarded to Axios.
      expect(mockGet.mock.calls[0][1]).toEqual({ signal: expect.anything() });
    });

    it("handles an empty revenue response without inventing data", async () => {
      mockGet.mockResolvedValue({ data: response([]) });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toEqual([]);
      expect(result.current.data?.total).toBe(0);
    });

    it("surfaces a failed revenue request as a query error", async () => {
      mockGet.mockRejectedValue(new Error("API unavailable"));

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect((result.current.error as Error).message).toBe("API unavailable");
      expect(result.current.data).toBeUndefined();
    });

    it("builds date-range query parameters for filtered revenue", async () => {
      mockGet.mockResolvedValue({ data: response([]) });

      const { result } = renderHook(
        () =>
          useEarningsServices().useGetEarnings(true, {
            startDate: "2026-01-01",
            endDate: "2026-01-31",
          }),
        { wrapper: makeWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGet.mock.calls[0][0]).toBe(
        `${ENDPOINT}?startDate=2026-01-01&endDate=2026-01-31`
      );
    });

    it("does not fetch revenue when the query is disabled", async () => {
      mockGet.mockResolvedValue({ data: response([payout()]) });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(false), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("royalty calculations", () => {
    // The service deliberately returns per-asset payout records rather than a
    // summed number, so royalties in different assets are never added together.
    const totalForAsset = (records: RoyaltyPayout[], asset: string) =>
      records.filter((record) => record.asset === asset).reduce((sum, record) => sum + record.amount, 0);

    it("preserves the royalty amount for a single track", async () => {
      const single = payout({ id: "track-1", amount: 42.5, asset: "XLM" });
      mockGet.mockResolvedValue({ data: response([single]) });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toEqual([single]);
      expect(totalForAsset(result.current.data?.data ?? [], "XLM")).toBe(42.5);
    });

    it("keeps multiple tracks and multiple assets separate", async () => {
      const records = [
        payout({ id: "track-1", amount: 10, asset: "XLM" }),
        payout({ id: "track-2", amount: 20, asset: "XLM" }),
        payout({ id: "track-3", amount: 7, asset: "USDC" }),
      ];
      mockGet.mockResolvedValue({ data: response(records) });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(3);
      expect(totalForAsset(result.current.data?.data ?? [], "XLM")).toBe(30);
      expect(totalForAsset(result.current.data?.data ?? [], "USDC")).toBe(7);
    });

    it("handles zero earnings", async () => {
      const zero = payout({ amount: 0, transactionHash: null });
      mockGet.mockResolvedValue({ data: response([zero]) });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data?.[0].amount).toBe(0);
      expect(totalForAsset(result.current.data?.data ?? [], "XLM")).toBe(0);
    });

    it("handles empty or missing payout data", async () => {
      mockGet.mockResolvedValue({ data: response([]) });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data ?? []).toEqual([]);
      expect(totalForAsset([], "XLM")).toBe(0);
    });

    it("preserves royalty split records for the same payout", async () => {
      const splitA = payout({ id: "split-a", amount: 60, transactionHash: "shared-tx" });
      const splitB = payout({ id: "split-b", amount: 40, transactionHash: "shared-tx" });
      mockGet.mockResolvedValue({ data: response([splitA, splitB], { total: 2 }) });

      const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toEqual([splitA, splitB]);
      expect(totalForAsset(result.current.data?.data ?? [], "XLM")).toBe(100);
      expect(result.current.data?.data?.every((record) => record.transactionHash === "shared-tx")).toBe(
        true
      );
    });
  });

  describe("payout history", () => {
    it("retrieves payout records successfully", async () => {
      const records = [payout({ id: "history-1", status: "completed" })];
      mockGet.mockResolvedValue({ data: response(records, { page: 2, limit: 25 }) });

      const { result } = renderHook(() => useEarningsServices().useGetPayoutHistory(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toEqual(records);
      expect(result.current.data?.page).toBe(2);
      expect(result.current.data?.limit).toBe(25);
      expect(mockGet.mock.calls[0][0]).toBe(ENDPOINT);
    });

    it("handles an empty payout history", async () => {
      mockGet.mockResolvedValue({ data: response([]) });

      const { result } = renderHook(() => useEarningsServices().useGetPayoutHistory(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toEqual([]);
      expect(result.current.data?.total).toBe(0);
    });

    it("filters payout history by date range", async () => {
      mockGet.mockResolvedValue({ data: response([]) });

      const { result } = renderHook(
        () =>
          useEarningsServices().useGetPayoutHistory(true, { startDate: "2026-02-01" }),
        { wrapper: makeWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGet.mock.calls[0][0]).toBe(`${ENDPOINT}?startDate=2026-02-01`);
    });

    it("surfaces a failed payout history request", async () => {
      mockGet.mockRejectedValue(new Error("History unavailable"));

      const { result } = renderHook(() => useEarningsServices().useGetPayoutHistory(), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect((result.current.error as Error).message).toBe("History unavailable");
    });
  });

  describe("error handling", () => {
    const scenarios = [
      { name: "network failure", error: new TypeError("Network Error"), status: undefined },
      {
        name: "HTTP 401",
        error: Object.assign(new Error("Unauthorized"), { status: 401 }),
        status: 401,
      },
      {
        name: "HTTP 500",
        error: Object.assign(new Error("Server error"), { status: 500 }),
        status: 500,
      },
    ];

    for (const scenario of scenarios) {
      it(`propagates a ${scenario.name} to the query`, async () => {
        mockGet.mockRejectedValue(scenario.error);

        const { result } = renderHook(() => useEarningsServices().useGetEarnings(), {
          wrapper: makeWrapper(),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.error).toBe(scenario.error);
        expect((result.current.error as Error).message).toBe(scenario.error.message);
        if (scenario.status !== undefined) {
          expect((result.current.error as { status?: number }).status).toBe(scenario.status);
        }
      });
    }

    it("exposes the service API for both revenue and payout history", () => {
      const services = useEarningsServices();
      expect(Object.keys(services).sort()).toEqual(["useGetEarnings", "useGetPayoutHistory"]);
      expect(typeof services.useGetEarnings).toBe("function");
      expect(typeof services.useGetPayoutHistory).toBe("function");
    });
  });
});
