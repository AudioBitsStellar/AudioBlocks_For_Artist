# ADR-0001: Use TanStack React Query for server state

## Status

Accepted.

## Context

Nearly every screen in the dashboard (overview KPIs, earnings, merch,
events, on-chain mutations) needs to fetch data from
[`AudioBlock_Backend`](https://github.com/AudioBitsStellar/AudioBlock_Backend)
and keep it in sync with user actions — caching, retrying transient
failures, invalidating stale data after a mutation, and surfacing
loading/error state consistently across dozens of independent components.
Hand-rolling this per component (raw `fetch`/axios calls in `useEffect`,
component-local `isLoading`/`error` state) does not scale past a handful of
screens: retry/backoff logic, cache invalidation, and race-condition
handling (a slow request resolving after a newer one) end up duplicated and
inconsistently implemented everywhere they're needed.

## Decision

Use [TanStack React Query](https://tanstack.com/query) as the single data
layer for everything that comes from the backend, wrapped by two generic
hook factories in `src/api/queryClient.ts` — `useGet` and `usePost` — built
on top of the shared axios instance in `src/api/axios.ts`. Every
per-feature service (`src/services/*.ts`, e.g. `onchainService.ts`,
`uploadSerive.ts`) is a thin hook that calls `useGet`/`usePost` with an
endpoint from `src/api/api-endpoint.ts` plus typed request/response shapes
from `src/types/api.ts`, rather than talking to axios directly.

A single `QueryClient` is created once in `src/context/provider.tsx` and
provided at the root of the app via `QueryClientProvider`, with shared
defaults (retry policy that skips 4xx, 5-minute `staleTime`,
`refetchOnReconnect`) rather than each call site configuring its own.

## Consequences

- New data-fetching code gets caching, retry, and invalidation for free by
  calling `useGet`/`usePost` — no bespoke loading-state plumbing per
  component.
- Mutations (uploads, on-chain prepare/submit, merch/event CRUD) get a
  consistent `isPending`/`isError`/`mutateAsync` shape everywhere, which is
  also what the test suite mocks against (see `onchainService.test.ts`).
- Adds a hard dependency on `@tanstack/react-query` and the convention that
  server state never lives in plain `useState` — new contributors need to
  learn that pattern rather than reaching for `useEffect` + `fetch`.
- Client-only reads that bypass the backend entirely — the Horizon calls in
  `src/lib/horizon.ts` — intentionally do **not** go through this layer; see
  [ADR-0004](0004-direct-horizon-reads-from-the-browser.md).
