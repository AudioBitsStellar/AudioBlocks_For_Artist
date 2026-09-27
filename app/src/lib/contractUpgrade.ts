/**
 * Soroban contract upgrade validation and formatting utilities (#295).
 */

import type {
  ContractUpgradeValidationResult,
} from "../types/contractUpgrade";

/** Regular expression matching a 64-character hexadecimal SHA-256 hash (32 bytes) */
const WASM_HASH_REGEX = /^[0-9a-fA-F]{64}$/;

/** Regular expression matching a 56-character Stellar Contract (C...) address */
const CONTRACT_ADDRESS_REGEX = /^C[A-Z2-7]{55}$/;

/** Regular expression matching any 56-character Stellar Account (G...) or Contract (C...) address */
const STELLAR_ADDRESS_REGEX = /^[CG][A-Z2-7]{55}$/;

/**
 * Validates whether a given string is a valid 64-character hex WASM hash (32 bytes).
 */
export function isValidWasmHash(hash: unknown): boolean {
  if (typeof hash !== "string") return false;
  return WASM_HASH_REGEX.test(hash.trim());
}

/**
 * Validates whether a given string is a valid 56-character Stellar Soroban Contract address (starts with 'C').
 */
export function isValidContractAddress(address: unknown): boolean {
  if (typeof address !== "string") return false;
  return CONTRACT_ADDRESS_REGEX.test(address.trim());
}

/**
 * Validates whether a given string is a valid Stellar address (Account 'G' or Contract 'C').
 */
export function isValidStellarAddress(address: unknown): boolean {
  if (typeof address !== "string") return false;
  return STELLAR_ADDRESS_REGEX.test(address.trim());
}

/**
 * Performs comprehensive validation of parameters required for a Soroban contract upgrade.
 */
export function validateUpgradeParams(params: {
  contractId: string;
  newWasmHash: string;
  adminAddress?: string;
  currentWasmHash?: string;
}): ContractUpgradeValidationResult {
  const errors: string[] = [];

  // Contract ID checks
  if (!params.contractId || !params.contractId.trim()) {
    errors.push("Contract ID is required.");
  } else if (!isValidContractAddress(params.contractId)) {
    errors.push(
      "Invalid contract address. Must be a 56-character Stellar contract identifier starting with 'C'."
    );
  }

  // New WASM Hash checks
  if (!params.newWasmHash || !params.newWasmHash.trim()) {
    errors.push("New WASM hash is required.");
  } else if (!isValidWasmHash(params.newWasmHash)) {
    errors.push(
      "Invalid WASM hash. Must be a 64-character hexadecimal string representing the 32-byte bytecode hash."
    );
  }

  // Check against current WASM hash to prevent redundant upgrade
  if (
    params.currentWasmHash &&
    params.newWasmHash &&
    isValidWasmHash(params.newWasmHash) &&
    params.newWasmHash.trim().toLowerCase() === params.currentWasmHash.trim().toLowerCase()
  ) {
    errors.push(
      "New WASM hash is identical to the currently deployed contract WASM hash."
    );
  }

  // Admin address checks (optional at input time, but must be valid if supplied)
  if (params.adminAddress !== undefined && params.adminAddress !== "") {
    if (!isValidStellarAddress(params.adminAddress)) {
      errors.push(
        "Invalid admin address. Must be a valid 56-character Stellar account (G...) or contract (C...) address."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats a 64-character WASM hash for compact display in UI views.
 *
 * @example
 * formatWasmHash("a1b2c3d4e5f67890123456789012345678901234567890123456789012345678")
 * // "a1b2c3d4...12345678"
 */
export function formatWasmHash(
  hash: string,
  leadingChars = 8,
  trailingChars = 8
): string {
  if (!hash) return "";
  const trimmed = hash.trim();
  if (trimmed.length <= leadingChars + trailingChars) return trimmed;
  return `${trimmed.slice(0, leadingChars)}...${trimmed.slice(-trailingChars)}`;
}

/**
 * Formats a 56-character Stellar contract address for compact display.
 *
 * @example
 * formatContractAddress("CA3D522C922650E6F0C0F4A6A8109F1EB8477B78065B79F4BD14321A8587")
 * // "CA3D52...1A8587"
 */
export function formatContractAddress(
  address: string,
  leadingChars = 6,
  trailingChars = 6
): string {
  if (!address) return "";
  const trimmed = address.trim();
  if (trimmed.length <= leadingChars + trailingChars) return trimmed;
  return `${trimmed.slice(0, leadingChars)}...${trimmed.slice(-trailingChars)}`;
}
