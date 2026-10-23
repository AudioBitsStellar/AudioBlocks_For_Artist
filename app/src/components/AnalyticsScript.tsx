"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useAnalyticsConsent } from "@/hooks/useAnalyticsConsent";
import { flushQueuedAnalytics, getAnalyticsWriteKey } from "@/lib/analytics";
import { getSegmentScriptUrl, installSegmentStub } from "@/lib/segmentSnippet";

/**
 * Loads the Segment-compatible analytics provider (#668), but only when
 * NEXT_PUBLIC_ANALYTICS_WRITE_KEY is set AND the artist has accepted
 * analytics. Without both, nothing is injected and no request is made.
 *
 * Withdrawing consent stops all tracking immediately (the façade checks
 * consent on every event and `setAnalyticsConsent("rejected")` resets the
 * provider); the already-downloaded library is unloaded on the next page load.
 */
export default function AnalyticsScript() {
  const consent = useAnalyticsConsent();
  const writeKey = getAnalyticsWriteKey();
  const enabled = writeKey !== "" && consent === "accepted";

  useEffect(() => {
    if (!enabled) return;
    if (installSegmentStub(writeKey)) {
      (window as Window & { analytics?: { page?: () => void } }).analytics?.page?.();
    }
    // Hand events fired before the stub existed to it; analytics.js replays
    // the stub's buffer once it has loaded.
    flushQueuedAnalytics();
  }, [enabled, writeKey]);

  if (!enabled) return null;

  return (
    <Script
      id="segment-analytics"
      src={getSegmentScriptUrl(writeKey)}
      strategy="afterInteractive"
    />
  );
}
