import { describe, it, expect } from "vitest";
import {
  isValidWasmHash,
  isValidContractAddress,
  isValidStellarAddress,
  validateUpgradeParams,
  formatWasmHash,
  formatContractAddress,
} from "../lib/contractUpgrade";

describe("Soroban Contract Upgrade Utilities (#295)", () => {
  const validWasmHash =
    "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678";
  const validContractId =
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  const validAdminAddress =
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

  describe("isValidWasmHash", () => {
    it("accepts a valid 64-character lowercase hex hash", () => {
      expect(isValidWasmHash(validWasmHash)).toBe(true);
    });

    it("accepts an uppercase or mixed-case 64-character hex hash", () => {
      expect(isValidWasmHash(validWasmHash.toUpperCase())).toBe(true);
    });

    it("rejects hashes with non-hex characters", () => {
      const invalid = validWasmHash.slice(0, 63) + "z";
      expect(isValidWasmHash(invalid)).toBe(false);
    });

    it("rejects hashes with incorrect length", () => {
      expect(isValidWasmHash(validWasmHash.slice(0, 63))).toBe(false);
      expect(isValidWasmHash(validWasmHash + "a")).toBe(false);
      expect(isValidWasmHash("")).toBe(false);
    });

    it("rejects non-string inputs", () => {
      expect(isValidWasmHash(null)).toBe(false);
      expect(isValidWasmHash(undefined)).toBe(false);
      expect(isValidWasmHash(12345)).toBe(false);
      expect(isValidWasmHash({})).toBe(false);
    });
  });

  describe("isValidContractAddress", () => {
    it("accepts a valid 56-character Stellar C-address", () => {
      expect(isValidContractAddress(validContractId)).toBe(true);
    });

    it("rejects Stellar account G-addresses", () => {
      expect(isValidContractAddress(validAdminAddress)).toBe(false);
    });

    it("rejects addresses with invalid lengths", () => {
      expect(isValidContractAddress(validContractId.slice(0, 55))).toBe(false);
      expect(isValidContractAddress(validContractId + "A")).toBe(false);
      expect(isValidContractAddress("")).toBe(false);
    });

    it("rejects addresses with invalid base32 characters (0, 1, 8, 9)", () => {
      const invalid = "C" + "0".repeat(55);
      expect(isValidContractAddress(invalid)).toBe(false);
    });

    it("rejects non-string inputs", () => {
      expect(isValidContractAddress(null)).toBe(false);
      expect(isValidContractAddress(undefined)).toBe(false);
    });
  });

  describe("isValidStellarAddress", () => {
    it("accepts valid C-address and G-address", () => {
      expect(isValidStellarAddress(validContractId)).toBe(true);
      expect(isValidStellarAddress(validAdminAddress)).toBe(true);
    });

    it("rejects unknown prefix or malformed addresses", () => {
      expect(isValidStellarAddress("M" + validAdminAddress.slice(1))).toBe(false);
      expect(isValidStellarAddress("random-string")).toBe(false);
      expect(isValidStellarAddress("")).toBe(false);
      expect(isValidStellarAddress(null)).toBe(false);
    });
  });

  describe("validateUpgradeParams", () => {
    it("returns valid when all required parameters are well-formed", () => {
      const result = validateUpgradeParams({
        contractId: validContractId,
        newWasmHash: validWasmHash,
        adminAddress: validAdminAddress,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails when contract ID is missing or invalid", () => {
      const missing = validateUpgradeParams({
        contractId: "",
        newWasmHash: validWasmHash,
      });
      expect(missing.valid).toBe(false);
      expect(missing.errors).toContain("Contract ID is required.");

      const invalid = validateUpgradeParams({
        contractId: "invalid-id",
        newWasmHash: validWasmHash,
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors[0]).toMatch(/invalid contract address/i);
    });

    it("fails when new WASM hash is missing or invalid", () => {
      const missing = validateUpgradeParams({
        contractId: validContractId,
        newWasmHash: "",
      });
      expect(missing.valid).toBe(false);
      expect(missing.errors).toContain("New WASM hash is required.");

      const invalid = validateUpgradeParams({
        contractId: validContractId,
        newWasmHash: "not-a-hash",
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors[0]).toMatch(/invalid wasm hash/i);
    });

    it("fails when new WASM hash is identical to current WASM hash", () => {
      const result = validateUpgradeParams({
        contractId: validContractId,
        newWasmHash: validWasmHash,
        currentWasmHash: validWasmHash.toUpperCase(),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "New WASM hash is identical to the currently deployed contract WASM hash."
      );
    });

    it("fails when admin address is invalid", () => {
      const result = validateUpgradeParams({
        contractId: validContractId,
        newWasmHash: validWasmHash,
        adminAddress: "invalid-admin-key",
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/invalid admin address/i);
    });
  });

  describe("formatWasmHash", () => {
    it("formats 64-char hash with ellipsis", () => {
      const formatted = formatWasmHash(validWasmHash, 8, 8);
      expect(formatted).toBe("a1b2c3d4...12345678");
    });

    it("returns short hash unchanged", () => {
      expect(formatWasmHash("short")).toBe("short");
      expect(formatWasmHash("")).toBe("");
    });
  });

  describe("formatContractAddress", () => {
    it("formats 56-char address with ellipsis", () => {
      const formatted = formatContractAddress(validContractId, 6, 6);
      expect(formatted).toBe("CDLZFC...HGCYSC");
    });

    it("returns short address unchanged", () => {
      expect(formatContractAddress("C123")).toBe("C123");
      expect(formatContractAddress("")).toBe("");
    });
  });

  describe("Contract Upgrade Error Translation", () => {
    it("translates wasm not found error correctly", async () => {
      const { translateContractError } = await import("../lib/contractErrors");
      const result = translateContractError("HostError: Error(WasmVm, WasmNotFound)");
      expect(result.title).toBe("WASM Bytecode Not Installed");
      expect(result.category).toBe("contract");
      expect(result.resolution[0]).toMatch(/install the wasm bytecode/i);
    });

    it("translates unauthorized contract upgrade error correctly", async () => {
      const { translateContractError } = await import("../lib/contractErrors");
      const result = translateContractError("HostError: unauthorized upgrade attempt");
      expect(result.title).toBe("Upgrade Unauthorized");
      expect(result.category).toBe("auth");
      expect(result.resolution[0]).toMatch(/contract admin/i);
    });

    it("translates identical wasm hash error correctly", async () => {
      const { translateContractError } = await import("../lib/contractErrors");
      const result = translateContractError("UpgradeError: identical wasm hash provided");
      expect(result.title).toBe("Identical WASM Hash");
      expect(result.category).toBe("validation");
    });
  });

  describe("CONTRACT_UPGRADE_ENDPOINTS", () => {
    it("generates correct API routes", async () => {
      const { CONTRACT_UPGRADE_ENDPOINTS } = await import("../api/api-endpoint");
      expect(CONTRACT_UPGRADE_ENDPOINTS.PREPARE_UPGRADE).toBe("/contract/onchain/prepare-upgrade");
      expect(CONTRACT_UPGRADE_ENDPOINTS.SUBMIT_UPGRADE).toBe("/contract/onchain/submit-upgrade");
      expect(CONTRACT_UPGRADE_ENDPOINTS.GET_CONTRACT_INFO("CDLZFC")).toBe("/contract/CDLZFC/info");
    });
  });
});

