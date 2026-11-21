/**
 * Aggregation for the Web Vitals dashboard (OBS-03).
 *
 * `reportWebVitals` sends one sample per metric per page load, each carrying
 * the route it was measured on. A dashboard needs the p75 per route, not an
 * average: Core Web Vitals are defined at the 75th percentile, so an average
 * lets a slow quarter of sessions hide behind a fast majority.
 *
 * This module is the definition of "p75" for the app. The collector that
 * receives the samples should use it too, so the number on the dashboard and
 * the number in the alert rule are computed the same way.
 */

/** One reported measurement, as `reportWebVitals` posts it. */
export interface WebVitalsSample {
  name: string;
  path: string;
  value: number;
  timestamp?: number;
}

/**
 * Nearest-rank percentile of a set of values.
 *
 * With `p = 75` and 4 samples, the answer is the 3rd smallest — the value at
 * or below which at least 75% of samples fall. Interpolating between two
 * samples would invent a measurement nobody made, and the web-vitals library
 * does not interpolate either.
 *
 * Returns `null` for no samples, and ignores non-finite values.
 */
export function percentile(values: number[], p: number): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const clamped = Math.min(Math.max(p, 0), 100);
  if (clamped === 0) return sorted[0];
  const rank = Math.ceil((clamped / 100) * sorted.length);
  return sorted[Math.min(Math.max(rank - 1, 0), sorted.length - 1)];
}

/**
 * p75 per metric per route.
 *
 * The result is `{ [path]: { [metricName]: p75 } }`. A route with no samples
 * for a metric is absent rather than zero — a zero would read as a perfect
 * score for a page nobody visited.
 */
export function p75ByRoute(samples: WebVitalsSample[]): Record<string, Record<string, number>> {
  const grouped: Record<string, Record<string, number[]>> = {};

  for (const sample of samples) {
    if (!sample || typeof sample.path !== "string" || !sample.path) continue;
    if (!Number.isFinite(sample.value)) continue;
    grouped[sample.path] ??= {};
    (grouped[sample.path][sample.name] ??= []).push(sample.value);
  }

  const out: Record<string, Record<string, number>> = {};
  for (const [path, metrics] of Object.entries(grouped)) {
    const route: Record<string, number> = {};
    for (const [name, values] of Object.entries(metrics)) {
      const p75 = percentile(values, 75);
      if (p75 !== null) route[name] = p75;
    }
    out[path] = route;
  }
  return out;
}
