import { createApiClient } from "@/api/axios";
import type { IndexedEvent, Pagination } from "@/types/generated/api";

export type IndexedActivity = IndexedEvent;

export interface IndexedActivityResponse {
  success: boolean;
  data: IndexedActivity[];
  pagination: Pagination;
}

export interface ArtistOnchainStats {
  daily: { day: string; plays: number; sales: number; amount: number }[];
  totalPlays: number | null;
  totalSales: number | null;
  totalAmount: number | null;
  indexedBlock: number | null;
  indexedAt: number | null;
  eventCount?: number;
  isMock?: boolean;
}

export function isIndexerConfigured(): boolean {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api");
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * The backend address filter selects event participants, not token owners.
 * Never turn this response into artist play/sale totals. Ownership aggregates
 * are tracked in the linked backend follow-up.
 */
export async function fetchIndexedActivity(address: string): Promise<IndexedActivity[]> {
  if (!address.trim()) throw new Error("An account address is required");
  const client = await createApiClient();
  const events = new Map<string, IndexedActivity>();
  for (let page = 1; ; page += 1) {
    const response = await client.get<IndexedActivityResponse>("/activity/onchain", {
      params: { address, page, limit: 100 },
    });
    const body = response.data;
    const totalPages = body.pagination?.totalPages;
    if (
      !body.success ||
      !Array.isArray(body.data) ||
      typeof totalPages !== "number" ||
      !Number.isInteger(totalPages) ||
      totalPages < 0
    ) {
      throw new Error("Invalid indexer response");
    }
    for (const event of body.data) {
      if (event.id && event.eventType && event.address === address) events.set(event.id, event);
    }
    if (page >= totalPages) return [...events.values()];
    if (body.data.length === 0 || page >= 1000) {
      throw new Error("Indexer history is incomplete; aggregate endpoint required");
    }
  }
}

export async function fetchArtistOnchainStats(
  address: string,
  days: number
): Promise<ArtistOnchainStats> {
  if (featureFlags.useMockOnChainStats) {
    return {
      daily: [{ day: new Date().toISOString().slice(0, 10), plays: 12, sales: 2, amount: 40.5 }],
      totalPlays: 12,
      totalSales: 2,
      totalAmount: 40.5,
      indexedBlock: null,
      indexedAt: null,
      isMock: true,
    };
  }
  const cutoff = Date.now() - days * 86_400_000;
  const events = (await fetchIndexedActivity(address)).filter(
    (event) => Date.parse(event.createdAt ?? "") >= cutoff
  );
  return {
    daily: [],
    totalPlays: null,
    totalSales: null,
    totalAmount: null,
    // Last account activity is not an indexer heartbeat or cursor.
    indexedBlock: null,
    indexedAt: null,
    eventCount: events.length,
  };
}
