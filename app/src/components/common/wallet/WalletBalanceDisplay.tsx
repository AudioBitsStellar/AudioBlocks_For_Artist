"use client";

/**
 * WalletBalanceDisplay — shows the connected Freighter wallet's XLM balance,
 * fetched directly from Horizon (#284).
 *
 * Renders nothing until a wallet is connected (`useStellarWallet().address`).
 * Refreshes on mount and exposes a manual refresh button since Horizon
 * balances change outside this app (mints, transfers from other clients).
 */

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { fetchXlmBalance } from "@/lib/horizon";
import { useStellarWallet } from "./useStellarWallet";

function formatXlm(raw: string): string {
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

export default function WalletBalanceDisplay() {
  const { address } = useStellarWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const xlm = await fetchXlmBalance(address);
      setBalance(xlm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balance.");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  if (!address) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-2 text-sm text-white">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#9A9A9A]" />
      ) : error ? (
        <span className="text-red-400">{error}</span>
      ) : (
        <span>
          <span className="font-semibold">{balance !== null ? formatXlm(balance) : "—"}</span>{" "}
          <span className="text-[#9A9A9A]">XLM</span>
        </span>
      )}
      <button
        onClick={load}
        disabled={isLoading}
        aria-label="Refresh balance"
        className="text-[#9A9A9A] hover:text-white transition-colors disabled:opacity-50"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export { WalletBalanceDisplay };
