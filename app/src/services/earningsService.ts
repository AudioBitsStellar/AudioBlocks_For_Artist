import { useGet } from "@/api/hooks";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";

/**
 * Backend royalty payout record.
 *
 * Fields are intentionally kept aligned with the payout API contract.
 * Adjust these fields if the backend DTO uses different names.
 */
export interface RoyaltyPayout {
  id: string;
  amount: number;
  asset: string;
  transactionHash?: string | null;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * API response returned by GET /api/royalty-payouts.
 *
 * Supports a paginated/enveloped response.
 */
export interface RoyaltyPayoutsResponse {
  data: RoyaltyPayout[];
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Optional date-range filters for earnings and payout history.
 */
export interface EarningsFilters {
  startDate?: string;
  endDate?: string;
}

/**
 * Builds query parameters for date-range filtering.
 */
const buildEarningsQuery = (filters?: EarningsFilters): string => {
  if (!filters?.startDate && !filters?.endDate) {
    return "";
  }

  const params = new URLSearchParams();

  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }

  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }

  return `?${params.toString()}`;
};

/**
 * Backend endpoint for royalty payouts.
 *
 * The backend's RoyaltyPayout records are the source of truth for earnings.
 */
const ROYALTY_PAYOUTS_ENDPOINT = "/api/royalty-payouts";

const useEarningsServices = () => {
  /**
   * Fetches royalty payouts from the backend.
   *
   * This replaces the previously nonexistent artist earnings endpoint.
   *
   * Earnings should be aggregated by asset (e.g. XLM, USDC)
   * in the consuming component. Different assets must never be
   * summed together without explicit conversion.
   *
   * @param enabled - Whether the query should execute. Defaults to true.
   * @param filters - Optional date range.
   *
   * @returns React Query result containing royalty payout records.
   */
  const useGetEarnings = (
    enabled: boolean = true,
    filters?: EarningsFilters,
  ) => {
    const endpoint = `${ROYALTY_PAYOUTS_ENDPOINT}${buildEarningsQuery(filters)}`;

    return useGet<RoyaltyPayoutsResponse>(
      DASHBOARD_QUERY_KEYS.earnings,
      endpoint,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.earnings,
      },
    );
  };

  /**
   * Fetches payout history from the backend.
   *
   * Earnings and payout history currently share the same backend source.
   * This hook is provided for consumers that need to distinguish
   * payout history from earnings summary usage.
   *
   * @param enabled - Whether the query should execute. Defaults to true.
   * @param filters - Optional date range.
   */
  const useGetPayoutHistory = (
    enabled: boolean = true,
    filters?: EarningsFilters,
  ) => {
    const endpoint = `${ROYALTY_PAYOUTS_ENDPOINT}${buildEarningsQuery(filters)}`;

    return useGet<RoyaltyPayoutsResponse>(
      [...DASHBOARD_QUERY_KEYS.earnings, "payout-history"],
      endpoint,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.earnings,
      },
    );
  };

  return {
    useGetEarnings,
    useGetPayoutHistory,
  };
};

export default useEarningsServices;