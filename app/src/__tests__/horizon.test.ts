import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  estimateOperationFeeXlm,
  explorerTxUrl,
  fetchAccountBalances,
  fetchAccountTransactions,
  fetchFeeStats,
  fetchXlmBalance,
} from "@/lib/horizon";

const RPC_URL = "https://horizon-testnet.stellar.org";
const ADDRESS = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQR";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("lib/horizon", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL = RPC_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  describe("fetchAccountBalances / fetchXlmBalance", () => {
    it("returns balances for a funded account", async () => {
      mockFetchOnce({
        id: ADDRESS,
        balances: [{ asset_type: "native", balance: "42.5000000" }],
      });

      const balances = await fetchAccountBalances(ADDRESS);
      expect(balances).toEqual([{ asset_type: "native", balance: "42.5000000" }]);

      const xlm = await (async () => {
        mockFetchOnce({
          id: ADDRESS,
          balances: [{ asset_type: "native", balance: "42.5000000" }],
        });
        return fetchXlmBalance(ADDRESS);
      })();
      expect(xlm).toBe("42.5000000");
    });

    it("returns null balances (and \"0\" xlm) for an unfunded account (404)", async () => {
      mockFetchOnce(null, false, 404);
      const balances = await fetchAccountBalances(ADDRESS);
      expect(balances).toBeNull();

      mockFetchOnce(null, false, 404);
      const xlm = await fetchXlmBalance(ADDRESS);
      expect(xlm).toBe("0");
    });

    it("throws on a non-404 Horizon error", async () => {
      mockFetchOnce(null, false, 500);
      await expect(fetchAccountBalances(ADDRESS)).rejects.toThrow(/500/);
    });
  });

  describe("fetchAccountTransactions", () => {
    it("returns the embedded transaction records", async () => {
      const record = { id: "1", hash: "abc", successful: true };
      mockFetchOnce({ _embedded: { records: [record] } });

      const txs = await fetchAccountTransactions(ADDRESS, 5);
      expect(txs).toEqual([record]);
    });

    it("returns an empty array for an unfunded account (404)", async () => {
      mockFetchOnce(null, false, 404);
      const txs = await fetchAccountTransactions(ADDRESS);
      expect(txs).toEqual([]);
    });
  });

  describe("explorerTxUrl", () => {
    it("links to the testnet explorer when the passphrase mentions Test", () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
      expect(explorerTxUrl("HASH123")).toBe(
        "https://stellar.expert/explorer/testnet/tx/HASH123"
      );
    });

    it("links to the public explorer otherwise", () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE =
        "Public Global Stellar Network ; September 2015";
      expect(explorerTxUrl("HASH123")).toBe("https://stellar.expert/explorer/public/tx/HASH123");
    });
  });

  describe("fetchFeeStats / estimateOperationFeeXlm (#289)", () => {
    it("fetches Horizon's fee_stats", async () => {
      const stats = { fee_charged: { min: "100", mode: "100", p50: "100", p95: "500", max: "1000" } };
      const fetchMock = mockFetchOnce(stats);

      const result = await fetchFeeStats();

      expect(result).toEqual(stats);
      expect(fetchMock).toHaveBeenCalledWith(`${RPC_URL}/fee_stats`);
    });

    it("converts the p50 per-operation stroop fee into an XLM estimate", async () => {
      mockFetchOnce({
        fee_charged: { min: "100", mode: "100", p50: "500000", p95: "900000", max: "1000000" },
      });

      const estimate = await estimateOperationFeeXlm();

      // 500,000 stroops / 10,000,000 stroops-per-XLM = 0.05 XLM
      expect(estimate).toBe("~0.05 XLM");
    });

    it("scales the estimate by operation count", async () => {
      mockFetchOnce({
        fee_charged: { min: "100", mode: "100", p50: "100", p95: "500", max: "1000" },
      });

      const estimate = await estimateOperationFeeXlm(3);

      // 100 stroops * 3 ops / 10,000,000 = 0.00003 XLM
      expect(estimate).toBe("~0.00003 XLM");
    });

    it("throws when Horizon returns a non-numeric fee", async () => {
      mockFetchOnce({ fee_charged: { min: "0", mode: "0", p50: "not-a-number", p95: "0", max: "0" } });

      await expect(estimateOperationFeeXlm()).rejects.toThrow(/invalid fee estimate/i);
    });

    it("propagates a Horizon error status", async () => {
      mockFetchOnce(null, false, 503);
      await expect(fetchFeeStats()).rejects.toThrow(/503/);
    });
  });
});
