/**
 * Minimal Horizon REST client for read-only account queries (#283, #284).
 *
 * Horizon is a public, unauthenticated API — these calls go straight from
 * the browser to the active network's Horizon URL (testnet or mainnet, see
 * `src/lib/stellarNetwork.ts` and #282), no backend round-trip needed,
 * matching how the rest of the wallet UI already treats Freighter
 * (client-only, see `useStellarWallet.ts`).
 */

import { getActiveNetwork, getActiveNetworkId } from "./stellarNetwork";

function horizonBaseUrl(): string {
  return getActiveNetwork().horizonUrl.replace(/\/+$/, "");
}

export interface HorizonBalance {
  asset_type: "native" | "credit_alphanum4" | "credit_alphanum12" | "liquidity_pool_shares";
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
}

export interface HorizonAccount {
  id: string;
  balances: HorizonBalance[];
}

export interface HorizonTransaction {
  id: string;
  hash: string;
  created_at: string;
  source_account: string;
  successful: boolean;
  operation_count: number;
  fee_charged: string;
  memo?: string;
}

interface HorizonTransactionsPage {
  _embedded: { records: HorizonTransaction[] };
}

/** Per-operation fee percentiles, in stroops, as returned by Horizon's `/fee_stats`. */
export interface HorizonFeeStats {
  fee_charged: {
    min: string;
    mode: string;
    p50: string;
    p95: string;
    max: string;
  };
}

const STROOPS_PER_XLM = 10_000_000;

/** Fetches an account's balances. Returns `null` if the account doesn't exist on-chain yet (unfunded). */
export async function fetchAccountBalances(address: string): Promise<HorizonBalance[] | null> {
  const res = await fetch(`${horizonBaseUrl()}/accounts/${address}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Horizon returned ${res.status} fetching account ${address}`);
  }
  const account = (await res.json()) as HorizonAccount;
  return account.balances;
}

/** Convenience helper: the native XLM balance as a string, or "0" if unfunded. */
export async function fetchXlmBalance(address: string): Promise<string> {
  const balances = await fetchAccountBalances(address);
  if (!balances) return "0";
  const native = balances.find((b) => b.asset_type === "native");
  return native?.balance ?? "0";
}

/** Fetches the most recent transactions for an account, newest first. */
export async function fetchAccountTransactions(
  address: string,
  limit = 10,
): Promise<HorizonTransaction[]> {
  const res = await fetch(
    `${horizonBaseUrl()}/accounts/${address}/transactions?order=desc&limit=${limit}`,
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Horizon returned ${res.status} fetching transactions for ${address}`);
  }
  const page = (await res.json()) as HorizonTransactionsPage;
  return page._embedded?.records ?? [];
}

/** Builds a stellar.expert explorer link for a transaction hash, network-aware. */
export function explorerTxUrl(hash: string): string {
  const network = getActiveNetworkId() === "testnet" ? "testnet" : "public";
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

/** Fetches Horizon's live network-wide fee percentiles (in stroops per operation). */
export async function fetchFeeStats(): Promise<HorizonFeeStats> {
  const res = await fetch(`${horizonBaseUrl()}/fee_stats`);
  if (!res.ok) {
    throw new Error(`Horizon returned ${res.status} fetching fee stats`);
  }
  return (await res.json()) as HorizonFeeStats;
}

/**
 * Estimates the network fee for a transaction with `operationCount`
 * operations, in XLM, using Horizon's live `/fee_stats` (the median
 * fee actually charged per operation) instead of a hardcoded guess (#289).
 */
export async function estimateOperationFeeXlm(operationCount = 1): Promise<string> {
  const stats = await fetchFeeStats();
  const perOperationStroops = Number(stats.fee_charged.p50);
  if (!Number.isFinite(perOperationStroops) || perOperationStroops <= 0) {
    throw new Error("Horizon returned an invalid fee estimate");
  }
  const totalXlm = (perOperationStroops * operationCount) / STROOPS_PER_XLM;
  const formatted = totalXlm.toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
  return `~${formatted} XLM`;
}
