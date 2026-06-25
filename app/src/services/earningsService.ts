import { EARNINGS_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { EarningsResponse } from "@/types";

const useEarningsServices = () => {
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
