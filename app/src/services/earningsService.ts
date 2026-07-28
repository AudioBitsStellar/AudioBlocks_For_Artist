import { EARNINGS_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { EarningsResponse } from "@/types";

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
      ["get-artist-earnings"],
      EARNINGS_ENDPOINTS.GET_EARNINGS,
      {
        enabled,
        staleTime: 1000 * 60 * 5, // 5 min cache
      }
    );
  };

  return { useGetEarnings };
};

export default useEarningsServices;
