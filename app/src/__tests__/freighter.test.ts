import { beforeEach, describe, expect, it, vi } from "vitest";

const freighterMock = vi.hoisted(() => ({
  isConnected: vi.fn(),
  getNetworkDetails: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => ({
  default: freighterMock,
}));

import {
  classifyFreighterError,
  FreighterNotInstalledError,
  signTransactionXdr,
} from "@/lib/freighter";

describe("classifyFreighterError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    freighterMock.isConnected.mockResolvedValue({ isConnected: true });
    freighterMock.getNetworkDetails.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    freighterMock.signTransaction.mockResolvedValue({ signedTxXdr: "SIGNED_XDR" });
  });

  it.each([
    [new FreighterNotInstalledError(), "missing"],
    [new Error("Freighter wallet is locked. Unlock it to continue."), "locked"],
    [new Error("Freighter network passphrase mismatch."), "wrong-network"],
    [new Error("User rejected the signing request."), "rejected"],
    [new Error("Unexpected wallet failure."), "other"],
  ] as const)("classifies %s as %s", (error, expected) => {
    expect(classifyFreighterError(error)).toBe(expected);
  });

  it("blocks signing before Freighter opens when it is on another network", async () => {
    await expect(
      signTransactionXdr("XDR", "Public Global Stellar Network ; September 2015", "GADDRESS")
    ).rejects.toMatchObject({ recoveryState: "wrong-network" });

    expect(freighterMock.signTransaction).not.toHaveBeenCalled();
  });

  it("reports a missing wallet when the extension is not connected", async () => {
    freighterMock.isConnected.mockResolvedValueOnce({ isConnected: false });

    await expect(
      signTransactionXdr("XDR", "Test SDF Network ; September 2015", "GADDRESS")
    ).rejects.toMatchObject({ recoveryState: "missing" });

    expect(freighterMock.signTransaction).not.toHaveBeenCalled();
  });

  it("preserves a locked-wallet error as a recoverable state", async () => {
    freighterMock.getNetworkDetails.mockResolvedValueOnce({
      network: "",
      networkPassphrase: "",
      error: { message: "Freighter wallet is locked" },
    });

    await expect(
      signTransactionXdr("XDR", "Test SDF Network ; September 2015", "GADDRESS")
    ).rejects.toMatchObject({ recoveryState: "locked" });

    expect(freighterMock.signTransaction).not.toHaveBeenCalled();
  });

  it("preserves a rejected-signature error as a recoverable state", async () => {
    freighterMock.signTransaction.mockResolvedValueOnce({
      signedTxXdr: "",
      error: { message: "User rejected the signing request." },
    });

    await expect(
      signTransactionXdr("XDR", "Test SDF Network ; September 2015", "GADDRESS")
    ).rejects.toMatchObject({ recoveryState: "rejected" });
  });
});
