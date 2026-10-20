import { createApiClient } from "@/api/axios";
import { getActiveNetworkId } from "@/lib/stellarNetwork";

export interface IndexedActivity {
  id: string;
  address?: string;
  contractId?: string;
  contractType?: string;
  eventType: string;
  txHash?: string;
  ledger?: number;
  network: string;
  createdAt: string;
  payload?: Record<string, unknown>;
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
  const network = getActiveNetworkId() === "testnet" ? "stellar-testnet" : "stellar-mainnet";
  for (let page = 1; ; page += 1) {
    const response = await client.get<{
      success: boolean;
      data: IndexedActivity[];
      pagination: { totalPages: number };
    }>("/activity/onchain", { params: { address, page, limit: 100 } });
    const body = response.data;
    if (
      !body.success ||
      !Array.isArray(body.data) ||
      !Number.isInteger(body.pagination?.totalPages) ||
      body.pagination.totalPages < 0
    ) {
      throw new Error("Invalid indexer response");
    }
    for (const event of body.data) {
      // Defend against a server ignoring filters; never mix accounts/networks.
      if (
        event.address === address &&
        [network, network.replace("stellar-", "")].includes(event.network)
      )
        events.set(event.id, event);
    }
    if (page >= body.pagination.totalPages) return [...events.values()];
    if (body.data.length === 0 || page >= 1000) {
      throw new Error("Indexer history is incomplete; aggregate endpoint required");
    }
  }
}

export async function fetchArtistOnchainStats(
  address: string,
  days: number
): Promise<ArtistOnchainStats> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
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
    (event) => Date.parse(event.createdAt) >= cutoff
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
