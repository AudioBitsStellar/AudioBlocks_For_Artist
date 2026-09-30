import { DASHBOARD_TRANSACTION_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import type { DashboardTransaction, TransactionsResponse } from "@/types/api";

// Response types live in the central `@/types/api` module (#140); re-exported
// here so existing imports from this service keep working.
export type { DashboardTransaction, TransactionsResponse } from "@/types/api";

export const TRANSACTIONS_QUERY_KEY = DASHBOARD_QUERY_KEYS.transactions;

const useTransactionServices = () => {
  const useGetTransactions = (enabled: boolean = true) => {
    return useGet<TransactionsResponse>(
      TRANSACTIONS_QUERY_KEY,
      DASHBOARD_TRANSACTION_ENDPOINTS.LIST,
      {
        enabled,
        staleTime: DASHBOARD_CACHE.transactions,
      }
    );
  };

  return { useGetTransactions };
};

export default useTransactionServices;
