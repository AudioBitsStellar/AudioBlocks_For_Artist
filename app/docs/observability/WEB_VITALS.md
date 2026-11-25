# Web Vitals: what is measured, and the p75 dashboard

Launch-readiness item `OBS-03`.

## What is collected

`src/components/WebVitalsReporter.tsx` is mounted once in the root layout and
registers LCP, CLS, TTFB and FID from `web-vitals`. Each metric goes to
`reportWebVitals` (`src/lib/webVitals.ts`), which posts this payload:

```json
{
  "name": "LCP",
  "value": 1204.5,
  "delta": 1204.5,
  "id": "v3-1728800000000-123456",
  "rating": "good",
  "navigationType": "navigate",
  "path": "/dashboard/overview",
  "timestamp": 1728800000000
}
```

`path` is what makes a per-route dashboard possible. It is the browser's
`location.pathname` at report time, so dynamic segments (`/songs/[id]`) arrive
as concrete paths and must be folded to their route pattern by the collector
before grouping.

Delivery is `navigator.sendBeacon` where available (it survives unload) and
`fetch(..., { keepalive: true })` otherwise, to
`NEXT_PUBLIC_WEB_VITALS_ENDPOINT`. With no endpoint configured — local
development, or a deployment that has not set the variable — the metric is
logged instead; that is the intended fallback, not a failure.

## Budgets

`src/lib/performanceBudgets.ts` is the single definition:

| Metric                                | p75 budget |
| :------------------------------------ | :--------- |
| CLS                                   | 0.1        |
| LCP                                   | 2500 ms    |
| INP (and the FID samples it replaces) | 200 ms     |
| TTFB                                  | 800 ms     |

`docs/observability/ALERTS.md` rules A6 and A7 alert on LCP p75 > 2500 ms and
CLS p75 > 0.1, using these same constants. Change one, change both.

## The dashboard

One widget, grouped by route:

- **What it shows.** A table of route × metric, each cell the p75 for the
  selected window (default 24 h, options 24 h / 7 d / 28 d), colour-coded
  green/amber/red by `withinBudget`. The headline row is the site-wide p75 for
  LCP, CLS and INP.
- **How it is computed.** `p75ByRoute` in `src/lib/webVitalsAggregate.ts`. It
  uses nearest-rank percentiles — the value at or below which 75% of samples
  fall — rather than an average or an interpolated percentile, because those
  are the definitions the budgets and the alert rules rely on. A route with no
  samples is absent, never zero.
- **Where the data lives.** Whatever receives
  `NEXT_PUBLIC_WEB_VITALS_ENDPOINT`. The endpoint should store the raw sample
  and expose the aggregate; it must not store only the average, because the
  average cannot be turned back into a p75.
- **What it is not.** It does not show per-user or per-session data, and it is
  not a substitute for a lab measurement: a p75 over real sessions says what
  users experienced, not what a regression test would have caught.

`src/__tests__/webVitalsAggregate.test.ts` pins the percentile rule, the
grouping, the omission of unreported metrics and the budget boundaries.
