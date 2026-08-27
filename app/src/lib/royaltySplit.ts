/**
 * Validation for royalty split configs (#286). Mirrors the invariants the
 * on-chain contract will enforce (see docs/ROYALTY_CONTRACT_DESIGN.md) so a
 * malformed split is caught client-side before ever reaching a prepare-*
 * endpoint.
 */

import { RoyaltySplitEntry, TOTAL_BASIS_POINTS } from "@/types/royalty";

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

export interface RoyaltySplitValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRoyaltySplit(splits: RoyaltySplitEntry[]): RoyaltySplitValidationResult {
  const errors: string[] = [];

  if (splits.length === 0) {
    errors.push("At least one royalty recipient is required.");
  }

  const seen = new Set<string>();
  for (const split of splits) {
    if (!STELLAR_ADDRESS_RE.test(split.recipient)) {
      errors.push(`Invalid Stellar address: ${split.recipient}`);
    }
    if (seen.has(split.recipient)) {
      errors.push(`Duplicate recipient: ${split.recipient}`);
    }
    seen.add(split.recipient);
    if (split.basisPoints <= 0) {
      errors.push(`Share for ${split.recipient} must be greater than 0.`);
    }
  }

  const total = splits.reduce((sum, s) => sum + s.basisPoints, 0);
  if (splits.length > 0 && total !== TOTAL_BASIS_POINTS) {
    errors.push(
      `Splits must sum to 100% (${TOTAL_BASIS_POINTS} basis points) — got ${total / 100}%.`,
    );
  }

  return { valid: errors.length === 0, errors };
}
