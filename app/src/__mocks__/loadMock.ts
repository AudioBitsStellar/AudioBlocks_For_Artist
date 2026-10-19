/**
 * The one way production code reaches mock data.
 *
 * Every fixture lives in a per-domain module next to this file and is only
 * ever pulled in through a dynamic `import()` below, so the bundler splits it
 * into its own chunk: a build with mock mode off never downloads fake names,
 * prices or stats, and a screen that still depends on mocks is easy to spot by
 * grepping for `loadMock`/`useMock`.
 *
 * Gate every call on the surface's `featureFlags.useMock*` flag:
 *
 *   const mocks = useMock("merch", featureFlags.useMockMerches);
 *   const items = mocks ? mocks.MOCK_MERCH_ITEMS : (data?.items ?? []);
 *
 * Outside React (services, event handlers) use `await loadMock("events")`.
 * Tests can import fixtures from the domain modules directly.
 */

import { useEffect, useState } from "react";

const loaders = {
  albums: () => import("./albums"),
  events: () => import("./events"),
  fansEngagement: () => import("./fansEngagement"),
  merch: () => import("./merch"),
  messages: () => import("./messages"),
  notifications: () => import("./notifications"),
  onchainStats: () => import("./onchainStats"),
  overview: () => import("./overview"),
  qualityChecks: () => import("./qualityChecks"),
};

export type MockDomain = keyof typeof loaders;
export type MockModule<D extends MockDomain> = Awaited<ReturnType<(typeof loaders)[D]>>;

/** Loads a domain's fixtures. Call it only when that domain's mock flag is on. */
export function loadMock<D extends MockDomain>(domain: D): Promise<MockModule<D>> {
  return loaders[domain]() as Promise<MockModule<D>>;
}

/**
 * A domain's fixtures once loaded, `null` while loading or when `enabled` is
 * false — in which case nothing is fetched at all.
 */
export function useMock<D extends MockDomain>(domain: D, enabled = true): MockModule<D> | null {
  const [loaded, setLoaded] = useState<{ domain: D; module: MockModule<D> } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadMock(domain).then((module) => {
      if (!cancelled) setLoaded({ domain, module });
    });
    return () => {
      cancelled = true;
    };
  }, [domain, enabled]);

  return enabled && loaded?.domain === domain ? loaded.module : null;
}
