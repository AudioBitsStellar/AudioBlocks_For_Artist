import { MERCH_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePost, usePut, useDelete } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";

export interface MerchMetric {
  label: string;
  value: string;
  descriptor: string;
  gradient: string;
}

export interface MerchItem {
  id: number;
  title: string;
  detail: string;
  date: string;
  time: string;
  price: string;
  image: string;
}

export interface MerchListResponse {
  metrics: MerchMetric[];
  items: MerchItem[];
}

export interface CreateMerchPayload {
  title: string;
  detail: string;
  date: string;
  time: string;
  price: string;
  image?: string;
}

export type UpdateMerchPayload = Partial<CreateMerchPayload>;

const MERCH_QUERY_KEY = ["merches"];

const useMerchService = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  const useGetMerches = () =>
    useGet<MerchListResponse>(MERCH_QUERY_KEY, MERCH_ENDPOINTS.LIST);

  const useCreateMerch = () =>
    usePost<MerchItem, CreateMerchPayload>(MERCH_ENDPOINTS.CREATE, {
      onSuccess: () => handleSuccess("Merch item created!"),
      onError: (error) => handleError(error.message || "Failed to create merch."),
      invalidateQueries: [MERCH_QUERY_KEY],
    });

  const useUpdateMerch = (id: number) =>
    usePut<MerchItem, UpdateMerchPayload>(MERCH_ENDPOINTS.UPDATE(id), {
      onSuccess: () => handleSuccess("Merch item updated!"),
      onError: (error) => handleError(error.message || "Failed to update merch."),
      invalidateQueries: [MERCH_QUERY_KEY],
    });

  const useDeleteMerch = (id: number) =>
    useDelete<void>(MERCH_ENDPOINTS.DELETE(id), {
      onSuccess: () => handleSuccess("Merch item deleted."),
      onError: (error) => handleError(error.message || "Failed to delete merch."),
      invalidateQueries: [MERCH_QUERY_KEY],
    });

  return { useGetMerches, useCreateMerch, useUpdateMerch, useDeleteMerch };
};

export default useMerchService;
