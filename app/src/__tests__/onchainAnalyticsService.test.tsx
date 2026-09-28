/**
 * React Query wiring for the on-chain analytics panel (#467): when it may
 * fetch, what it asks for, and how it reports that an indexer trails the chain.
 */

import { renderHook } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import {
  fetchArtistOnchainStats,
  isSubgraphConfigured,
  type ArtistOnchainStats,
} from "@/lib/subgraph";
import useOnchainAnalyticsService, {
  INDEXER_STALE_AFTER_MS,
  indexerLagMinutes,
  isIndexerStale,
} from "@/services/onchainAnalyticsService";

vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn() }));
vi.mock("@/lib/subgraph", () => ({
  fetchArtistOnchainStats: vi.fn(),
  isSubgraphConfigured: vi.fn(),
}));

const mockUseQuery = useQuery as Mock;
const mockFetchStats = fetchArtistOnchainStats as Mock;
const mockIsConfigured = isSubgraphConfigured as Mock;

const ARTIST = "GAZR3A7XTESTARTISTADDRESSABCDEFGHIJKLMNOPQRSTUVWXY";

/** The subset of React Query's options this service is responsible for. */
interface QueryOptions {
  queryKey: readonly unknown[];
  queryFn: () => Promise<ArtistOnchainStats>;
  enabled: boolean;
  staleTime: number;
  retry: boolean | number;
}

function statsOver(overrides: Partial<ArtistOnchainStats>): ArtistOnchainStats {
  return {
    daily: [],
    totalPlays: 0,
    totalSales: 0,
    totalAmount: 0,
    indexedBlock: null,
    indexedAt: null,
    ...overrides,
  };
}

function options(): QueryOptions {
  return mockUseQuery.mock.calls[0][0] as QueryOptions;
}

describe("onchainAnalyticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(true);
    mockUseQuery.mockImplementation((input: QueryOptions) => ({
      data: undefined,
      isLoading: false,
      isError: false,
      ...input,
    }));
  });

  describe("request gating", () => {
    it("waits for the artist address before asking the indexer", () => {
      renderHook(() => useOnchainAnalyticsService().useGetOnchainStats(null));
      expect(options().enabled).toBe(false);
    });

    it("stays disabled on a deployment that has no subgraph configured", () => {
      mockIsConfigured.mockReturnValue(false);

      const { result } = renderHook(() => useOnchainAnalyticsService().useGetOnchainStats(ARTIST));

      expect(options().enabled).toBe(false);
      expect(result.current.isConfigured).toBe(false);
    });

    it("enables the query once both are present", () => {
      const { result } = renderHook(() => useOnchainAnalyticsService().useGetOnchainStats(ARTIST));

      expect(options().enabled).toBe(true);
      expect(result.current.isConfigured).toBe(true);
    });

    it("never fires the fetch for a null address, only for the artist it keys on", async () => {
      mockFetchStats.mockResolvedValue(statsOver({ totalPlays: 7 }));

      renderHook(() => useOnchainAnalyticsService().useGetOnchainStats(ARTIST));
      const data = await options().queryFn();

      expect(mockFetchStats).toHaveBeenCalledWith(ARTIST, 30);
      expect(data.totalPlays).toBe(7);
    });
  });

  describe("query options", () => {
    it("keys the cache per artist and per window so switching periods refetches", () => {
      renderHook(() => useOnchainAnalyticsService().useGetOnchainStats(ARTIST, 90));

      expect(options().queryKey).toEqual([...DASHBOARD_QUERY_KEYS.onchainStats, ARTIST, 90]);
    });

    it("caches for the shared dashboard window and gives up after one attempt", () => {
      renderHook(() => useOnchainAnalyticsService().useGetOnchainStats(ARTIST));

      expect(options().staleTime).toBe(DASHBOARD_CACHE.onchainStats);
      expect(options().retry).toBe(false);
    });
  });

  describe("staleness", () => {
    it("treats an indexer with no reported block time as not stale", () => {
      expect(isIndexerStale(null)).toBe(false);
    });

    it("flags an indexer that has not produced a block within the window", () => {
      const now = 1_759_000_000_000;
      expect(isIndexerStale(now - INDEXER_STALE_AFTER_MS - 1, now)).toBe(true);
      expect(isIndexerStale(now - INDEXER_STALE_AFTER_MS, now)).toBe(false);
      expect(isIndexerStale(now - 1000, now)).toBe(false);
    });

    it("reports the lag in whole minutes and never as a negative number", () => {
      const now = 1_759_000_000_000;
      expect(indexerLagMinutes(now - 45 * 60_000, now)).toBe(45);
      expect(indexerLagMinutes(now - 90_000, now)).toBe(2);
      expect(indexerLagMinutes(now + 60_000, now)).toBe(0);
    });

    it("surfaces staleness on the hook result", () => {
      mockUseQuery.mockImplementation(() => ({
        data: statsOver({ indexedAt: Date.now() - 2 * INDEXER_STALE_AFTER_MS }),
        isLoading: false,
        isError: false,
      }));

      const { result } = renderHook(() => useOnchainAnalyticsService().useGetOnchainStats(ARTIST));
      expect(result.current.isStaleData).toBe(true);
    });
  });
});
