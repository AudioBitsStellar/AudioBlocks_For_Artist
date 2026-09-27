/**
 * Types for Soroban Contract Upgrade Mechanism (#295).
 * See docs/SOROBAN_CONTRACT_UPGRADE_DESIGN.md for full contract and API design.
 */

import type { PreparedTransaction } from "./api";

/** Status lifecycle of a contract upgrade operation */
export type ContractUpgradeStatus =
  | "idle"
  | "validating"
  | "preparing"
  | "signing"
  | "submitting"
  | "success"
  | "error";

/** Request payload for preparing a Soroban contract upgrade transaction */
export interface PrepareContractUpgradeRequest {
  /** Target contract address (56-character Stellar C-address) */
  contractId: string;
  /** Hex hash of the uploaded replacement WASM code (64-character hex, 32 bytes) */
  newWasmHash: string;
  /** Admin public key authorized to trigger the upgrade */
  adminAddress: string;
  /** Optional custom migration data or arguments passed to the upgrade method */
  migrationData?: Record<string, unknown>;
}

/** Response returned by the prepare-upgrade endpoint */
export interface PreparedContractUpgradeResponse extends PreparedTransaction {
  contractId: string;
  newWasmHash: string;
}

/** Request payload for submitting a signed contract upgrade transaction */
export interface SubmitContractUpgradeRequest {
  contractId: string;
  signedXdr: string;
  newWasmHash: string;
}

/** Response returned after successfully submitting a contract upgrade */
export interface SubmitContractUpgradeResponse {
  txHash: string;
  contractId: string;
  newWasmHash: string;
  previousWasmHash?: string;
  upgradedAt: string;
}

/** Contract metadata and version status */
export interface ContractInfo {
  contractId: string;
  wasmHash: string;
  adminAddress: string;
  version?: string;
  deployedAt?: string;
  upgradedAt?: string;
}

/** Validation result for upgrade input parameters */
export interface ContractUpgradeValidationResult {
  valid: boolean;
  errors: string[];
}

/** Emitted upgrade event record */
export interface ContractUpgradeEvent {
  contractId: string;
  oldWasmHash: string;
  newWasmHash: string;
  adminAddress: string;
  txHash: string;
  timestamp: number;
}
