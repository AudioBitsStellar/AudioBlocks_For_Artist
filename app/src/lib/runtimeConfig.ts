export interface PublicRuntimeConfig {
  apiBaseUrl: string;
  privyAppId: string;
  stellarNetworkPassphrase: string;
  horizonUrl: string;
  stellarRpcUrl: string;
  useMockData: boolean;
  featureFlags: string;
  baseUrl: string;
  listenerAppUrl: string;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: PublicRuntimeConfig;
  }
}

/**
 * Returns the public runtime configuration.
 *
 * In client browser:
 *   Prioritizes window.__RUNTIME_CONFIG__ injected at container/request runtime,
 *   falling back to process.env.NEXT_PUBLIC_* for local development/tests.
 *
 * In server Node.js:
 *   Reads directly from process.env at request time.
 */
export function getRuntimeConfig(): PublicRuntimeConfig {
  if (typeof window !== "undefined" && window.__RUNTIME_CONFIG__) {
    return window.__RUNTIME_CONFIG__;
  }

  return {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
    privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || "",
    stellarNetworkPassphrase:
      process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
      "Test SDF Network ; September 2015",
    horizonUrl:
      process.env.NEXT_PUBLIC_HORIZON_URL ||
      "https://horizon-testnet.stellar.org",
    stellarRpcUrl:
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
      "https://soroban-testnet.stellar.org",
    useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true",
    featureFlags: process.env["NEXT_PUBLIC_FEATURE_FLAGS"] || "",
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://audioblocks.io",
    listenerAppUrl:
      process.env.NEXT_PUBLIC_LISTENER_APP_URL || "https://audioblocks.io",
  };
}
