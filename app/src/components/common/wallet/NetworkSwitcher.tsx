"use client";

/**
 * NetworkSwitcher — lets an artist pick which Stellar network the read-only
 * Horizon calls (balance, transaction history, gas estimate) are made
 * against (#282). Lives in Settings; see
 * docs/adr/0004-direct-horizon-reads-from-the-browser.md for why this is
 * scoped to reads only and doesn't change what network the backend actually
 * signs/submits transactions on.
 */

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useStellarNetwork } from "@/context/StellarNetworkContext";
import { getFreighterNetworkDetails } from "@/lib/freighter";
import { getNetworkConfig, STELLAR_NETWORK_IDS } from "@/lib/stellarNetwork";

export default function NetworkSwitcher() {
  const { networkId, network, setNetworkId } = useStellarNetwork();
  const [freighterPassphrase, setFreighterPassphrase] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFreighterNetworkDetails().then((details) => {
      if (!cancelled) setFreighterPassphrase(details?.networkPassphrase ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [networkId]);

  const mismatch =
    freighterPassphrase !== null && freighterPassphrase !== network.networkPassphrase;

  return (
    <div className="space-y-4 rounded-lg border border-[#2A2A2A] bg-[#161616] p-6">
      <div>
        <h3 className="text-white font-semibold mb-1">Stellar network</h3>
        <p className="text-sm text-[#A3A3A3]">
          Choose which network your wallet balance, transaction history, and gas estimate are
          read from.
        </p>
      </div>

      <div role="radiogroup" aria-label="Stellar network" className="flex gap-2">
        {STELLAR_NETWORK_IDS.map((id) => {
          const isActive = networkId === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setNetworkId(id)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-[#D2045B] bg-[#D2045B] text-white"
                  : "border-[#2A2A2A] bg-[#111111] text-[#A3A3A3] hover:text-white"
              }`}
            >
              {getNetworkConfig(id).label}
            </button>
          );
        })}
      </div>

      {mismatch && (
        <div
          className="flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-950/20 p-3"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
          <p className="text-xs text-yellow-500">
            Freighter is connected to a different network than the one selected here. Balances and
            transaction history shown on this page won&apos;t match what you see in the extension
            — switch Freighter&apos;s own network from within the extension to line them up.
          </p>
        </div>
      )}
    </div>
  );
}

export { NetworkSwitcher };
