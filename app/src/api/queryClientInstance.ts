import { QueryClient } from "@tanstack/react-query";
import { CACHE_TIME } from "./cachePolicy";

/** How long an unused query stays in memory before it's garbage collected. */
export const CACHE_GC_TIME_MS = 10 * 60 * 1000;

/**
 * The app-wide React Query client. Its defaults are the fallback cache policy
 * for any query that doesn't set its own `staleTime` (see `cachePolicy.ts`).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: Error) => {
        // Aborted requests are intentional cancellations, not failed queries.
        const requestError = error as { status?: number; name?: string; code?: string };
        if (
          requestError?.name === "CanceledError" ||
          requestError?.name === "AbortError" ||
          requestError?.code === "ERR_CANCELED"
        ) {
          return false;
        }
        if (requestError?.status >= 400 && requestError?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: CACHE_TIME.LONG,
      gcTime: CACHE_GC_TIME_MS,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Drops every cached query. Call when a different artist signs in so the
 * previous session's dashboard data (earnings, messages, ...) can never be
 * shown to the next one.
 */
export function clearQueryCache(): void {
  queryClient.clear();
}
