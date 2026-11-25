import { useCallback, useEffect, useRef, useState } from "react";
import { fetchIndexedActivity, type IndexedActivity } from "@/lib/onchainIndexer";
import { featureFlags } from "@/lib/featureFlags";
import { useMock } from "@/__mocks__/loadMock";
import type { HorizonOperation, HorizonTransaction } from "@/lib/horizon";
import { getActiveNetworkId } from "@/lib/stellarNetwork";
import { useStellarWallet } from "@/components/common/wallet/useStellarWallet";

export interface MintStatusResponse {
  status: "PENDING" | "MINTED" | "FAILED";
  tokenId?: string;
  txHash?: string;
  error?: string;
}

export class OnchainService {
  /**
   * Poll Soroban RPC transaction status for a pending mint
   */
  public static async pollMintStatus(txHash: string): Promise<MintStatusResponse> {
    try {
      const response = await fetch(
        process.env.REACT_APP_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTransaction",
            params: { hash: txHash },
          }),
        }
      );

      const data = await response.json();
      const status = data?.result?.status;

      if (status === "SUCCESS") {
        return {
          status: "MINTED",
          tokenId: data.result.returnValue
            ? Buffer.from(data.result.returnValue, "base64").toString()
            : "token_id_placeholder",
          txHash,
        };
      } else if (status === "FAILED" || status === "NOT_FOUND") {
        // If not found after timeout or explicitly failed
        return {
          status: status === "FAILED" ? "FAILED" : "PENDING",
          txHash,
          error: data?.result?.resultXdr ? "Transaction execution failed" : undefined,
        };
      }

      return { status: "PENDING", txHash };
    } catch (err) {
      // Network hiccup during poll; keep pending until definitive resolution
      return { status: "PENDING", txHash };
    }
  }

  /**
   * Save pending mint state to localStorage for resume support across reloads
   */
  public static persistPendingMint(songId: string, txHash: string, networkId: string): void {
    localStorage.setItem(
      `pending_mint_${networkId}_${songId}`,
      JSON.stringify({ txHash, timestamp: Date.now() })
    );
  }

  public static getStoredPendingMint(songId: string, networkId: string): string | null {
    const stored = localStorage.getItem(`pending_mint_${networkId}_${songId}`);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return parsed.txHash || null;
    } catch {
      return null;
    }
  }

  public static clearStoredPendingMint(songId: string, networkId: string): void {
    localStorage.removeItem(`pending_mint_${networkId}_${songId}`);
  }
}

export interface HeldAsset {
  /** `"native"` for XLM, otherwise the trustline's asset code. */
  code: string;
  balance: string;
}

export interface OnChainActivitySummary {
  address: string;
  network: "testnet" | "public";
  xlmBalance: string;
  transactionCount: number;
  failedTransactionCount: number | null;
  operationCount: number;
  /** Operation type → how many of them the account has been part of. */
  operationsByType: Record<string, number>;
  assets: HeldAsset[];
  /** ISO 8601, or null when the account has no history at all. */
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  /** Distinct calendar days the account was active on, oldest first. */
  activeDays: string[];
}

/** The `G…` address with enough of both ends to recognise it. */
export function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

/** `"2026-09-27T10:30:00Z"` → `"2026-09-27"`, the unit active days are counted in. */
export function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/** Groups operations by their Horizon `type`, highest count first. */
export function countByOperationType(operations: HorizonOperation[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const operation of operations) {
    counts[operation.type] = (counts[operation.type] ?? 0) + 1;
  }
  return counts;
}

/**
 * Turns the raw Horizon pages into the artist's on-chain summary. Pure, and
 * tolerant of an account with no transactions or operations yet.
 */
