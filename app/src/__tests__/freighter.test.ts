import { describe, it, expect, vi, beforeEach } from "vitest";
import * as freighter from "@/lib/freighter";

// Mock the entire @stellar/freighter-api module
vi.mock("@stellar/freighter-api", () => ({
  default: {
    isConnected: vi.fn(),
    requestAccess: vi.fn(),
    getAddress: vi.fn(),
    getNetworkDetails: vi.fn(),
    signTransaction: vi.fn(),
  },
}));

import freighterApi from "@stellar/freighter-api";

describe("freighter.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isFreighterAvailable", () => {
    it("returns true when Freighter is connected", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });

      const result = await freighter.isFreighterAvailable();
      expect(result).toBe(true);
    });

    it("returns false when Freighter returns an error", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: false,
        error: { message: "Extension not installed" } as any,
      });

      const result = await freighter.isFreighterAvailable();
      expect(result).toBe(false);
    });

    it("returns false when Freighter is not connected", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: false,
        error: null as any,
      });

      const result = await freighter.isFreighterAvailable();
      expect(result).toBe(false);
    });
  });

  describe("connectFreighter", () => {
    it("returns the connected address when successful", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        error: null as any,
      });

      const address = await freighter.connectFreighter();
      expect(address).toBe("GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    });

    it("throws FreighterNotInstalledError when Freighter is not available", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: false,
        error: { message: "Not installed" } as any,
      });

      await expect(freighter.connectFreighter()).rejects.toThrow(
        freighter.FreighterNotInstalledError
      );
      await expect(freighter.connectFreighter()).rejects.toThrow(
        "Freighter wallet extension not detected"
      );
    });

    it("throws an error when Freighter access request fails", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: "",
        error: { message: "User rejected" } as any,
      });

      await expect(freighter.connectFreighter()).rejects.toThrow("User rejected");
    });

    it("throws a generic error when Freighter returns error without message", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.requestAccess).mockResolvedValue({
        address: "",
        error: {} as any,
      });

      await expect(freighter.connectFreighter()).rejects.toThrow(
        "Freighter access request failed"
      );
    });
  });

  describe("getFreighterAddress", () => {
    it("returns the connected address when available", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.getAddress).mockResolvedValue({
        address: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        error: null as any,
      });

      const address = await freighter.getFreighterAddress();
      expect(address).toBe("GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
    });

    it("returns null when Freighter is not available", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: false,
        error: { message: "Not installed" } as any,
      });

      const address = await freighter.getFreighterAddress();
      expect(address).toBeNull();
    });

    it("returns null when getAddress returns an error", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.getAddress).mockResolvedValue({
        address: "",
        error: { message: "Not authorized" } as any,
      });

      const address = await freighter.getFreighterAddress();
      expect(address).toBeNull();
    });

    it("returns null when getAddress returns no address", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.getAddress).mockResolvedValue({
        address: "",
        error: null as any,
      });

      const address = await freighter.getFreighterAddress();
      expect(address).toBeNull();
    });
  });

  describe("getFreighterNetworkDetails", () => {
    it("returns network details when successful", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.getNetworkDetails).mockResolvedValue({
        network: "TESTNET",
        networkPassphrase: "Test SDF Network ; September 2015",
        error: null as any,
      });

      const details = await freighter.getFreighterNetworkDetails();
      expect(details).toEqual({
        network: "TESTNET",
        networkPassphrase: "Test SDF Network ; September 2015",
      });
    });

    it("returns null when Freighter is not available", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: false,
        error: { message: "Not installed" } as any,
      });

      const details = await freighter.getFreighterNetworkDetails();
      expect(details).toBeNull();
    });

    it("returns null when getNetworkDetails returns an error", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.getNetworkDetails).mockResolvedValue({
        network: "",
        networkPassphrase: "",
        error: { message: "Failed to get network" } as any,
      });

      const details = await freighter.getFreighterNetworkDetails();
      expect(details).toBeNull();
    });

    it("returns null when networkPassphrase is empty", async () => {
      vi.mocked(freighterApi.isConnected).mockResolvedValue({
        isConnected: true,
        error: null as any,
      });
      vi.mocked(freighterApi.getNetworkDetails).mockResolvedValue({
        network: "TESTNET",
        networkPassphrase: "",
        error: null as any,
      });

      const details = await freighter.getFreighterNetworkDetails();
      expect(details).toBeNull();
    });
  });

  describe("signTransactionXdr", () => {
    const mockXdr = "AAAAAgAAAABelb7...";
    const mockNetworkPassphrase = "Test SDF Network ; September 2015";
    const mockAddress = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
    const mockSignedXdr = "AAAAAgAAAABelb7...SIGNED";

    it("returns signed XDR when successful", async () => {
      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: mockSignedXdr,
        error: null as any,
      });

      const signedXdr = await freighter.signTransactionXdr(
        mockXdr,
        mockNetworkPassphrase,
        mockAddress
      );

      expect(signedXdr).toBe(mockSignedXdr);
      expect(freighterApi.signTransaction).toHaveBeenCalledWith(mockXdr, {
        networkPassphrase: mockNetworkPassphrase,
        address: mockAddress,
      });
    });

    it("passes the exact networkPassphrase to the sign call", async () => {
      const customPassphrase = "Public Global Stellar Network ; September 2015";
      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: mockSignedXdr,
        error: null as any,
      });

      await freighter.signTransactionXdr(mockXdr, customPassphrase, mockAddress);

      expect(freighterApi.signTransaction).toHaveBeenCalledWith(mockXdr, {
        networkPassphrase: customPassphrase,
        address: mockAddress,
      });
    });

    it("throws an error when user rejects signing", async () => {
      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: "",
        error: { message: "User rejected the transaction" } as any,
      });

      await expect(
        freighter.signTransactionXdr(mockXdr, mockNetworkPassphrase, mockAddress)
      ).rejects.toThrow("User rejected the transaction");
    });

    it("throws a generic error when Freighter returns error without message", async () => {
      vi.mocked(freighterApi.signTransaction).mockResolvedValue({
        signedTxXdr: "",
        error: {} as any,
      });

      await expect(
        freighter.signTransactionXdr(mockXdr, mockNetworkPassphrase, mockAddress)
      ).rejects.toThrow("Freighter rejected the signing request");
    });
  });

  describe("FreighterNotInstalledError", () => {
    it("is an instance of Error", () => {
      const error = new freighter.FreighterNotInstalledError();
      expect(error).toBeInstanceOf(Error);
    });

    it("has the correct message", () => {
      const error = new freighter.FreighterNotInstalledError();
      expect(error.message).toBe(
        "Freighter wallet extension not detected. Install it from freighter.app."
      );
    });
  });
});
