"use client";

import { useState } from "react";
import { AlertTriangle, X, Wrench } from "lucide-react";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

interface MaintenanceBannerProps {
  /** Optional forced visibility for testing or preview environments. */
  forceShow?: boolean;
  /** Optional scheduled window display string. */
  scheduledWindow?: string;
}

export default function MaintenanceBanner({
  forceShow = false,
  scheduledWindow = "Saturday 02:00 – 04:00 UTC",
}: MaintenanceBannerProps) {
  const isFlagEnabled = useFeatureFlag("maintenanceMode");
  const isEnvEnabled = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const shouldDisplay = forceShow || isFlagEnabled || isEnvEnabled;

  const [dismissed, setDismissed] = useState(false);

  if (!shouldDisplay || dismissed) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-label="Planned maintenance notice"
      data-testid="maintenance-banner"
      className="relative z-40 border-b border-amber-500/30 bg-amber-500/15 px-4 py-3 text-amber-200 transition-all backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <Wrench size={16} aria-hidden="true" />
          </span>
          <div className="text-xs sm:text-sm">
            <span className="font-semibold text-amber-300">Planned Maintenance Scheduled:</span>{" "}
            <span>
              AudioBlocks infrastructure and Soroban contract endpoints will undergo routine
              maintenance ({scheduledWindow}).
            </span>{" "}
            <span className="hidden sm:inline text-amber-200/80">
              Music publishing and contract settlements will be read-only during this window.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss maintenance notice"
          data-testid="dismiss-maintenance-banner"
          className="rounded-lg p-1 text-amber-300 transition-colors hover:bg-amber-500/20 hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
