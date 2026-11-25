import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTrackedTransaction,
  fetchTransactionStatus,
  readTrackedTransaction,
  transactionStorageKey,
  writeTrackedTransaction,
} from "@/lib/transactionStatus";

vi.mock("@/lib/runtimeConfig", () => ({
  getRuntimeConfig: () => ({ stellarRpcUrl: "https://rpc.example.test" }),
}));

describe("transaction status", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("persists and restores pending transactions by action and entity", () => {
    const key = transactionStorageKey("mint", "network:song/1");
    const record = { txHash: "hash-123", status: "pending" as const, tokenId: "42" };

    writeTrackedTransaction(key, record);

    expect(readTrackedTransaction(key)).toEqual(record);
    clearTrackedTransaction(key);
    expect(readTrackedTransaction(key)).toBeNull();
  });

  it.each([
    ["SUCCESS", "confirmed"],
    ["FAILED", "failed"],
    ["NOT_FOUND", "pending"],
    ["PENDING", "pending"],
  ] as const)("maps Soroban status %s to %s", async (rpcStatus, expected) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: { status: rpcStatus } }),
      })
    );

    await expect(fetchTransactionStatus("hash-123")).resolves.toBe(expected);
    expect(fetch).toHaveBeenCalledWith(
      "https://rpc.example.test",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"method":"getTransaction"'),
      })
    );
  });

  it("surfaces RPC failures and unknown response statuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      })
    );
    await expect(fetchTransactionStatus("hash-123")).rejects.toThrow(/503/);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: { status: "UNKNOWN" } }),
      })
    );
    await expect(fetchTransactionStatus("hash-123")).rejects.toThrow(/unknown transaction status/i);
  });
});
