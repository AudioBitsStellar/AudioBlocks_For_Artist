import {
  useQuery,
  useQueryClient,
  type QueryFunctionContext,
  type QueryKey,
} from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";
import { apiClient } from "@/api/axios";
import { useGet } from "@/api/hooks";
import { ARTIST_STATS_ENDPOINTS } from "@/api/api-endpoint";
import {
  DASHBOARD_CACHE,
  DASHBOARD_QUERY_KEYS,
  OVERVIEW_CACHE_TTL_MS,
} from "@/api/cachePolicy";

export { OVERVIEW_CACHE_TTL_MS };

export type StatsWindow = "7d" | "30d" | "90d" | "all-time";
export interface ArtistStats {
  artistId: string;
  songCount: number;
  totals: { plays: number; uniqueListeners: number; saves: number; revenueStroops: string };
}
export interface OverviewData {
  songsPublished: number;
  totalPlays: number;
  listenersCount: number;
  saves: number;
  followersCount: number | null;
  earningsXlm: string;
}
export interface OverviewActivity {
  id: string;
  userId: string;
  actionType: string;
  targetId: string;
  createdAt: string;
}
export const OVERVIEW_QUERY_KEY = DASHBOARD_QUERY_KEYS.overview;

/** Preserve stroop precision and currency; this is XLM, not USD. */
export function overviewFromStats(stats: ArtistStats): OverviewData {
  if (
    ![stats.songCount, stats.totals.plays, stats.totals.uniqueListeners, stats.totals.saves].every(
      (value) => Number.isFinite(value) && value >= 0
    )
  ) {
    throw new Error("Invalid artist statistics");
  }
  if (!/^\d+$/.test(stats.totals.revenueStroops)) throw new Error("Invalid royalty revenue");
  const stroops = stats.totals.revenueStroops.replace(/^0+(?=\d)/, "").padStart(8, "0");
  const whole = stroops.slice(0, -7);
  const fraction = stroops.slice(-7).replace(/0+$/, "");
  return {
    songsPublished: stats.songCount,
    totalPlays: stats.totals.plays,
    listenersCount: stats.totals.uniqueListeners,
    saves: stats.totals.saves,
    followersCount: null,
    earningsXlm: `${whole}${fraction ? `.${fraction}` : ""}`,
  };
}

/** Only add the abort signal when one was supplied, preserving existing calls. */
const getConfig = (params: Record<string, unknown>, signal?: AbortSignal): AxiosRequestConfig =>
  signal ? { params, signal } : { params };

export async function fetchOverview(
  artistId: string,
  window: StatsWindow,
  signal?: AbortSignal
) {
  // Documented controller contract; mounting it is tracked in backend #846.
  // A 404 stays an error, never a mock/zero fallback.
  const response = await apiClient.get<{ success: boolean; data: ArtistStats }>(
    ARTIST_STATS_ENDPOINTS.STATS(artistId),
    getConfig({ window }, signal)
  );
  if (!response.data.success || response.data.data?.artistId !== artistId)
    throw new Error("Invalid artist statistics response");
  return { success: true, data: overviewFromStats(response.data.data) };
}

export async function fetchRecentActivity(
  artistId: string,
  window: StatsWindow,
  signal?: AbortSignal
) {
  const days = window === "all-time" ? null : Number(window.replace("d", ""));
  const cutoff = days === null ? -Infinity : Date.now() - days * 86_400_000;
  // The authenticated feed is scoped server-side to the current user's actions.
  // It retains 90 days; fan activity on owned songs needs backend attribution.
  const response = await apiClient.get<{ success: boolean; data: OverviewActivity[] }>(
    "/activity/feed/me",
    getConfig({ limit: 100 }, signal)
  );
  const body = response.data;
  if (!body.success || !Array.isArray(body.data)) throw new Error("Invalid activity response");
  return {
    success: true,
    data: body.data
      .filter((item) => item.userId === artistId && Date.parse(item.createdAt) >= cutoff)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 10),
  };
}

interface CachedOverviewQuery<T> {
  queryKey: QueryKey;
  queryFn: (context: QueryFunctionContext) => Promise<T>;
  enabled: boolean;
  staleTime: number;
}

/**
 * React Query owns the cache: fresh data is served from memory while it is
 * within `staleTime`, and expired data is shown immediately while a background
 * refetch runs. `refresh` deliberately bypasses the cache for manual reloads.
 */
function useCachedOverviewQuery<T>(options: CachedOverviewQuery<T>) {
  const queryClient = useQueryClient();
  const query = useQuery<T>({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    enabled: options.enabled,
    staleTime: options.staleTime,
    retry: false,
  });

  const refresh = async () => {
    // Cancel an in-flight fetch so its older result cannot land after the
    // explicit reload, then force a network request regardless of freshness.
    await queryClient.cancelQueries({ queryKey: options.queryKey });
    return queryClient.fetchQuery<T>({
      queryKey: options.queryKey,
      queryFn: options.queryFn,
      staleTime: 0,
    });
  };

  return { ...query, refresh, refetch: refresh };
}

const useOverviewServices = () => {
  const useArtistId = (enabled: boolean) =>
    useGet<{ success: boolean; data: { id: string } }>(["overview-artist"], "/users/profile", {
      enabled,
      staleTime: DASHBOARD_CACHE.profile,
    });

  const useGetOverviewKpi = (
    window: StatsWindow = "30d",
    enabled = true,
    ttlMs: number = OVERVIEW_CACHE_TTL_MS
  ) => {
    const profile = useArtistId(enabled);
    const artistId = profile.data?.data.id;
    const queryKey = [...OVERVIEW_QUERY_KEY, artistId, window];
    const query = useCachedOverviewQuery({
      queryKey,
      queryFn: ({ signal }) => fetchOverview(artistId as string, window, signal),
      enabled: enabled && Boolean(artistId),
      staleTime: ttlMs,
    });
    return {
      ...query,
      isLoading: enabled && (profile.isLoading || query.isLoading),
      isError: profile.isError || query.isError,
    };
  };

  const useGetRecentActivity = (
    window: StatsWindow = "30d",
    enabled = true,
    ttlMs: number = DASHBOARD_CACHE.recentActivity
  ) => {
    const profile = useArtistId(enabled);
    const artistId = profile.data?.data.id;
    const queryKey = [...DASHBOARD_QUERY_KEYS.recentActivity, artistId, window];
    const query = useCachedOverviewQuery({
      queryKey,
      queryFn: ({ signal }) => fetchRecentActivity(artistId as string, window, signal),
      enabled: enabled && Boolean(artistId),
      staleTime: ttlMs,
    });
    return {
      ...query,
      isLoading: enabled && (profile.isLoading || query.isLoading),
      isError: profile.isError || query.isError,
    };
  };

  return { useGetOverviewKpi, useGetRecentActivity };
};
export default useOverviewServices;
