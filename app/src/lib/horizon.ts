/**
 * Minimal Horizon REST client for read-only account queries (#283, #284).
 *
 * Horizon is a public, unauthenticated API — these calls go straight from
 * the browser to `NEXT_PUBLIC_STELLAR_RPC_URL`, no backend round-trip
 * needed, matching how the rest of the wallet UI already treats Freighter
 * (client-only, see `useStellarWallet.ts`).
 */

function horizonBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_STELLAR_RPC_URL is not set — required for on-chain wallet features.",
    );
  }
  return url.replace(/\/+$/, "");
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
  const passphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "";
  const network = passphrase.includes("Test") ? "testnet" : "public";
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}
