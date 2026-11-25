import { describe, expect, it } from "vitest";

import {
  CLS_BUDGET,
  INP_BUDGET_MS,
  LCP_BUDGET_MS,
  TTFB_BUDGET_MS,
  budgetFor,
  withinBudget,
} from "@/lib/performanceBudgets";
import { p75ByRoute, percentile, type WebVitalsSample } from "@/lib/webVitalsAggregate";

// OBS-03's arithmetic: a dashboard is only useful if "p75 per route" is
// computed the way Core Web Vitals define it. These tests pin the nearest-rank
// rule and the grouping, including the cases that would otherwise report a
// zero for a route nobody visited.

describe("percentile", () => {
  it("returns the nearest-rank value, not an interpolation", () => {
    expect(percentile([100, 200, 300, 400], 75)).toBe(300);
  });

  it("handles a single sample and the extremes", () => {
    expect(percentile([42], 75)).toBe(42);
    expect(percentile([1, 2, 3], 0)).toBe(1);
    expect(percentile([1, 2, 3], 100)).toBe(3);
  });

  it("sorts before selecting, regardless of input order", () => {
    expect(percentile([900, 100, 500, 300], 50)).toBe(300);
  });

  it("returns null for no samples and ignores non-finite ones", () => {
    expect(percentile([], 75)).toBeNull();
    expect(percentile([Number.NaN, 10, Number.POSITIVE_INFINITY], 75)).toBe(10);
  });
});

describe("p75ByRoute", () => {
  const samples: WebVitalsSample[] = [
    { name: "LCP", path: "/dashboard/overview", value: 1000 },
    { name: "LCP", path: "/dashboard/overview", value: 2000 },
    { name: "LCP", path: "/dashboard/overview", value: 3000 },
    { name: "LCP", path: "/dashboard/overview", value: 4000 },
    { name: "CLS", path: "/dashboard/overview", value: 0.02 },
    { name: "LCP", path: "/dashboard/earnings", value: 5000 },
    { name: "CLS", path: "/login", value: 0 },
  ];

  it("groups by route and resolves each metric at p75", () => {
    const result = p75ByRoute(samples);
    expect(result["/dashboard/overview"].LCP).toBe(3000);
    expect(result["/dashboard/overview"].CLS).toBe(0.02);
    expect(result["/dashboard/earnings"].LCP).toBe(5000);
    expect(result["/login"].CLS).toBe(0);
  });

  it("omits a metric a route never reported, rather than reporting zero", () => {
    const result = p75ByRoute(samples);
    expect(result["/login"]).not.toHaveProperty("LCP");
    expect(result["/dashboard/earnings"]).not.toHaveProperty("CLS");
  });

  it("ignores malformed samples instead of throwing", () => {
    const result = p75ByRoute([
      { name: "LCP", path: "", value: 100 },
      { name: "LCP", path: "/a", value: Number.NaN },
      { name: "LCP", path: "/a", value: 800 },
    ] as WebVitalsSample[]);
    expect(result).toEqual({ "/a": { LCP: 800 } });
  });

  it("returns an empty object for no samples", () => {
    expect(p75ByRoute([])).toEqual({});
  });
});

describe("performance budgets", () => {
  it("uses the Core Web Vitals 'good' thresholds", () => {
    expect(CLS_BUDGET).toBe(0.1);
    expect(LCP_BUDGET_MS).toBe(2500);
    expect(INP_BUDGET_MS).toBe(200);
    expect(TTFB_BUDGET_MS).toBe(800);
  });

  it("judges FID against the INP budget, since FID was replaced by it", () => {
    expect(budgetFor("FID")).toBe(INP_BUDGET_MS);
  });

  it("treats the budget as inclusive and leaves unknown metrics unjudged", () => {
    expect(withinBudget("LCP", 2500)).toBe(true);
    expect(withinBudget("LCP", 2501)).toBe(false);
    expect(withinBudget("CLS", 0.1)).toBe(true);
    expect(withinBudget("CLS", 0.1001)).toBe(false);
    expect(withinBudget("CUSTOM", 999)).toBe(true);
  });
});
