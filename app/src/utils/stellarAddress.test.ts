import { describe, expect, it } from "vitest";
import {
  isMuxedStellarAddress,
  isStellarSecretKey,
  isValidStellarPublicKey,
  normalizeStellarAddress,
  STELLAR_MUXED_ADDRESS_ERROR,
  STELLAR_SECRET_KEY_WARNING,
  validateStellarPublicKey,
} from "./stellarAddress";

// Real Ed25519 Stellar keys generated with `@stellar/stellar-base` (valid CRC16 checksums).
const VALID_PUBLIC_KEY = "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";
const VALID_SECRET_KEY = "SAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC5MY";
const VALID_MUXED_ADDRESS = "MCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYAIBAEAQCAIBAFPMG";

function flipOneCharacter(address: string): string {
  const index = 10;
  const current = address[index];
  const replacement = current === "A" ? "B" : "A";
  return `${address.slice(0, index)}${replacement}${address.slice(index + 1)}`;
}

describe("stellarAddress (#590)", () => {
  it("normalizes whitespace and casing", () => {
    expect(normalizeStellarAddress(`  ${VALID_PUBLIC_KEY.toLowerCase()}  `)).toBe(VALID_PUBLIC_KEY);
  });

  it("accepts a real valid Ed25519 Stellar public key (including lowercase/padded)", () => {
    expect(isValidStellarPublicKey(VALID_PUBLIC_KEY)).toBe(true);
    expect(isValidStellarPublicKey(`  ${VALID_PUBLIC_KEY.toLowerCase()}  `)).toBe(true);
    expect(validateStellarPublicKey(` ${VALID_PUBLIC_KEY.toLowerCase()} `)).toEqual({
      valid: true,
      normalized: VALID_PUBLIC_KEY,
    });
  });

  it("rejects a key with a single character changed (checksum failure)", () => {
    const tampered = flipOneCharacter(VALID_PUBLIC_KEY);
    expect(tampered).toHaveLength(56);
    expect(tampered.startsWith("G")).toBe(true);
    expect(isValidStellarPublicKey(tampered)).toBe(false);

    const result = validateStellarPublicKey(tampered);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("invalid");
    }
  });

  it("rejects a secret key (S...) with a specific warning", () => {
    expect(isStellarSecretKey(VALID_SECRET_KEY)).toBe(true);
    expect(isValidStellarPublicKey(VALID_SECRET_KEY)).toBe(false);

    const result = validateStellarPublicKey(VALID_SECRET_KEY);
    expect(result).toEqual({
      valid: false,
      code: "secret_key",
      error: STELLAR_SECRET_KEY_WARNING,
    });
  });

  it("rejects a muxed address (M...) with a specific error", () => {
    expect(isMuxedStellarAddress(VALID_MUXED_ADDRESS)).toBe(true);
    expect(isValidStellarPublicKey(VALID_MUXED_ADDRESS)).toBe(false);

    const result = validateStellarPublicKey(VALID_MUXED_ADDRESS);
    expect(result).toEqual({
      valid: false,
      code: "muxed_address",
      error: STELLAR_MUXED_ADDRESS_ERROR,
    });
  });

  it("rejects empty and truncated keys", () => {
    expect(isValidStellarPublicKey("")).toBe(false);
    expect(isValidStellarPublicKey("   ")).toBe(false);
    expect(isValidStellarPublicKey(VALID_PUBLIC_KEY.slice(0, 55))).toBe(false);
    expect(validateStellarPublicKey("").valid).toBe(false);
  });
});
