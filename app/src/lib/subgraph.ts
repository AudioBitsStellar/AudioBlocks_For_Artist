/**
 * Minimal subgraph client for the Artist Portal's on-chain plays and sales
 * (#467).
 *
 * The subgraph indexes the Soroban events this app already produces —
 * `catalog.mint_song` / `transfer_song` sales and the royalty `distribute`
 * payouts they trigger (see `src/services/onchainService.ts` and
 * docs/ROYALTY_CONTRACT_DESIGN.md) — into daily per-artist rollups, which is
 * the read the analytics dashboard needs and the reason we don't walk history
 * from Horizon here (see docs/adr/0004-direct-horizon-reads-from-the-browser.md
 * for the Horizon-based reads that stay in `src/lib/horizon.ts`).
 *
 * Like `horizon.ts` this is dependency-free and runs in the browser against a
 * public endpoint, so it bypasses `src/api/axios.ts` — that client is bound to
 * `AudioBlock_Backend`'s base URL and auth headers, neither of which applies
 * to a third-party indexer.
 *
 * The endpoint is optional: with `NEXT_PUBLIC_SUBGRAPH_URL` unset the whole
 * on-chain surface is simply switched off rather than failing.
 */

const REQUEST_TIMEOUT_MS = 8_000;

/** The Graph's `BigInt` scalar arrives as a string, as do Soroban i128 amounts. */
type StringNumber = string;

interface SubgraphResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

interface RawDailyStats {
  /** `YYYY-MM-DD`, the start of the indexed day in UTC. */
  day: string;
  plays: StringNumber;
  sales: StringNumber;
  /** Sale proceeds as The Graph's `BigDecimal` scalar, already in whole XLM. */
  amount: StringNumber;
}

interface RawArtistOnchainStats {
  _meta?: { block?: { number?: number; timestamp?: number } };
  /**
   * `artistDailyStats` is the rollup entity the deployment exposes, filtered
   * to the artist and the requested window. An artist with no indexed activity
   * yet comes back as an empty list, not an error.
   */
  artistDailyStats?: RawDailyStats[];
}

/** Daily on-chain activity for one artist, oldest first, numbers already parsed. */
export interface OnchainDailyStat {
  day: string;
  plays: number;
  sales: number;
  amount: number;
}

/** The window totals the analytics dashboard renders, plus how current they are. */
export interface ArtistOnchainStats {
  daily: OnchainDailyStat[];
  totalPlays: number;
  totalSales: number;
  /** Sum of `amount` across the window, in whole XLM. */
  totalAmount: number;
  /** Block height the indexer reached, or `null` if `_meta` was absent. */
  indexedBlock: number | null;
  /** Unix ms of that block, or `null` if the deployment doesn't expose timestamps. */
  indexedAt: number | null;
}

/** Artist Portal GraphQL operations. Kept as plain strings to stay dependency-free. */
const ARTIST_ONCHAIN_STATS_QUERY = `
  query ArtistOnchainStats($artist: String!, $since: String!) {
    _meta {
      block {
        number
        timestamp
      }
    }
    artistDailyStats(
      where: { artist: $artist, day_gte: $since }
      orderBy: day
      orderDirection: asc
    ) {
      day
      plays
      sales
      amount
    }
  }
`;

/** Resolved per call (not at module load) so a test can vary `process.env`. */
export function subgraphUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUBGRAPH_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/** False when unset or malformed, so a bad URL degrades the UI instead of throwing at import. */
export function isSubgraphConfigured(): boolean {
  const url = subgraphUrl();
  if (!url) return false;
  try {
    return new URL(url).protocol === "https:" || new URL(url).protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Runs one GraphQL document against the configured subgraph and returns its
 * `data`. Rejects with a plain `Error` carrying either the HTTP status or the
 * first GraphQL message — callers decide how to degrade.
 */
export async function querySubgraph<T>(
  document: string,
  variables: Record<string, string | number>
): Promise<T> {
  const url = subgraphUrl();
  if (!url) throw new Error("No subgraph endpoint configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: document, variables }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Subgraph returned ${res.status}`);
    }

    const body = (await res.json()) as SubgraphResponse<T>;
    if (body.errors?.length) {
      throw new Error(`Subgraph error: ${body.errors[0].message}`);
    }
    if (!body.data) {
      throw new Error("Subgraph returned no data");
    }
    return body.data;
  } catch (error) {
    // Browsers reject the aborted fetch with a DOMException named "AbortError";
    // a stubbed fetch in tests may throw a plain Error with the same name.
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Subgraph request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function toCount(value: StringNumber | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** The UTC `YYYY-MM-DD` that opens a window of `days` days ending at `now`. */
export function windowStartDay(days: number, now: Date = new Date()): string {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return new Date(cutoff).toISOString().split("T")[0];
}

/**
 * Fetches the artist's indexed plays and sales for the last `days` days.
 * An artist with no indexed activity resolves to zeroed totals rather than an
 * error, so a new artist's dashboard stays quiet instead of showing a failure.
 */
export async function fetchArtistOnchainStats(
  artistAddress: string,
  days: number
): Promise<ArtistOnchainStats> {
  const data = await querySubgraph<RawArtistOnchainStats>(ARTIST_ONCHAIN_STATS_QUERY, {
    artist: artistAddress,
    since: windowStartDay(days),
  });

  const daily: OnchainDailyStat[] = (data.artistDailyStats ?? []).map((entry) => ({
    day: entry.day,
    plays: toCount(entry.plays),
    sales: toCount(entry.sales),
    amount: toCount(entry.amount),
  }));

  const block = data._meta?.block;

  return {
    daily,
    totalPlays: daily.reduce((sum, entry) => sum + entry.plays, 0),
    totalSales: daily.reduce((sum, entry) => sum + entry.sales, 0),
    totalAmount: daily.reduce((sum, entry) => sum + entry.amount, 0),
    indexedBlock: typeof block?.number === "number" ? block.number : null,
    indexedAt: typeof block?.timestamp === "number" ? block.timestamp * 1000 : null,
  };
}
