import { OVERVIEW_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import { OverviewResponse, StatisticsResponse, RecentActivityResponse } from "@/types";

/**
 * Query key for the artist overview KPI cache (issue #121).
 * Exported so mutations that change overview-affecting data (e.g. finalizing
 * a song upload, see `uploadService.ts`) can invalidate it via
 * `queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY })`.
 */
export const OVERVIEW_QUERY_KEY = DASHBOARD_QUERY_KEYS.overview;

const useOverviewServices = () => {
  /**
   * Fetches the artist overview KPI (earnings summary, recent activity, stats).
   *
   * Cached per `DASHBOARD_CACHE.overview` (60s): within that window, revisiting the
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
    return useGet<OverviewResponse>(OVERVIEW_QUERY_KEY, OVERVIEW_ENDPOINTS.GET_OVERVIEW, {
      enabled,
      staleTime: DASHBOARD_CACHE.overview,
    });
  };

  const useGetStatistics = (enabled: boolean = true) => {
    return useGet<StatisticsResponse>(
      DASHBOARD_QUERY_KEYS.statistics,
      OVERVIEW_ENDPOINTS.GET_STATISTICS,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.statistics,
      }
    );
  };

  const useGetRecentActivity = (enabled: boolean = true) => {
    return useGet<RecentActivityResponse>(
      DASHBOARD_QUERY_KEYS.recentActivity,
      OVERVIEW_ENDPOINTS.GET_RECENT_ACTIVITY,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.recentActivity,
      }
    );
  };

  return { useGetOverviewKpi, useGetStatistics, useGetRecentActivity };
};

export default useOverviewServices;
