import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getActiveNetworkId,
  getNetworkConfig,
  setActiveNetworkId,
} from "@/lib/stellarNetwork";

describe("lib/stellarNetwork (#282)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    window.localStorage.clear();
  });

  it("defaults to testnet when the env passphrase mentions Test", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    expect(getActiveNetworkId()).toBe("testnet");
  });

  it("defaults to mainnet when the env passphrase is the public network", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE =
      "Public Global Stellar Network ; September 2015";
    expect(getActiveNetworkId()).toBe("mainnet");
  });

  it("uses NEXT_PUBLIC_STELLAR_RPC_URL for the env-default network", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "https://custom-horizon.example.com";

    expect(getNetworkConfig("testnet").horizonUrl).toBe("https://custom-horizon.example.com");
  });

  it("falls back to the public Horizon endpoint for the non-default network", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "https://custom-horizon.example.com";

    expect(getNetworkConfig("mainnet").horizonUrl).toBe("https://horizon.stellar.org");
  });

  it("persists an explicit choice across calls via localStorage", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

    setActiveNetworkId("mainnet");

    expect(getActiveNetworkId()).toBe("mainnet");
  });

  it("ignores a malformed stored value and falls back to the env default", () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    window.localStorage.setItem("audioblocks:stellar-network:v1", "not-a-real-network");

    expect(getActiveNetworkId()).toBe("testnet");
  });
});
