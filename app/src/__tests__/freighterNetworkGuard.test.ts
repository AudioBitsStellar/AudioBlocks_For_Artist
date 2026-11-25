import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stellar/freighter-api", () => ({
  default: {
    signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: "SIGNED_XDR", error: null }),
  },
}));

import freighterApi from "@stellar/freighter-api";
import { signTransactionXdr } from "@/lib/freighter";

describe("signTransactionXdr network guard", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    delete window.__RUNTIME_CONFIG__;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    delete window.__RUNTIME_CONFIG__;
  });

  it("rejects a backend network mismatch before opening Freighter", async () => {
    await expect(
      signTransactionXdr(
        "TRANSACTION_XDR",
        "Public Global Stellar Network ; September 2015",
        "GTEST_ADDRESS"
      )
    ).rejects.toThrow(/configured for Stellar Testnet.*Stellar Mainnet.*Signing was blocked/);

    expect(freighterApi.signTransaction).not.toHaveBeenCalled();
  });
});
