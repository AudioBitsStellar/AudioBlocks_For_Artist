import { OVERVIEW_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { OverviewResponse } from "@/types";

const useOverviewServices = () => {
  const useGetOverviewKpi = (enabled: boolean = true) => {
    return useGet<OverviewResponse>(
      ["get-artist-overview"],
      OVERVIEW_ENDPOINTS.GET_OVERVIEW,
      {
        enabled,
        staleTime: 1000 * 60 * 5,
      }
    );
  };

  return { useGetOverviewKpi };
};

export default useOverviewServices;
