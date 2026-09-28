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

/* =========================
   OPTIMISTIC PUT / PATCH
========================= */

export interface OptimisticMutationOptions<TData, TVariables, TCache> {
  /** HTTP verb used for the update. Defaults to `patch`. */
  method?: "put" | "patch";
  /** Builds the request URL from the mutation variables (e.g. `/song/${id}`). */
  endpoint: (variables: TVariables) => string;
  /** Replaces the HTTP call entirely, e.g. to simulate the request while mock data is enabled. */
  request?: (variables: TVariables) => Promise<TData>;
  /** Cached query to update optimistically; it is also invalidated once the mutation settles. */
  queryKey?: QueryKey;
  /** Produces the optimistic cache value. Only called when `queryKey` has cached data. */
  applyOptimistic?: (cache: TCache, variables: TVariables) => TCache;
  /**
   * Applies the change to state that lives outside the React Query cache (e.g. a
   * component's local list). Return a function that undoes it — it is called if the request fails.
   */
  onOptimistic?: (variables: TVariables) => (() => void) | void;
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called after the optimistic change has been rolled back. */
  onError?: (error: Error, variables: TVariables) => void;
}

interface OptimisticContext<TCache> {
  previous: TCache | undefined;
  rollback: (() => void) | undefined;
}

/**
 * A PUT/PATCH mutation that updates the UI *before* the server responds and
 * rolls the change back if the request fails.
 *
 * On mutate it cancels in-flight refetches of `queryKey` (so they can't
 * overwrite the optimistic value), snapshots the cache, writes the optimistic
 * value and runs `onOptimistic`. On error it restores the snapshot and calls the
 * function `onOptimistic` returned. Once settled it invalidates `queryKey` so the
 * cache converges on the server's truth.
 *
 * @example
 * const update = useOptimisticMutation<Track, TrackEdit, Track[]>({
 *   endpoint: (v) => `/song/${v.id}`,
 *   queryKey: ["tracks"],
 *   applyOptimistic: (tracks, v) => tracks.map((t) => (t.id === v.id ? { ...t, ...v } : t)),
 * });
 * update.mutate({ id: 1, title: "New title" });
 */
export function useOptimisticMutation<TData, TVariables, TCache = unknown>(
  options: OptimisticMutationOptions<TData, TVariables, TCache>
) {
  const queryClient = useQueryClient();
  const { method = "patch", queryKey } = options;

  return useMutation<TData, Error, TVariables, OptimisticContext<TCache>>({
    mutationFn: async (variables) => {
      if (options.request) return options.request(variables);
      const client = await getApiClient();
      const url = options.endpoint(variables);
      const res =
        method === "put"
          ? await client.put<TData>(url, variables)
          : await client.patch<TData>(url, variables);
      return res.data;
    },
    onMutate: async (variables) => {
      let previous: TCache | undefined;
      if (queryKey) {
        await queryClient.cancelQueries({ queryKey });
        previous = queryClient.getQueryData<TCache>(queryKey);
        if (previous !== undefined && options.applyOptimistic) {
          queryClient.setQueryData<TCache>(queryKey, options.applyOptimistic(previous, variables));
        }
      }
      const undo = options.onOptimistic?.(variables);
      return { previous, rollback: typeof undo === "function" ? undo : undefined };
    },
    onError: (error, variables, context) => {
      if (queryKey && context?.previous !== undefined) {
        queryClient.setQueryData<TCache>(queryKey, context.previous);
      }
      context?.rollback?.();
      options.onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      options.onSuccess?.(data, variables);
    },
    onSettled: () => {
      if (queryKey) queryClient.invalidateQueries({ queryKey });
    },
  });
}
