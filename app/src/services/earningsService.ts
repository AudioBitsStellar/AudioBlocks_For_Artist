import { useMemo } from "react";
import { EARNINGS_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import { PlatformRevenueResponse } from "@/types";
import { parseRoyaltyPayoutCsv, type RoyaltyPayoutRecord } from "@/utils/royaltyEarnings";

const useEarningsServices = () => {
  /**
   * The signed-in artist's royalty payout records (#47).
   *
   * Reads `GET /api/royalty-payouts/export`, the backend's only artist-scoped
   * royalty source: a CSV of every RoyaltyPayout the Soroban royalty contract
   * recorded for the artist, with its reconciliation status. The CSV is parsed
   * here, so consumers get typed records. Aggregate them with
   * `summarizeEarnings` from `@/utils/royaltyEarnings`, one asset at a time.
   *
   * @param enabled - Set false to skip fetching. Defaults to true.
   * @returns The React Query state, plus `records` (empty until loaded).
   */
  const useGetRoyaltyPayouts = (enabled: boolean = true) => {
    const query = useGet<string>(
      DASHBOARD_QUERY_KEYS.earnings,
      EARNINGS_ENDPOINTS.ROYALTY_PAYOUTS_EXPORT,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.earnings, // 5 min cache
      }
    );
    const records = useMemo<RoyaltyPayoutRecord[]>(
      () => (typeof query.data === "string" ? parseRoyaltyPayoutCsv(query.data) : []),
      [query.data]
    );
    return { ...query, records };
  };

  /**
   * Fetches the artist's revenue broken down by streaming platform —
   * per-platform revenue, percentage share, and stream counts — cached for 5 minutes.
   *
   * @param enabled - Set false to skip fetching. Defaults to true.
   * @returns A React Query result with PlatformRevenueResponse data.
   */
  const useGetPlatformRevenue = (enabled: boolean = true) => {
    return useGet<PlatformRevenueResponse>(
      DASHBOARD_QUERY_KEYS.platformRevenue,
      EARNINGS_ENDPOINTS.GET_PLATFORM_REVENUE,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.platformRevenue,
      }
    );
  };

  return { useGetRoyaltyPayouts, useGetPlatformRevenue };
};

export default useEarningsServices;
