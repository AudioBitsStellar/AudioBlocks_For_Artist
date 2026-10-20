"use client";

import { useEffect } from "react";
import { reportWebVitals } from "@/lib/webVitals";

/**
 * Client-side Web Vitals reporter (issue #153).
 *
 * Registers the four Core Web Vitals required by the issue — LCP, FID, CLS and
 * TTFB — and forwards each metric to `reportWebVitals`, which logs in
 * development and posts to the configured analytics endpoint in production.
 * Mounted once from the root layout; renders nothing.
 */
export default function WebVitalsReporter() {
  useEffect(() => {
    let active = true;

    void (async () => {
      const { onCLS, onFID, onLCP, onTTFB } = await import("web-vitals");
      if (!active) return;

      const handleMetric = (metric: Parameters<typeof reportWebVitals>[0]) =>
        reportWebVitals(metric);

      onCLS(handleMetric);
      onFID(handleMetric);
      onLCP(handleMetric);
      onTTFB(handleMetric);
    })();

    return () => {
      active = false;
    };
  }, []);

  return null;
}

export { WebVitalsReporter };
