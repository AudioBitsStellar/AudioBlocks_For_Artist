import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTransactionStatus } from "@/hooks/useTransactionStatus";
import { transactionStorageKey, writeTrackedTransaction } from "@/lib/transactionStatus";

vi.mock("@/lib/runtimeConfig", () => ({
  getRuntimeConfig: () => ({ stellarRpcUrl: "https://rpc.example.test" }),
}));

describe("useTransactionStatus", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("restores pending state and confirms it through Soroban RPC polling", async () => {
    const key = transactionStorageKey("mint", "network:song-1");
    writeTrackedTransaction(key, { txHash: "hash-123", status: "pending", tokenId: "42" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: { status: "SUCCESS" } }),
      })
    );

    const { result } = renderHook(() => useTransactionStatus(key));
    await act(async () => {});

    expect(result.current.record?.status).toBe("pending");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500);
    });

    expect(result.current.record).toEqual({
      txHash: "hash-123",
      status: "confirmed",
      tokenId: "42",
    });
    expect(JSON.parse(localStorage.getItem(key) ?? "{}").status).toBe("confirmed");
  });
});
