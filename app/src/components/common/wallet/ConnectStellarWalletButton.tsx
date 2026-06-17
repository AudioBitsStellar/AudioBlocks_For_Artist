"use client";

import { useEffect } from "react";
import { useStellarWallet } from "./useStellarWallet";

function truncate(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ConnectStellarWalletButton() {
  const { address, isConnecting, connect, restore } = useStellarWallet();

  useEffect(() => {
    restore();
  }, [restore]);

  if (address) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111111] px-4 py-2 text-sm text-white">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Stellar wallet connected: {truncate(address)}
      </div>
    );
  }

  return (
    <button
      onClick={() => connect()}
      disabled={isConnecting}
      className={`${isConnecting ? "opacity-70 cursor-not-allowed" : ""} rounded-lg bg-[#D2045B] hover:bg-[#B8043F] text-white font-semibold px-6 py-2 transition-colors text-sm`}
    >
      {isConnecting ? "Connecting..." : "Connect Stellar Wallet (Freighter)"}
    </button>
  );
}
