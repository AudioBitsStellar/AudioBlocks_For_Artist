"use client";

import { useEffect, useState } from "react";
import { Wallet, RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { useFreighter } from "@/lib/freighter";
import { useStellarNetwork } from "@/components/contexts/StellarNetworkContext";
import { fetchAccountBalances, explorerAccountUrl } from "@/lib/horizon";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function WalletSettingsPage() {
  const { address, isConnected, connect, disconnect } = useFreighter();
  const { network } = useStellarNetwork();

  const {
    data: balances,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["wallet-balance", address, network.id],
    queryFn: async () => {
      if (!address) return null;
      return await fetchAccountBalances(address);
    },
    enabled: isConnected && !!address,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const isUnfunded = balances === null && !error;
  const nativeBalance = balances?.find((b) => b.asset_type === "native");
  const xlmAmount = nativeBalance ? parseFloat(nativeBalance.balance) : 0;

  const handleRefresh = () => {
    refetch();
  };

  const friendbotUrl = network.id === "testnet" && address
    ? `https://friendbot.stellar.org?addr=${address}`
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-text">Stellar Wallet</h2>
        <p className="text-sm text-text-muted">
          Connect your Stellar wallet to view your balance and manage your on-chain assets.
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text">
              {isConnected ? "Wallet Connected" : "No Wallet Connected"}
            </p>
            {isConnected && address && (
              <p className="text-xs text-text-muted font-mono">
                {address.slice(0, 8)}...{address.slice(-8)}
              </p>
            )}
          </div>
          <button
            onClick={isConnected ? disconnect : connect}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              isConnected
                ? "border border-border text-text-muted hover:text-text hover:border-secondary"
                : "bg-primary text-primary-contrast hover:bg-primary-hover"
            }`}
          >
            {isConnected ? "Disconnect" : "Connect Wallet"}
          </button>
        </div>

        {/* Balance Display */}
        {isConnected && (
          <div className="border-t border-border-subtle pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Balance</h3>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-raised transition-colors disabled:opacity-50"
                title="Refresh balance"
                aria-label="Refresh wallet balance"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {error ? (
              <div className="bg-surface-raised rounded-xl p-4 space-y-3 border border-red-500/20">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle size={20} />
                  <p className="text-sm">Failed to fetch wallet balance. Please try again.</p>
                </div>
              </div>
            ) : isUnfunded ? (
              <div className="bg-surface-raised rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <AlertCircle size={20} className="text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">Account Not Funded</p>
                    <p className="text-xs text-text-muted">
                      This account needs to be funded with at least 1 XLM to be active on the network.
                    </p>
                  </div>
                </div>
                {friendbotUrl && (
                  <a
                    href={friendbotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    Fund with Friendbot (Testnet)
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ) : balances ? (
              <div className="bg-surface-raised rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text">
                      {xlmAmount.toFixed(4)} XLM
                    </p>
                    <p className="text-xs text-text-muted">
                      Network: {network.label}
                    </p>
                  </div>
                </div>
                <a
                  href={explorerAccountUrl(address!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  View on Stellar Explorer
                  <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                {isLoading ? "Loading balance..." : "Click refresh to load your balance"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
