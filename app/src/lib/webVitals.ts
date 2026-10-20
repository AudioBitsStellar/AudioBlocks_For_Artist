import type { Metric } from "web-vitals";

export interface WebVitalsPayload {
  name: Metric["name"];
  value: number;
  delta: number;
  id: string;
  rating: Metric["rating"];
  navigationType: Metric["navigationType"];
  path: string;
  timestamp: number;
}

export function buildWebVitalsPayload(metric: Metric): WebVitalsPayload {
  return {
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: typeof window === "undefined" ? "" : window.location.pathname,
    timestamp: Date.now(),
  };
}

function formatMetric(payload: WebVitalsPayload): string {
  return `[web-vitals] ${payload.name}: ${payload.value.toFixed(2)} (${payload.rating})`;
}

function logMetric(payload: WebVitalsPayload): void {
  // eslint-disable-next-line no-console
  console.info(formatMetric(payload), payload);
}

/**
 * Reports one Core Web Vital.
 *
 * Development always logs to the console. Production posts to
 * `NEXT_PUBLIC_WEB_VITALS_ENDPOINT` with `sendBeacon` when available (so the
 * request survives page unload) and falls back to `fetch(..., { keepalive })`.
 * When no endpoint is configured it logs instead, which satisfies the
 * "analytics endpoint (or log)" requirement without adding a hard dependency.
 * Reporting never throws into the app.
 */
export function reportWebVitals(metric: Metric): void {
  const payload = buildWebVitalsPayload(metric);

  if (process.env.NODE_ENV !== "production") {
    logMetric(payload);
    return;
  }

  const endpoint = process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT;
  if (!endpoint) {
    logMetric(payload);
    return;
  }

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const queued = navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: "application/json;charset=utf-8" })
      );
      if (queued) return;
    }

    if (typeof fetch === "function") {
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // Telemetry must never surface as an application error.
      });
    }
  } catch {
    logMetric(payload);
  }
}
