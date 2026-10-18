import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const flags = vi.hoisted(() => ({ useMockOnChainStats: false }));
vi.mock("@/lib/featureFlags", () => ({ featureFlags: flags }));

const wallet = vi.hoisted(() => ({ address: null as string | null }));
vi.mock("@/components/common/wallet/useStellarWallet", () => ({
  useStellarWallet: () => ({ address: wallet.address }),
}));

import {
  MOCK_ONCHAIN_SUMMARY,
  countByOperationType,
  dayOf,
  formatAmount,
  heldAssetsFrom,
  humanizeOperationType,
  shareOfOperations,
  summarizeOnChainActivity,
  truncateAddress,
  useOnChainStats,
  type HeldAsset,
} from "@/services/onchainStatsService";
import type { HorizonOperation, HorizonTransaction } from "@/lib/horizon";

const ADDRESS = "GCONNECTEDACCOUNT1234567890ABCDEFGHIJKLMNOPQRSTUVWXY";

const tx = (hash: string, createdAt: string, successful = true): HorizonTransaction => ({
  id: hash,
  hash,
  created_at: createdAt,
  source_account: ADDRESS,
  successful,
  operation_count: 1,
  fee_charged: "100",
});

const op = (id: string, type: string, createdAt: string): HorizonOperation => ({
  id,
  transaction_hash: `hash_${id}`,
  transaction_successful: true,
  source_account: ADDRESS,
  type,
  type_i: 0,
  created_at: createdAt,
});

const indexer = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/onchainIndexer", () => ({ fetchIndexedActivity: indexer.fetch }));

describe("onchainStatsService display helpers", () => {
  it("keeps both ends of an address recognisable", () => {
    expect(truncateAddress(ADDRESS)).toBe("GCONNE…TUVWXY");
    expect(truncateAddress("GSHORT")).toBe("GSHORT");
  });

  it("humanises Horizon operation types", () => {
    expect(humanizeOperationType("invoke_host_function")).toBe("invoke host function");
  });

  it("trims Horizon's fixed-point amounts for display", () => {
    expect(formatAmount("1234.5000000")).toBe("1,234.5");
    expect(formatAmount("0")).toBe("0");
    expect(formatAmount(null)).toBe("—");
    expect(formatAmount("")).toBe("—");
    // A non-numeric balance is shown as-is rather than as "NaN".
    expect(formatAmount("n/a")).toBe("n/a");
  });

  it("cuts an ISO timestamp down to the day it happened on", () => {
    expect(dayOf("2026-09-21T20:41:00Z")).toBe("2026-09-21");
  });
});

describe("countByOperationType", () => {
  it("tallies each operation type", () => {
    const counts = countByOperationType([
      op("1", "payment", "2026-09-20T11:00:00Z"),
      op("2", "payment", "2026-09-20T12:00:00Z"),
      op("3", "invoke_host_function", "2026-09-21T12:00:00Z"),
    ]);

    expect(counts).toEqual({ payment: 2, invoke_host_function: 1 });
  });

  it("returns an empty map for an account with no operations", () => {
    expect(countByOperationType([])).toEqual({});
  });
});

describe("heldAssetsFrom", () => {
  const balances = [
    { asset_type: "native", balance: "500.0000000" },
    { asset_type: "credit_alphanum4", asset_code: "ABX", balance: "10.0000000" },
    { asset_type: "liquidity_pool_shares", balance: "1.0000000" },
  ];

  it("keeps trustlines and drops the XLM and pool lines", () => {
    expect(heldAssetsFrom(balances)).toEqual([{ code: "ABX", balance: "10.0000000" }]);
  });

  it("tolerates an unfunded account", () => {
    expect(heldAssetsFrom([])).toEqual([]);
  });
});

describe("shareOfOperations", () => {
  it("orders by count and expresses each type as a share of the total", () => {
    const rows = shareOfOperations({ payment: 3, invoke_host_function: 1 }, 4);

    expect(rows).toEqual([
      { type: "payment", count: 3, share: 0.75 },
      { type: "invoke_host_function", count: 1, share: 0.25 },
    ]);
  });

  it("returns nothing when there is no history to share out", () => {
    expect(shareOfOperations({}, 0)).toEqual([]);
  });
});

