import { FANS_ENGAGEMENT_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { FansEngagementResponse } from "@/types";

const useFansEngagementServices = () => {
  /**
   * Fetches the Fans Engagement widget data (top songs, streaming regions,
   * top streamers), cached for 2 minutes.
   *
   * @param enabled - Set false to skip fetching. Defaults to true.
   * @returns A React Query result: `{ data: FansEngagementResponse | undefined, isLoading, isError, error, refetch, ... }`.
   * @throws Never throws directly — request failures surface via the returned `error`/`isError` fields.
   */
  const useGetFansEngagement = (enabled: boolean = true) => {
    return useGet<FansEngagementResponse>(
      ["get-artist-fans-engagement"],
      FANS_ENGAGEMENT_ENDPOINTS.GET_FANS_ENGAGEMENT,
      {
        enabled,
        staleTime: 1000 * 60 * 2,
      }
    );
  };

  return { useGetFansEngagement };
};

export default useFansEngagementServices;
