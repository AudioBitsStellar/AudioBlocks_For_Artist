"use client";

/**
 * React Query access to the subgraph's on-chain plays and sales (#467), the
 * counterpart to `analyticsService.ts`'s backend REST reads.
 *
 * Two things here are deliberate:
 *  - the query is disabled unless both an endpoint and an artist address exist,
 *    so a deployment without a subgraph makes no request at all;
 *  - freshness is reported, not assumed. An indexer trails the chain, so the
 *    dashboard labels the numbers it can prove are old instead of presenting
 *    them as live (see docs/adr/0004-direct-horizon-reads-from-the-browser.md
 *    on keeping read-path staleness visible).
 */

import { useQuery } from "@tanstack/react-query";
import { DASHBOARD_CACHE, DASHBOARD_QUERY_KEYS } from "@/api/cachePolicy";
import { fetchArtistOnchainStats, isSubgraphConfigured } from "@/lib/subgraph";

/** An indexer that hasn't produced a block in this long is treated as lagging. */
export const INDEXER_STALE_AFTER_MS = 30 * 60 * 1000;

/** True when the indexed data we have is too old to be presented as current. */
export function isIndexerStale(indexedAt: number | null, now: number = Date.now()): boolean {
  if (indexedAt === null) return false;
  return now - indexedAt > INDEXER_STALE_AFTER_MS;
}

/** Whole minutes the indexer sits behind its own reported block time. */
export function indexerLagMinutes(indexedAt: number, now: number = Date.now()): number {
  return Math.max(0, Math.round((now - indexedAt) / 60_000));
}

export type OnchainStatsPeriod = 30 | 90;

const useOnchainAnalyticsService = () => {
  /**
   * `artistAddress` is the artist's Stellar public key — the id the indexer
   * files events under. Pass `null` while it is still resolving.
   */
  const useGetOnchainStats = (artistAddress: string | null, period: OnchainStatsPeriod = 30) => {
    const enabled = Boolean(artistAddress) && isSubgraphConfigured();

    const query = useQuery({
      queryKey: [...DASHBOARD_QUERY_KEYS.onchainStats, artistAddress, period],
      queryFn: () => fetchArtistOnchainStats(artistAddress as string, period),
      enabled,
      staleTime: DASHBOARD_CACHE.onchainStats,
      // One attempt is enough: this feeds an optional, supplementary panel, and
      // a retry loop would just delay the "on-chain data unavailable" state.
      retry: false,
    });

    return {
      ...query,
      isStaleData: isIndexerStale(query.data?.indexedAt ?? null),
      isConfigured: enabled,
    };
  };

  return { useGetOnchainStats };
};

export default useOnchainAnalyticsService;
