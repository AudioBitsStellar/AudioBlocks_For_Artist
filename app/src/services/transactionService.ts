import { DASHBOARD_TRANSACTION_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";

export interface DashboardTransaction {
  id: string | number;
  type: string;
  song: string;
  value: string;
  date: string;
  receiptUrl?: string;
}

export interface TransactionsResponse {
  success: boolean;
  data: DashboardTransaction[];
}

export const TRANSACTIONS_QUERY_KEY = ["get-dashboard-transactions"];

const useTransactionServices = () => {
  const useGetTransactions = (enabled: boolean = true) => {
    return useGet<TransactionsResponse>(
      TRANSACTIONS_QUERY_KEY,
      DASHBOARD_TRANSACTION_ENDPOINTS.LIST,
      {
        enabled,
        staleTime: 1000 * 60,
      }
    );
  };

  return { useGetTransactions };
};

export default useTransactionServices;
