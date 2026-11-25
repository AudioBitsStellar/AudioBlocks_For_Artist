import { getRuntimeConfig } from "@/lib/runtimeConfig";

export type TransactionStatus = "pending" | "confirmed" | "failed";

export interface TrackedTransaction {
  txHash: string;
  status: TransactionStatus;
  tokenId?: string;
  toAddress?: string;
}

interface SorobanTransactionResponse {
  result?: { status?: string };
  error?: { message?: string };
}

export function transactionStorageKey(operation: string, id: string): string {
  return `audioblocks:transaction:v1:${operation}:${encodeURIComponent(id)}`;
}

export function readTrackedTransaction(storageKey: string): TrackedTransaction | null {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;

  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    window.localStorage.removeItem(storageKey);
    return null;
  }
  const value = parsed as Record<string, unknown>;
  if (
    typeof value.txHash !== "string" ||
    (value.status !== "pending" && value.status !== "confirmed" && value.status !== "failed")
  ) {
    window.localStorage.removeItem(storageKey);
    return null;
  }
  return {
    txHash: value.txHash,
    status: value.status,
    ...(typeof value.tokenId === "string" ? { tokenId: value.tokenId } : {}),
    ...(typeof value.toAddress === "string" ? { toAddress: value.toAddress } : {}),
  };
}

export function writeTrackedTransaction(storageKey: string, transaction: TrackedTransaction): void {
  window.localStorage.setItem(storageKey, JSON.stringify(transaction));
}

export function clearTrackedTransaction(storageKey: string): void {
  window.localStorage.removeItem(storageKey);
}

export async function fetchTransactionStatus(txHash: string): Promise<TransactionStatus> {
  const response = await fetch(getRuntimeConfig().stellarRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: { hash: txHash },
    }),
  });
  if (!response.ok) {
    throw new Error(`Stellar RPC returned ${response.status} while checking transaction status.`);
  }

  const result = (await response.json()) as SorobanTransactionResponse;
  if (result.error) {
    throw new Error(result.error.message || "Stellar RPC failed to check transaction status.");
  }

  switch (result.result?.status) {
    case "SUCCESS":
      return "confirmed";
    case "FAILED":
      return "failed";
    case "NOT_FOUND":
    case "PENDING":
      return "pending";
    default:
      throw new Error("Stellar RPC returned an unknown transaction status.");
  }
}
