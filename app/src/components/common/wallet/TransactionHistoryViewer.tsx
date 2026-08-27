"use client";

/**
 * TransactionHistoryViewer — lists the connected wallet's recent on-chain
 * transactions, fetched directly from Horizon (#283).
 *
 * Each row links out to stellar.expert for full operation-level detail
 * rather than trying to decode operations client-side.
 */

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { explorerTxUrl, fetchAccountTransactions, HorizonTransaction } from "@/lib/horizon";
import { useStellarWallet } from "./useStellarWallet";

function truncateHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TransactionHistoryViewer({ limit = 10 }: { limit?: number }) {
  const { address } = useStellarWallet();
  const [transactions, setTransactions] = useState<HorizonTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const txs = await fetchAccountTransactions(address, limit);
      setTransactions(txs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transaction history.");
    } finally {
      setIsLoading(false);
    }
  }, [address, limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (!address) return null;

  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-4 text-sm text-white">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Recent transactions</h3>
        <button
          onClick={load}
          disabled={isLoading}
          aria-label="Refresh transaction history"
          className="text-[#9A9A9A] hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {isLoading && transactions.length === 0 ? (
        <div className="flex items-center gap-2 text-[#9A9A9A]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : transactions.length === 0 ? (
        <p className="text-[#9A9A9A]">No transactions yet.</p>
      ) : (
        <ul className="divide-y divide-[#2A2A2A]">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${tx.successful ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="font-mono text-xs">{truncateHash(tx.hash)}</span>
                </div>
                <p className="mt-0.5 text-xs text-[#9A9A9A]">
                  {formatDate(tx.created_at)} · {tx.operation_count} op
                  {tx.operation_count === 1 ? "" : "s"}
                </p>
              </div>
              <a
                href={explorerTxUrl(tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on stellar.expert"
                className="text-[#9A9A9A] hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { TransactionHistoryViewer };
