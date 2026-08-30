import { useQuery, useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";
import { createApiClient } from "./axios";
// import { ApiResponse } from "@/types";

let apiClient: Awaited<ReturnType<typeof createApiClient>> | null = null;

const getApiClient = async () => {
  if (!apiClient) {
    apiClient = await createApiClient();
  }
  return apiClient;
};

/* =========================
   GENERIC GET
========================= */

export function useGet<T>(
  queryKey: QueryKey,
  endpoint: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  }
) {
  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      const client = await getApiClient();
      const res = await client.get<T>(endpoint);
      return res.data; // 🔑 FIX: return data, not AxiosResponse
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
  });
}

/* =========================
   GENERIC POST
========================= */

export function usePost<TData, TVariables = unknown>(
  endpoint: string,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: QueryKey[];
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const client = await getApiClient();
      const res = await client.post<TData>(endpoint, variables);
      return res.data;
    },
    onSuccess: (data, variables) => {
      options?.onSuccess?.(data, variables);

      options?.invalidateQueries?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/* =========================
   GENERIC PUT
========================= */

export function usePut<TData, TVariables = unknown>(
  endpoint: string,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: QueryKey[];
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const client = await getApiClient();
      const res = await client.put<TData>(endpoint, variables);
      return res.data;
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);

      options?.invalidateQueries?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/* =========================
   GENERIC PATCH
========================= */

export function usePatch<TData, TVariables = unknown>(
  endpoint: string,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: QueryKey[];
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const client = await getApiClient();
      const res = await client.patch<TData>(endpoint, variables);
      return res.data;
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);

      options?.invalidateQueries?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

/* =========================
   GENERIC DELETE
========================= */

export function useDelete<TData = unknown>(
  endpoint: string,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: QueryKey[];
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, void>({
    mutationFn: async () => {
      const client = await getApiClient();
      const res = await client.delete<TData>(endpoint);
      return res.data;
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);

      options?.invalidateQueries?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}
