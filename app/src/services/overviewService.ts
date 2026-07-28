import { OVERVIEW_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { OverviewResponse, StatisticsResponse, RecentActivityResponse } from "@/types";

/**
 * Query key for the artist overview KPI cache (issue #121).
 * Exported so mutations that change overview-affecting data (e.g. finalizing
 * a song upload, see `uploadSerive.ts`) can invalidate it via
 * `queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY })`.
 */
export const OVERVIEW_QUERY_KEY = ["get-artist-overview"];

/** How long a fetched overview response is considered fresh before a background refetch is triggered. */
const OVERVIEW_CACHE_TTL_MS = 1000 * 60; // 60s

const useOverviewServices = () => {
  /**
   * Fetches the artist overview KPI (earnings summary, recent activity, stats).
   *
   * Cached for `OVERVIEW_CACHE_TTL_MS`: within that window, revisiting the
   * Overview tab shows the cached data instantly with no network request.
   * Once stale, cached data is still shown immediately while a fresh copy is
   * fetched in the background. Call the returned `refetch` to force a fresh
   * fetch regardless of the cache (e.g. a manual refresh button).
   *
   * @param enabled - Set false to skip fetching (e.g. while a parent tab is inactive). Defaults to true.
   * @returns A React Query result: `{ data: OverviewResponse | undefined, isLoading, isError, error, refetch, ... }`.
   * @throws Never throws directly — request failures surface via the returned `error`/`isError` fields.
   */
  const useGetOverviewKpi = (enabled: boolean = true) => {
    return useGet<OverviewResponse>(
      OVERVIEW_QUERY_KEY,
      OVERVIEW_ENDPOINTS.GET_OVERVIEW,
      {
        enabled,
        staleTime: OVERVIEW_CACHE_TTL_MS,
      }
    );
  };

  const useGetStatistics = (enabled: boolean = true) => {
    return useGet<StatisticsResponse>(
      ["get-artist-statistics"],
      OVERVIEW_ENDPOINTS.GET_STATISTICS,
      {
        enabled,
        staleTime: 1000 * 60 * 5,
      }
    );
  };

  const useGetRecentActivity = (enabled: boolean = true) => {
    return useGet<RecentActivityResponse>(
      ["get-artist-recent-activity"],
      OVERVIEW_ENDPOINTS.GET_RECENT_ACTIVITY,
      {
        enabled,
        staleTime: 1000 * 60 * 2,
      }
    );
  };

  return { useGetOverviewKpi, useGetStatistics, useGetRecentActivity };
};

export default useOverviewServices;
