import { EARNINGS_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import { EarningsResponse, PlatformRevenueResponse } from "@/types";

const useEarningsServices = () => {
  /**
   * Fetches the artist's earnings summary — total earnings, month-over-month
   * comparison, and per-month earnings/royalties history — cached for 5 minutes.
   *
   * @param enabled - Set false to skip fetching. Defaults to true.
   * @returns A React Query result: `{ data: EarningsResponse | undefined, isLoading, isError, error, refetch, ... }`.
   * @throws Never throws directly — request failures surface via the returned `error`/`isError` fields.
   * @example
   * const { useGetEarnings } = useEarningsServices();
   * const { data, isLoading } = useGetEarnings();
   * const totalEarnings = data?.data.totalEarnings ?? 0;
   */
  const useGetEarnings = (enabled: boolean = true) => {
    return useGet<EarningsResponse>(
      DASHBOARD_QUERY_KEYS.earnings,
      EARNINGS_ENDPOINTS.GET_EARNINGS,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.earnings, // 5 min cache
      }
    );
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

  return { useGetEarnings, useGetPlatformRevenue };
};

export default useEarningsServices;
