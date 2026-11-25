"use client";

import { useStellarWallet } from "./useStellarWallet";
import FreighterRecoveryNotice from "./FreighterRecoveryNotice";

function truncate(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ConnectStellarWalletButton() {
  const { address, isConnecting, connect, disconnect } = useStellarWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-2 text-sm text-white">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Stellar wallet connected: {truncate(address)}
        <button
          onClick={disconnect}
          aria-label="Disconnect Stellar wallet"
          className="ml-1 text-xs text-white/60 underline hover:text-white transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`${isConnecting ? "opacity-70 cursor-not-allowed" : ""} rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-2 transition-colors text-sm`}
      >
        {isConnecting ? "Connecting..." : "Connect Stellar Wallet (Freighter)"}
      </button>
      {connectionFailure && connectionFailure !== "other" && (
        <FreighterRecoveryNotice
          state={connectionFailure}
          message={connectionFailureMessage || undefined}
          onRetry={handleConnect}
        />
      )}
    </div>
  );
}

export { ConnectStellarWalletButton };
