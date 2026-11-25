import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getRuntimeConfig } from "@/lib/runtimeConfig";
import { GET } from "@/app/api/config/route";

describe("Runtime Configuration (OPS-04)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    if (typeof window !== "undefined") {
      delete window.__RUNTIME_CONFIG__;
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("evaluates runtime environment variables without build-time baking", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://runtime-api.audioblocks.io";
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Custom Network Passphrase";
    process.env.NEXT_PUBLIC_USE_MOCK_DATA = "false";
    process.env.NEXT_PUBLIC_FEATURE_FLAGS = "artistOnchainAnalytics=false";

    const config = getRuntimeConfig();
    expect(config.apiBaseUrl).toBe("https://runtime-api.audioblocks.io");
    expect(config.stellarNetworkPassphrase).toBe("Custom Network Passphrase");
    expect(config.useMockData).toBe(false);
    expect(config.featureFlags).toBe("artistOnchainAnalytics=false");
  });

  it("prioritizes window.__RUNTIME_CONFIG__ in browser context when present", () => {
    // Simulate browser window injection
    (global as unknown as { window: { __RUNTIME_CONFIG__?: unknown } }).window = {
      __RUNTIME_CONFIG__: {
        apiBaseUrl: "https://injected-browser-url.test",
        privyAppId: "browser-app-id",
        stellarNetworkPassphrase: "Test SDF Network ; September 2015",
        horizonUrl: "https://horizon-testnet.stellar.org",
        stellarRpcUrl: "https://soroban-testnet.stellar.org",
        useMockData: false,
        featureFlags: "testFlag=true",
        baseUrl: "https://audioblocks.io",
        listenerAppUrl: "https://audioblocks.io",
      },
    };

    const config = getRuntimeConfig();
    expect(config.apiBaseUrl).toBe("https://injected-browser-url.test");
    expect(config.privyAppId).toBe("browser-app-id");
  });

  it("serves live configuration via GET /api/config", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://endpoint-test.audioblocks.io";
    process.env.NEXT_PUBLIC_FEATURE_FLAGS = "artistOnchainAnalytics=false";
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.apiBaseUrl).toBe("https://endpoint-test.audioblocks.io");
    expect(json.featureFlags).toBe("artistOnchainAnalytics=false");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
