import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchArtistOnchainStats, fetchIndexedActivity } from "@/lib/onchainIndexer";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/api/axios", () => ({ createApiClient: async () => ({ get }) }));
vi.mock("@/lib/stellarNetwork", () => ({ getActiveNetworkId: () => "testnet" }));
const event = {
  id: "1",
  address: "GARTIST",
  eventType: "song_played",
  network: "stellar-testnet",
  createdAt: new Date().toISOString(),
};
beforeEach(() => {
  get.mockReset();
  vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "false");
});
afterEach(() => vi.unstubAllEnvs());
describe("Soroban indexer", () => {
  it("paginates and excludes other participants and networks", async () => {
    get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [event, { ...event, id: "other", address: "GOTHER" }],
        pagination: { totalPages: 2 },
      },
    });
    get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { ...event, id: "2" },
          { ...event, id: "public", network: "stellar-mainnet" },
        ],
        pagination: { totalPages: 2 },
      },
    });
    expect((await fetchIndexedActivity("GARTIST")).map((row) => row.id)).toEqual(["1", "2"]);
    expect(get).toHaveBeenLastCalledWith("/activity/onchain", {
      params: { address: "GARTIST", page: 2, limit: 100 },
    });
  });
  it("does not attribute listener events or buyer sales to artist totals", async () => {
    get.mockResolvedValue({
      data: { success: true, data: [event], pagination: { totalPages: 1 } },
    });
    expect(await fetchArtistOnchainStats("GARTIST", 30)).toMatchObject({
      totalPlays: null,
      totalSales: null,
      totalAmount: null,
      indexedAt: null,
      eventCount: 1,
    });
  });
  it("rejects malformed or failed responses instead of presenting zero", async () => {
    get.mockResolvedValue({ data: { success: false, data: [] } });
    await expect(fetchIndexedActivity("GARTIST")).rejects.toThrow("Invalid indexer response");
  });
  it("keeps explicit mock mode offline", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "true");
    expect(await fetchArtistOnchainStats("GARTIST", 30)).toMatchObject({
      isMock: true,
      totalPlays: 12,
    });
    expect(get).not.toHaveBeenCalled();
  });
});
