"use client";

import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getApiUnavailableSnapshot, subscribeToApiAvailability } from "@/lib/apiAvailability";

export default function ApiUnavailableBanner() {
  const queryClient = useQueryClient();
  const unavailable = useSyncExternalStore(
    subscribeToApiAvailability,
    getApiUnavailableSnapshot,
    () => false
  );

  if (!unavailable) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="api-unavailable-banner"
      className="relative z-50 flex flex-wrap items-center justify-center gap-3 bg-red-950 px-4 py-3 text-sm text-red-100 shadow-md"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>The service is temporarily unavailable. Check your connection and try again.</span>
      <button
        type="button"
        onClick={() => void queryClient.refetchQueries({ type: "active" })}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-200/50 px-3 py-1 font-semibold hover:bg-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}
