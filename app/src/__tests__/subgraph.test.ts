import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  fetchArtistOnchainStats,
  isSubgraphConfigured,
  querySubgraph,
  subgraphUrl,
  windowStartDay,
} from "@/lib/subgraph";

const SUBGRAPH_URL = "https://api.thegraph.com/subgraphs/name/audioblocks/artist-portal";

function mockSubgraphFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("lib/subgraph", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUBGRAPH_URL = SUBGRAPH_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  describe("endpoint resolution", () => {
    it("strips a trailing slash so the POST target stays canonical", () => {
      process.env.NEXT_PUBLIC_SUBGRAPH_URL = `${SUBGRAPH_URL}/`;
      expect(subgraphUrl()).toBe(SUBGRAPH_URL);
    });

    it("treats an unset or whitespace-only URL as no endpoint", () => {
      process.env.NEXT_PUBLIC_SUBGRAPH_URL = "   ";
      expect(subgraphUrl()).toBeNull();
      delete process.env.NEXT_PUBLIC_SUBGRAPH_URL;
      expect(subgraphUrl()).toBeNull();
    });

    it("accepts http and https but rejects a malformed URL", () => {
      process.env.NEXT_PUBLIC_SUBGRAPH_URL = "http://localhost:8000/graphql";
      expect(isSubgraphConfigured()).toBe(true);

      process.env.NEXT_PUBLIC_SUBGRAPH_URL = "not a url";
      expect(isSubgraphConfigured()).toBe(false);

      delete process.env.NEXT_PUBLIC_SUBGRAPH_URL;
      expect(isSubgraphConfigured()).toBe(false);
    });
  });

  describe("querySubgraph", () => {
    it("POSTs the document and variables and resolves the data payload", async () => {
      const fetchMock = mockSubgraphFetch({ data: { artist: { id: "GABC" } } });

      const data = await querySubgraph<{ artist: { id: string } }>(
        "query Artist { artist { id } }",
        {
          id: "GABC",
        }
      );

      expect(data).toEqual({ artist: { id: "GABC" } });
      const [url, init] = (fetchMock as Mock).mock.calls[0];
      expect(url).toBe(SUBGRAPH_URL);
      expect(init.method).toBe("POST");
      expect(init.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(init.body)).toEqual({
        query: "query Artist { artist { id } }",
        variables: { id: "GABC" },
      });
    });

    it("makes no request at all when no endpoint is configured", async () => {
      const fetchMock = mockSubgraphFetch({ data: {} });
      delete process.env.NEXT_PUBLIC_SUBGRAPH_URL;

      await expect(querySubgraph("query { x }", {})).rejects.toThrow(/No subgraph endpoint/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("surfaces the HTTP status for a transport failure", async () => {
      mockSubgraphFetch({ error: "unavailable" }, false, 503);
      await expect(querySubgraph("query { x }", {})).rejects.toThrow(/Subgraph returned 503/);
    });

    it("surfaces the first GraphQL error message", async () => {
      mockSubgraphFetch({
        errors: [{ message: "Failed to resolve artistDailyStats" }, { message: "second" }],
      });
      await expect(querySubgraph("query { x }", {})).rejects.toThrow(
        /Failed to resolve artistDailyStats/
      );
    });

    it("rejects a response that carries neither data nor errors", async () => {
      mockSubgraphFetch({ data: null });
      await expect(querySubgraph("query { x }", {})).rejects.toThrow(/returned no data/);
    });

    it("turns an aborted request into a timeout message", async () => {
      const aborted = new Error("The user aborted a request.");
      aborted.name = "AbortError";
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));

      await expect(querySubgraph("query { x }", {})).rejects.toThrow(/timed out after 8000ms/);
    });
  });

  describe("windowStartDay", () => {
    it("returns the UTC date that opens the window", () => {
      expect(windowStartDay(30, new Date("2026-09-27T10:00:00Z"))).toBe("2026-08-28");
      expect(windowStartDay(90, new Date("2026-09-27T00:00:00Z"))).toBe("2026-06-29");
    });

    it("keeps the day boundary in UTC regardless of the local timezone", () => {
      // 2026-09-27T02:00 in UTC+05:30 is still 2026-09-26T20:30 UTC.
      const now = new Date("2026-09-26T20:30:00Z");
      expect(windowStartDay(0, now)).toBe("2026-09-26");
    });
  });

  describe("fetchArtistOnchainStats", () => {
    it("sums the daily rollups and reports the indexed block", async () => {
      mockSubgraphFetch({
        data: {
          _meta: { block: { number: 4_812_345, timestamp: 1_759_000_000 } },
          artistDailyStats: [
            { day: "2026-09-01", plays: "12", sales: "2", amount: "40.5" },
            { day: "2026-09-02", plays: "30", sales: "1", amount: "9.5" },
          ],
        },
      });

      const stats = await fetchArtistOnchainStats("GABC", 30);

      expect(stats.daily).toEqual([
        { day: "2026-09-01", plays: 12, sales: 2, amount: 40.5 },
        { day: "2026-09-02", plays: 30, sales: 1, amount: 9.5 },
      ]);
      expect(stats.totalPlays).toBe(42);
      expect(stats.totalSales).toBe(3);
      expect(stats.totalAmount).toBe(50);
      expect(stats.indexedBlock).toBe(4_812_345);
      // The subgraph reports the block time in seconds; the UI compares against Date.now().
      expect(stats.indexedAt).toBe(1_759_000_000_000);
    });

    it("asks for the artist's rollups inside the requested window, oldest first", async () => {
      const fetchMock = mockSubgraphFetch({ data: { artistDailyStats: [] } });

      await fetchArtistOnchainStats("GABC", 90);

      const [, init] = (fetchMock as Mock).mock.calls[0];
      const { query, variables } = JSON.parse(init.body);
      expect(variables).toEqual({ artist: "GABC", since: windowStartDay(90) });
      expect(query).toContain("artistDailyStats(");
      expect(query).toContain("day_gte: $since");
      expect(query).toContain("orderBy: day");
      expect(query).toContain("orderDirection: asc");
    });

    it("resolves an artist with no indexed activity to zeroed totals", async () => {
      mockSubgraphFetch({ data: { artistDailyStats: [] } });

      const stats = await fetchArtistOnchainStats("GABC", 30);

      expect(stats).toMatchObject({
        daily: [],
        totalPlays: 0,
        totalSales: 0,
        totalAmount: 0,
        indexedBlock: null,
        indexedAt: null,
      });
    });

    it("drops unparseable scalar values instead of poisoning the totals with NaN", async () => {
      mockSubgraphFetch({
        data: {
          artistDailyStats: [
            { day: "2026-09-01", plays: "not-a-number", sales: "-3", amount: "12" },
            { day: "2026-09-02", plays: "5", amount: "8" },
          ],
        },
      });

      const stats = await fetchArtistOnchainStats("GABC", 30);

      expect(stats.daily[0]).toMatchObject({ plays: 0, sales: 0, amount: 12 });
      expect(stats.daily[1].sales).toBe(0);
      expect(stats.totalPlays).toBe(5);
      expect(stats.totalAmount).toBe(20);
    });
  });
});
