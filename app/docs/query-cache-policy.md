# React Query cache policy

Launch-readiness item `PERF-05`. One file decides freshness per data type, and
this page says what the decision is, so a screen can be reasoned about without
reading every service.

## Defaults

`src/api/queryClientInstance.ts` sets the fallback for any query that does not
choose a tier:

| Option                 | Value                     | Why                                                                                                                  |
| :--------------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------- |
| `staleTime`            | `CACHE_TIME.LONG` (5 min) | The slowest-moving data is the safe default; a fast-moving screen overrides it with its own tier.                    |
| `gcTime`               | 10 min                    | An unused query survives a few navigations, then is dropped.                                                         |
| `refetchOnWindowFocus` | `false`                   | Switching tabs is not a reason to spend a request. `refetchOnReconnect` stays on, because regaining a connection is. |
| `retry` (queries)      | 3, but never for 4xx      | A 400/401/404 will not succeed on a second try; a 5xx or a network drop might.                                       |
| `retry` (mutations)    | 0                         | A retried write can duplicate a charge or an upload.                                                                 |

## Tiers

`src/api/cachePolicy.ts` names four windows — `NONE` (0), `SHORT` (1 min),
`MEDIUM` (2 min), `LONG` (5 min) — and assigns each dashboard resource one:

| Tier     | Resources                                                                | Reasoning                                                             |
| :------- | :----------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `NONE`   | profile                                                                  | Editable from another device or tab; a stale profile is a wrong form. |
| `SHORT`  | overview, analytics, transactions, comments, notifications, merch orders | Changes while the artist is looking at it.                            |
| `MEDIUM` | recent activity, albums, fans engagement, events, merch                  | Changes occasionally; a two-minute-old list is still useful.          |
| `LONG`   | statistics, earnings, platform revenue, on-chain stats                   | Slow-moving aggregates, and the indexer trails the chain anyway.      |

Services pass `staleTime: DASHBOARD_CACHE.<resource>` rather than a number, so
the table above is the only place a window is chosen.

## Invalidation

A mutation invalidates the query keys its change touches:
`SONG_PUBLISHED_INVALIDATIONS` and `ALBUM_PUBLISHED_INVALIDATIONS` list them,
and `DASHBOARD_QUERY_KEYS` is where the keys live. Prefix matching is what lets
`analytics` cover every `[..., period]` variant.

Signing in as a different artist calls `clearQueryCache()`, so one artist's
earnings can never be served to the next.

## How this is enforced

`src/__tests__/cachePolicy.test.tsx` pins the tier values, the client defaults,
the retry rule (4xx no, 5xx up to three), that every dashboard resource uses a
named tier, that service keys match the policy, and that a song or album
publication invalidates the summaries it changes. Add a resource to
`DASHBOARD_CACHE` only with a tier and a line in the table above.
