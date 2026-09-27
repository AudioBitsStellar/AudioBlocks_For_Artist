"use client";

import { useEffect, useState } from "react";
import { Wallet, RefreshCw, ExternalLink } from "lucide-react";
import { useFreighter } from "@/lib/freighter";
import { toast } from "sonner";

interface WalletBalance {
  native: number;
  assetCode: string;
  assetIssuer: string;
}

export default function WalletSettingsPage() {
  const { address, isConnected, connect, disconnect } = useFreighter();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchBalance = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      // Fetch native XLM balance from Horizon
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org"}/accounts/${address}`
      );
      if (!response.ok) throw new Error("Failed to fetch balance");
      const data = await response.json();
      const nativeBalance = data.balances?.find(
        (b: { asset_type: string }) => b.asset_type === "native"
      );
      setBalance({
        native: nativeBalance ? parseFloat(nativeBalance.balance) : 0,
        assetCode: "XLM",
        assetIssuer: "",
      });
      setLastChecked(new Date());
    } catch (err) {
      toast.error("Failed to fetch wallet balance");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchBalance();
    }
  }, [isConnected, address]);

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
                onClick={fetchBalance}
                disabled={isLoading}
                className="p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-raised transition-colors disabled:opacity-50"
                title="Refresh balance"
                aria-label="Refresh wallet balance"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {balance ? (
              <div className="bg-surface-raised rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text">
                      {balance.native.toFixed(4)} {balance.assetCode}
                    </p>
                    <p className="text-xs text-text-muted">
                      Last checked: {lastChecked?.toLocaleTimeString() || "Never"}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${address}`}
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