describe("summarizeOnChainActivity", () => {
  const assets: HeldAsset[] = [
    { code: "ABX", balance: "37.0000000" },
    { code: "sUSDC", balance: "1842.2500000" },
  ];

  const input = {
    address: ADDRESS,
    xlmBalance: "11984.5000000",
    assets,
    transactions: [
      tx("tx_a", "2026-09-26T18:04:00Z"),
      tx("tx_b", "2026-09-21T20:41:00Z", false),
      tx("tx_c", "2026-09-20T11:00:00Z"),
    ],
    operations: [
      op("o1", "payment", "2026-09-26T18:04:00Z"),
      op("o2", "payment", "2026-09-26T18:04:00Z"),
      op("o3", "invoke_host_function", "2026-09-21T20:41:00Z"),
    ],
  };

  it("counts transactions, failures and operations from the Horizon pages", () => {
    const summary = summarizeOnChainActivity(input);

    expect(summary.transactionCount).toBe(3);
    expect(summary.failedTransactionCount).toBe(1);
    expect(summary.operationCount).toBe(3);
    expect(summary.operationsByType).toEqual({ payment: 2, invoke_host_function: 1 });
  });

  it("spans the whole history window and counts distinct active days", () => {
    const summary = summarizeOnChainActivity(input);

    expect(summary.firstActivityAt).toBe("2026-09-20T11:00:00Z");
    expect(summary.lastActivityAt).toBe("2026-09-26T18:04:00Z");
    expect(summary.activeDays).toEqual(["2026-09-20", "2026-09-21", "2026-09-26"]);
  });

  it("sorts held assets by numeric balance, not string order", () => {
    const summary = summarizeOnChainActivity(input);

    expect(summary.assets.map((asset) => asset.code)).toEqual(["sUSDC", "ABX"]);
    expect(summary.xlmBalance).toBe("11984.5000000");
  });

  it("reports testnet vs mainnet from the active network", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    expect(summarizeOnChainActivity(input).network).toBe("testnet");

    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE =
      "Public Global Stellar Network ; September 2015";
    expect(summarizeOnChainActivity(input).network).toBe("public");
  });

  it("handles a brand-new account with no history at all", () => {
    const summary = summarizeOnChainActivity({
      address: ADDRESS,
      xlmBalance: "0",
      assets: [],
      transactions: [],
      operations: [],
    });

    expect(summary).toMatchObject({
      transactionCount: 0,
      failedTransactionCount: 0,
      operationCount: 0,
      operationsByType: {},
      assets: [],
      firstActivityAt: null,
      lastActivityAt: null,
      activeDays: [],
    });
  });

  it("does not mutate the arrays it is given", () => {
    const transactions = [...input.transactions];
    const assets = [...input.assets];

    summarizeOnChainActivity({ ...input, transactions, assets });

    expect(transactions).toEqual(input.transactions);
    expect(assets).toEqual(input.assets);
  });
});

describe("MOCK_ONCHAIN_SUMMARY", () => {
  it("uses a structurally valid Stellar account id for the sample", () => {
    // The fixture's checksum was verified out-of-band against StrKey; a
    // malformed address would 400 at Horizon and dead-link the explorer
    // button for anyone demoing the page.
    expect(MOCK_ONCHAIN_SUMMARY.address).toMatch(/^G[A-Z2-7]{55}$/);
  });

  it("is internally consistent so the demo page can't show impossible numbers", () => {
    const totalOperations = Object.values(MOCK_ONCHAIN_SUMMARY.operationsByType).reduce(
      (sum, count) => sum + count,
      0
    );

    expect(totalOperations).toBe(MOCK_ONCHAIN_SUMMARY.operationCount);
    expect(MOCK_ONCHAIN_SUMMARY.activeDays.length).toBeGreaterThan(0);
    expect(shareOfOperations(MOCK_ONCHAIN_SUMMARY.operationsByType, totalOperations)).toHaveLength(
      Object.keys(MOCK_ONCHAIN_SUMMARY.operationsByType).length
    );
  });
});

describe("useOnChainStats via backend indexer", () => {
  beforeEach(() => {
    flags.useMockOnChainStats = false;
    wallet.address = ADDRESS;
    indexer.fetch.mockReset().mockResolvedValue([]);
  });
  it("derives indexed event and transaction counts", async () => {
    indexer.fetch.mockResolvedValue([
      { id: "a", eventType: "mint", txHash: "tx1", createdAt: "2026-09-01T00:00:00Z" },
      { id: "b", eventType: "mint", txHash: "tx1", createdAt: "2026-09-01T00:00:00Z" },
    ]);
    const { result } = renderHook(() => useOnChainStats());
    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(result.current.summary).toMatchObject({
      transactionCount: 1,
      operationCount: 2,
      operationsByType: { mint: 2 },
      xlmBalance: "",
      failedTransactionCount: null,
    });
    expect(indexer.fetch).toHaveBeenCalledWith(ADDRESS);
  });
  it("keeps disconnected live artists out of demo mode", () => {
    wallet.address = null;
    const { result } = renderHook(() => useOnChainStats());
    expect(result.current.summary).toBeNull();
    expect(result.current.isMock).toBe(false);
    expect(indexer.fetch).not.toHaveBeenCalled();
  });
  it("uses the fixture only for explicit mock mode", () => {
    flags.useMockOnChainStats = true;
    const { result } = renderHook(() => useOnChainStats());
    expect(result.current.summary).toBe(MOCK_ONCHAIN_SUMMARY);
    expect(indexer.fetch).not.toHaveBeenCalled();
  });
  it("exposes backend failures for retry", async () => {
    indexer.fetch.mockRejectedValue(new Error("Indexer unavailable"));
    const { result } = renderHook(() => useOnChainStats());
    await waitFor(() => expect(result.current.error).toBe("Indexer unavailable"));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.summary).toBeNull();
  });
});
