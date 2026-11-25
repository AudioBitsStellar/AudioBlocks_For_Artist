/**
 * The frontend performance budgets (PERF-07, OBS-03).
 *
 * One definition, read by the tests that pin it and quoted by the alert rules
 * in `docs/observability/ALERTS.md`. A budget that lives only in prose drifts;
 * a budget with a constant beside the reporter is one number.
 *
 * The values are the "good" thresholds from web.dev's Core Web Vitals, which
 * are what a p75 measurement is compared against: half of a session's users
 * should be inside them.
 */

import type { Metric } from "web-vitals";

/** Layout shift allowed at p75. Anything above 0.1 reads as a jump. */
export const CLS_BUDGET = 0.1;

/** Largest Contentful Paint allowed at p75, in milliseconds. */
export const LCP_BUDGET_MS = 2500;

/** Interaction to Next Paint allowed at p75, in milliseconds. */
export const INP_BUDGET_MS = 200;

/** Time to First Byte allowed at p75, in milliseconds. */
export const TTFB_BUDGET_MS = 800;

/** The budget for a metric name, or undefined for a metric with none. */
export function budgetFor(name: Metric["name"] | string): number | undefined {
  switch (name) {
    case "CLS":
      return CLS_BUDGET;
    case "LCP":
      return LCP_BUDGET_MS;
    case "INP":
    case "FID":
      // FID was replaced by INP; either name is measured against INP's budget.
      return INP_BUDGET_MS;
    case "TTFB":
      return TTFB_BUDGET_MS;
    default:
      return undefined;
  }
}

/** True when a measurement is inside its budget. Unknown metrics are not judged. */
export function withinBudget(name: Metric["name"] | string, value: number): boolean {
  const budget = budgetFor(name);
  return budget === undefined ? true : value <= budget;
}
