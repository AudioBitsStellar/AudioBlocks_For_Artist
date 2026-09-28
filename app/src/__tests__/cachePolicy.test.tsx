import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn().mockResolvedValue({ get: mockGet, post: mockPost }),
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

import {
  ALBUM_PUBLISHED_INVALIDATIONS,
  CACHE_TIME,
  DASHBOARD_CACHE,
  DASHBOARD_QUERY_KEYS,
  SONG_PUBLISHED_INVALIDATIONS,
} from "@/api/cachePolicy";
import { CACHE_GC_TIME_MS, clearQueryCache, queryClient } from "@/api/queryClientInstance";
import useEarningsServices from "@/services/earningsService";
import useUploadServices from "@/services/uploadService";
import useAlbumServices from "@/services/albumService";
import { OVERVIEW_QUERY_KEY } from "@/services/overviewService";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(client, "invalidateQueries");
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, invalidateSpy, Wrapper };
}

describe("cache policy", () => {
  it("orders the tiers from always-refetch to slow-moving", () => {
    expect(CACHE_TIME.NONE).toBe(0);
    expect(CACHE_TIME.SHORT).toBe(60_000);
    expect(CACHE_TIME.MEDIUM).toBe(120_000);
    expect(CACHE_TIME.LONG).toBe(300_000);
    expect(CACHE_TIME.NONE).toBeLessThan(CACHE_TIME.SHORT);
    expect(CACHE_TIME.SHORT).toBeLessThan(CACHE_TIME.MEDIUM);
    expect(CACHE_TIME.MEDIUM).toBeLessThan(CACHE_TIME.LONG);
  });

  it("assigns every dashboard resource one of the named tiers", () => {
    const tiers = new Set<number>(Object.values(CACHE_TIME));
    for (const [resource, staleTime] of Object.entries(DASHBOARD_CACHE)) {
      expect(tiers.has(staleTime), `${resource} uses an unnamed staleTime`).toBe(true);
    }
  });

  it("keeps the previously hard-coded freshness windows unchanged", () => {
    expect(DASHBOARD_CACHE.profile).toBe(0);
    expect(DASHBOARD_CACHE.overview).toBe(60_000);
    expect(DASHBOARD_CACHE.analytics).toBe(60_000);
    expect(DASHBOARD_CACHE.transactions).toBe(60_000);
    expect(DASHBOARD_CACHE.comments).toBe(60_000);
    expect(DASHBOARD_CACHE.recentActivity).toBe(120_000);
    expect(DASHBOARD_CACHE.albums).toBe(120_000);
    expect(DASHBOARD_CACHE.fansEngagement).toBe(120_000);
    expect(DASHBOARD_CACHE.statistics).toBe(300_000);
    expect(DASHBOARD_CACHE.earnings).toBe(300_000);
    expect(DASHBOARD_CACHE.platformRevenue).toBe(300_000);
  });

  it("uses a distinct query key for every cached resource", () => {
    const serialized = Object.values(DASHBOARD_QUERY_KEYS).map((key) => JSON.stringify(key));
    expect(new Set(serialized).size).toBe(serialized.length);
  });

  it("refreshes the summaries a published song changes", () => {
    expect(SONG_PUBLISHED_INVALIDATIONS).toEqual([
      DASHBOARD_QUERY_KEYS.overview,
      DASHBOARD_QUERY_KEYS.statistics,
      DASHBOARD_QUERY_KEYS.recentActivity,
    ]);
  });

  it("refreshes the albums list as well when an album is published", () => {
    expect(ALBUM_PUBLISHED_INVALIDATIONS).toContain(DASHBOARD_QUERY_KEYS.albums);
    for (const key of SONG_PUBLISHED_INVALIDATIONS) {
      expect(ALBUM_PUBLISHED_INVALIDATIONS).toContain(key);
    }
  });

  it("keeps the exported service query keys in sync with the policy", () => {
    expect(OVERVIEW_QUERY_KEY).toEqual(DASHBOARD_QUERY_KEYS.overview);
  });
});

describe("shared query client", () => {
  const queryDefaults = queryClient.getDefaultOptions().queries!;

  it("uses the LONG tier as the fallback staleTime and a 10 minute gcTime", () => {
    expect(queryDefaults.staleTime).toBe(CACHE_TIME.LONG);
    expect(queryDefaults.gcTime).toBe(CACHE_GC_TIME_MS);
    expect(CACHE_GC_TIME_MS).toBe(10 * 60 * 1000);
    expect(queryDefaults.refetchOnWindowFocus).toBe(false);
  });

  it("does not retry client errors but retries server errors up to 3 times", () => {
    const retry = queryDefaults.retry as (count: number, error: Error) => boolean;
    const clientError = Object.assign(new Error("nope"), { status: 404 });
    const serverError = Object.assign(new Error("boom"), { status: 500 });

    expect(retry(0, clientError)).toBe(false);
    expect(retry(0, serverError)).toBe(true);
    expect(retry(2, serverError)).toBe(true);
    expect(retry(3, serverError)).toBe(false);
  });

  it("clearQueryCache drops every cached query", () => {
    queryClient.setQueryData(["get-artist-earnings"], { secret: "artist A" });
    expect(queryClient.getQueryData(["get-artist-earnings"])).toBeDefined();

    clearQueryCache();

    expect(queryClient.getQueryData(["get-artist-earnings"])).toBeUndefined();
  });
});

describe("cache behaviour in services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves a second mount from the cache while the data is still fresh", async () => {
    mockGet.mockResolvedValue({ data: { data: { totalEarnings: 100 } } });
    const { Wrapper } = makeWrapper();

    const first = renderHook(() => useEarningsServices().useGetEarnings(), { wrapper: Wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(1);

    // A second consumer of the same query (e.g. revisiting the tab) reads the cache instantly.
    const second = renderHook(() => useEarningsServices().useGetEarnings(), { wrapper: Wrapper });
    expect(second.result.current.data).toEqual({ data: { totalEarnings: 100 } });
    expect(second.result.current.isFetching).toBe(false);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("refreshes the overview, statistics and activity caches after a song is finalized", async () => {
    mockPost.mockResolvedValue({ data: { data: { id: "s1" } } });
    const { invalidateSpy, Wrapper } = makeWrapper();

    const { result } = renderHook(() => useUploadServices().useFinalizeUpload(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({
        fileId: "f",
        totalChunks: 1,
        title: "t",
        description: "d",
        genre: "Afrobeats",
        composers: "c",
        coverArtPath: "p",
      });
    });

    for (const key of SONG_PUBLISHED_INVALIDATIONS) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
    }
  });

  it("refreshes the summaries as well as the albums list after an album upload", async () => {
    mockPost.mockResolvedValue({ data: { id: "a1" } });
    const { invalidateSpy, Wrapper } = makeWrapper();

    const { result } = renderHook(() => useAlbumServices().useCreateAlbum(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(new FormData());
    });

    for (const key of ALBUM_PUBLISHED_INVALIDATIONS) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
    }
  });
});
