"use client";

/**
 * React wrapper around `src/lib/stellarNetwork.ts` (#282) so components that
 * read balances/transactions/fees re-render when the user switches network
 * from Settings → Network, instead of only picking up the change on reload.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  getActiveNetworkId,
  getNetworkConfig,
  setActiveNetworkId,
  type StellarNetworkConfig,
  type StellarNetworkId,
} from "@/lib/stellarNetwork";

interface StellarNetworkContextValue {
  networkId: StellarNetworkId;
  network: StellarNetworkConfig;
  setNetworkId: (id: StellarNetworkId) => void;
}

const StellarNetworkContext = createContext<StellarNetworkContextValue | null>(null);

export function StellarNetworkProvider({ children }: { children: ReactNode }) {
  const [networkId, setNetworkIdState] = useState<StellarNetworkId>(getActiveNetworkId);
  const network = useMemo(() => getNetworkConfig(networkId), [networkId]);

  const setNetworkId = useCallback((id: StellarNetworkId) => {
    setActiveNetworkId(id);
    setNetworkIdState(id);
  }, []);

  return (
    <StellarNetworkContext.Provider value={{ networkId, network, setNetworkId }}>
      {children}
    </StellarNetworkContext.Provider>
  );
}

export function useStellarNetwork(): StellarNetworkContextValue {
  const ctx = useContext(StellarNetworkContext);
  if (!ctx) {
    throw new Error("useStellarNetwork must be used within StellarNetworkProvider");
  }
  return ctx;
}
