import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "@/api/axios";
import { useGet } from "@/api/queryClient";
import { ARTIST_STATS_ENDPOINTS } from "@/api/api-endpoint";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";

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

export async function fetchOverview(artistId: string, window: StatsWindow) {
  const client = await createApiClient();
  // Documented controller contract; mounting it is tracked in backend #846.
  // A 404 stays an error, never a mock/zero fallback.
  const response = await client.get<{ success: boolean; data: ArtistStats }>(
    ARTIST_STATS_ENDPOINTS.STATS(artistId),
    { params: { window } }
  );
  if (!response.data.success || response.data.data?.artistId !== artistId)
    throw new Error("Invalid artist statistics response");
  return { success: true, data: overviewFromStats(response.data.data) };
}

export async function fetchRecentActivity(artistId: string, window: StatsWindow) {
  const client = await createApiClient();
  const days = window === "all-time" ? null : Number(window.replace("d", ""));
  const cutoff = days === null ? -Infinity : Date.now() - days * 86_400_000;
  // The authenticated feed is scoped server-side to the current user's actions.
  // It retains 90 days; fan activity on owned songs needs backend attribution.
  const response = await client.get<{ success: boolean; data: OverviewActivity[] }>(
    "/activity/feed/me",
    { params: { limit: 100 } }
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

const useOverviewServices = () => {
  const useArtistId = (enabled: boolean) =>
    useGet<{ success: boolean; data: { id: string } }>(["overview-artist"], "/users/profile", {
      enabled,
      staleTime: DASHBOARD_CACHE.overview,
    });
  const useGetOverviewKpi = (window: StatsWindow = "30d", enabled = true) => {
    const profile = useArtistId(enabled);
    const artistId = profile.data?.data.id;
    const query = useQuery({
      queryKey: [...OVERVIEW_QUERY_KEY, artistId, window],
      queryFn: () => fetchOverview(artistId as string, window),
      enabled: enabled && Boolean(artistId),
      staleTime: DASHBOARD_CACHE.overview,
      retry: false,
    });
    return {
      ...query,
      isLoading: enabled && (profile.isLoading || query.isLoading),
      isError: profile.isError || query.isError,
    };
  };
  const useGetRecentActivity = (window: StatsWindow = "30d", enabled = true) => {
    const profile = useArtistId(enabled);
    const artistId = profile.data?.data.id;
    const query = useQuery({
      queryKey: [...DASHBOARD_QUERY_KEYS.recentActivity, artistId, window],
      queryFn: () => fetchRecentActivity(artistId as string, window),
      enabled: enabled && Boolean(artistId),
      staleTime: DASHBOARD_CACHE.recentActivity,
      retry: false,
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
