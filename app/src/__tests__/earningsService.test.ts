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

function Wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

const CSV = [
  "ID,SaleEventId,Status,Currency,GrossAmount,CreatedAt",
  "p1,s1,reconciled,stroops,50000000,2026-06-03T10:00:00.000Z",
  "p2,s2,pending,USDC,250,2026-06-01T09:00:00.000Z",
].join("\n");

describe("useEarningsServices – useGetRoyaltyPayouts (#47)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the backend's royalty payout export", async () => {
    mockGet.mockResolvedValue({ data: CSV });
    const { result } = renderHook(() => useEarningsServices().useGetRoyaltyPayouts(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(EARNINGS_ENDPOINTS.ROYALTY_PAYOUTS_EXPORT);
    expect(EARNINGS_ENDPOINTS.ROYALTY_PAYOUTS_EXPORT).toBe("/royalty-payouts/export");
  });

  it("parses the CSV into typed records, converting stroops to XLM", async () => {
    mockGet.mockResolvedValue({ data: CSV });
    const { result } = renderHook(() => useEarningsServices().useGetRoyaltyPayouts(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.records).toHaveLength(2));
    expect(result.current.records[0]).toEqual({
      id: "p1",
      saleEventId: "s1",
      status: "reconciled",
      asset: "XLM",
      amount: 5,
      createdAt: "2026-06-03T10:00:00.000Z",
    });
    expect(result.current.records[1]).toMatchObject({
      asset: "USDC",
      amount: 250,
      status: "pending",
    });
  });

  it("has no records before the response arrives", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEarningsServices().useGetRoyaltyPayouts(), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.records).toEqual([]);
  });

  it("does not fetch when disabled", () => {
    const { result } = renderHook(() => useEarningsServices().useGetRoyaltyPayouts(false), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("surfaces request failures through isError", async () => {
    mockGet.mockRejectedValue(new Error("Network Error"));
    const { result } = renderHook(() => useEarningsServices().useGetRoyaltyPayouts(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.records).toEqual([]);
  });
});

describe("useEarningsServices – useGetPlatformRevenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is still available to PlatformRevenueBreakdown", async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    const { result } = renderHook(() => useEarningsServices().useGetPlatformRevenue(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith(EARNINGS_ENDPOINTS.GET_PLATFORM_REVENUE);
  });
});
