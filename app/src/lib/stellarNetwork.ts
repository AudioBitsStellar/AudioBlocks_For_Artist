/**
 * Testnet/mainnet selection for the client-only Horizon reads in
 * `src/lib/horizon.ts` (#282). See docs/adr/0004-direct-horizon-reads-from-the-browser.md.
 *
 * This only changes which Horizon instance balance/transaction-history/fee
 * reads hit — it has no effect on which network the backend prepares and
 * submits transactions against (see docs/adr/0002-soroban-prepare-sign-submit-split.md).
 * That's why the network settings UI checks for a mismatch against Freighter's
 * own connected network rather than trying to force it to follow along.
 */

export type StellarNetworkId = "testnet" | "mainnet";

export interface StellarNetworkConfig {
  id: StellarNetworkId;
  label: string;
  horizonUrl: string;
  networkPassphrase: string;
}

export const STELLAR_NETWORK_IDS: StellarNetworkId[] = ["testnet", "mainnet"];

const PUBLIC_DEFAULTS: Record<StellarNetworkId, Omit<StellarNetworkConfig, "id">> = {
  testnet: {
    label: "Testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  },
  mainnet: {
    label: "Mainnet",
    horizonUrl: "https://horizon.stellar.org",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
  },
};

const STORAGE_KEY = "audioblocks:stellar-network:v1";

/** The network implied by this deployment's env vars — the network switcher's default. */
function envNetworkId(): StellarNetworkId {
  const passphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "";
  return passphrase.includes("Test") ? "testnet" : "mainnet";
}

/**
 * Resolves a network's live config. Computed per call (not cached at module
 * load) so it reflects `process.env` at call time — env vars are inlined at
 * Next.js build time in production, so this is equivalent there, but it also
 * makes the resolution testable without a fresh module registry per case.
 *
 * The network matching this deployment's env vars uses
 * NEXT_PUBLIC_STELLAR_RPC_URL / NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE (so a
 * custom/proxied Horizon URL set via env still works); the *other* network
 * falls back to the public Stellar Horizon endpoint, since there's no
 * per-network env var for it.
 */
export function getNetworkConfig(id: StellarNetworkId): StellarNetworkConfig {
  const isEnvDefault = id === envNetworkId();
  const envUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
  const envPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;

  return {
    id,
    label: PUBLIC_DEFAULTS[id].label,
    horizonUrl: (isEnvDefault && envUrl) || PUBLIC_DEFAULTS[id].horizonUrl,
    networkPassphrase: (isEnvDefault && envPassphrase) || PUBLIC_DEFAULTS[id].networkPassphrase,
  };
}

function isNetworkId(value: string | null): value is StellarNetworkId {
  return value === "testnet" || value === "mainnet";
}

/** The active network id: the user's saved choice if any, else this deployment's env default. */
export function getActiveNetworkId(): StellarNetworkId {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isNetworkId(stored)) return stored;
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — fall through to the env default.
    }
  }
  return envNetworkId();
}

export function getActiveNetwork(): StellarNetworkConfig {
  return getNetworkConfig(getActiveNetworkId());
}

/** Persists the user's network choice. No-op during SSR. */
export function setActiveNetworkId(id: StellarNetworkId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage full or blocked — the in-memory context state still reflects the choice this session.
  }
}