export function summarizeOnChainActivity(input: {
  address: string;
  xlmBalance: string;
  assets: HeldAsset[];
  transactions: HorizonTransaction[];
  operations: HorizonOperation[];
}): OnChainActivitySummary {
  const { address, xlmBalance, assets, transactions, operations } = input;

  const timestamps = [
    ...transactions.map((tx) => tx.created_at),
    ...operations.map((operation) => operation.created_at),
  ].sort();

  return {
    address,
    network: getActiveNetworkId() === "testnet" ? "testnet" : "public",
    xlmBalance,
    transactionCount: transactions.length,
    failedTransactionCount: transactions.filter((tx) => !tx.successful).length,
    operationCount: operations.length,
    operationsByType: countByOperationType(operations),
    assets: [...assets].sort((a, b) => Number(b.balance) - Number(a.balance)),
    firstActivityAt: timestamps[0] ?? null,
    lastActivityAt: timestamps[timestamps.length - 1] ?? null,
    activeDays: [...new Set(timestamps.map(dayOf))].sort(),
  };
}

/** Balance entries minus the XLM line, which the summary carries separately. */
export function heldAssetsFrom(
  balances: { asset_type: string; balance: string; asset_code?: string }[]
): HeldAsset[] {
  return balances
    .filter((balance) => balance.asset_type !== "native" && balance.asset_code)
    .map((balance) => ({ code: balance.asset_code as string, balance: balance.balance }));
}

/** Every operation type the account has used, as a share of its history, largest first. */
export function shareOfOperations(
  counts: Record<string, number>,
  total: number
): { type: string; count: number; share: number }[] {
  if (total <= 0) return [];
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

/** `create_contract_transaction` → `create contract transaction`, for display. */
export function humanizeOperationType(type: string): string {
  return type.replace(/_/g, " ");
}

export interface UseOnChainStatsResult {
  summary: OnChainActivitySummary | null;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  /** True when the numbers shown are the demo fixture rather than the ledger. */
  isMock: boolean;
  refresh: () => void;
}

/** Indexed events involving the connected account, not all ledger operations. */
export function summarizeIndexedActivity(
  address: string,
  events: IndexedActivity[]
): OnChainActivitySummary {
  const timestamps = events.flatMap((event) => (event.createdAt ? [event.createdAt] : [])).sort();
  const operationsByType: Record<string, number> = {};
  for (const event of events) {
    if (event.eventType) {
      operationsByType[event.eventType] = (operationsByType[event.eventType] ?? 0) + 1;
    }
  }
  return {
    address,
    network: getActiveNetworkId() === "testnet" ? "testnet" : "public",
    xlmBalance: "",
    assets: [],
    failedTransactionCount: null,
    transactionCount: new Set(
      events.map((event) => event.txHash).filter((hash): hash is string => Boolean(hash))
    ).size,
    operationCount: events.length,
    operationsByType,
    firstActivityAt: timestamps[0] ?? null,
    lastActivityAt: timestamps.at(-1) ?? null,
    activeDays: [...new Set(timestamps.map(dayOf))].sort(),
  };
}

export function useOnChainStats(): UseOnChainStatsResult {
  const { address } = useStellarWallet();
  const isMock = featureFlags.useMockOnChainStats || !address;
  const onChainMocks = useMock("onchainStats", isMock);
  const [fetched, setFetched] = useState<OnChainActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    // Nothing to query without a wallet, and the sample summary is derived at
    // return time instead — so this effect only ever runs real reads.
    if (!address || featureFlags.useMockOnChainStats) return;
    setIsLoading(true);
    setError(null);
    try {
      const events = await fetchIndexedActivity(address);
      if (request !== requestId.current) return;
      setFetched(summarizeIndexedActivity(address, events));
    } catch (err) {
      if (request !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Couldn't reach the backend indexer.");
      setFetched(null);
    } finally {
      if (request === requestId.current) setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return {
    summary: isMock ? (onChainMocks?.MOCK_ONCHAIN_SUMMARY ?? null) : fetched,
    address: address ?? null,
    isLoading: isLoading || (isMock && !onChainMocks),
    error,
    isMock,
    refresh: load,
  };
}

/**
 * Horizon returns amounts as fixed-point strings with up to 7 decimals;
 * artists want `1,234.5`, not `1234.5000000`.
 */
export function formatAmount(raw: string | null | undefined, maximumFractionDigits = 4): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  return value.toLocaleString(undefined, { maximumFractionDigits });
}
