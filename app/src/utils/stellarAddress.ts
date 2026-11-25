/**
 * Stellar address normalization and CRC16 checksum validation (#590).
 *
 * Uses `StrKey` from `@stellar/stellar-sdk` so single-character typos,
 * truncated keys, muxed (`M...`) addresses, and secret seeds (`S...`) are
 * rejected before any address is stored or submitted on-chain.
 */

import { StrKey } from "@stellar/stellar-sdk";

export type StellarAddressErrorCode = "empty" | "secret_key" | "muxed_address" | "invalid";

export type StellarAddressValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; code: StellarAddressErrorCode; error: string };

export const STELLAR_SECRET_KEY_WARNING =
  "This looks like a secret key — never paste it here. Enter your public G… address instead.";

export const STELLAR_MUXED_ADDRESS_ERROR =
  "Muxed addresses (M…) are not supported here. Enter a standard G… public key.";

export const STELLAR_INVALID_ADDRESS_ERROR =
  "Enter a valid Stellar public address (starts with G, 56 characters, valid checksum).";

/** Trim surrounding whitespace and uppercase a Stellar address. */
export function normalizeStellarAddress(value: string): string {
  return value.trim().toUpperCase();
}

/** True when `value` is a Stellar secret seed (`S...`) or clearly shaped like one. */
export function isStellarSecretKey(value: string): boolean {
  if (typeof value !== "string") return false;
  const normalized = normalizeStellarAddress(value);
  if (!normalized) return false;
  return StrKey.isValidEd25519SecretSeed(normalized) || normalized.startsWith("S");
}

/** True when `value` is a Stellar muxed address (`M...`). */
export function isMuxedStellarAddress(value: string): boolean {
  if (typeof value !== "string") return false;
  const normalized = normalizeStellarAddress(value);
  if (!normalized) return false;
  return StrKey.isValidMed25519PublicKey(normalized) || normalized.startsWith("M");
}

/**
 * Validates that `value` is a real Ed25519 Stellar public key (`G...`) with a
 * valid base32 CRC16 checksum. Trims whitespace and normalizes case first.
 */
export function isValidStellarPublicKey(value: string): boolean {
  if (typeof value !== "string") return false;
  const normalized = normalizeStellarAddress(value);
  if (!normalized) return false;
  return StrKey.isValidEd25519PublicKey(normalized);
}

/**
 * Full validation with specific, user-facing errors for empty values, secret
 * seeds (`S...`), muxed addresses (`M...`), and malformed/bad-checksum keys.
 */
export function validateStellarPublicKey(value: string): StellarAddressValidationResult {
  const normalized = typeof value === "string" ? normalizeStellarAddress(value) : "";

  if (!normalized) {
    return {
      valid: false,
      code: "empty",
      error: "Enter a Stellar public address.",
    };
  }

  if (isStellarSecretKey(normalized)) {
    return {
      valid: false,
      code: "secret_key",
      error: STELLAR_SECRET_KEY_WARNING,
    };
  }

  if (isMuxedStellarAddress(normalized)) {
    return {
      valid: false,
      code: "muxed_address",
      error: STELLAR_MUXED_ADDRESS_ERROR,
    };
  }

  if (!StrKey.isValidEd25519PublicKey(normalized)) {
    return {
      valid: false,
      code: "invalid",
      error: STELLAR_INVALID_ADDRESS_ERROR,
    };
  }

  return { valid: true, normalized };
}
