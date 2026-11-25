/**
 * Split-royalty configuration and validation (#417, #591).
 *
 * Single source of truth for royalty-split validation across both the artist
 * draft UI and the royalty-split service / contract boundary.
 *
 * Percentages are converted to integer basis points once at the boundary via
 * `percentToBasisPoints` (nearest integer), and all downstream validation runs
 * in integer basis points so the UI and service can never disagree.
 */

import { type RoyaltySplitEntry, TOTAL_BASIS_POINTS } from "@/types/royalty";
import { normalizeStellarAddress, validateStellarPublicKey } from "@/utils/stellarAddress";

export const MAX_COLLABORATORS = 10;

export interface SplitParticipant {
  /** Stable row id, so React keys survive reordering. */
  id: string;
  name: string;
  /** Stellar G... address, empty until the collaborator has shared one. */
  address: string;
  /** Whole percent, 0–100. */
  percent: number;
}

export interface SplitDraftErrors {
  /** Keyed by participant id so the form can anchor each message to a row. */
  rows: Record<string, string>;
  total?: string;
}

export type RoyaltySplitErrorCode =
  | "empty"
  | "too_many_recipients"
  | "missing_address"
  | "invalid_address"
  | "duplicate_recipient"
  | "invalid_share"
  | "non_positive_share"
  | "share_exceeds_max"
  | "invalid_total";

export interface RoyaltySplitValidationIssue {
  code: RoyaltySplitErrorCode;
  message: string;
  /** Zero-based entry index for per-recipient errors. */
  index?: number;
}

export interface RoyaltySplitValidationResult {
  valid: boolean;
  errors: string[];
  issues: RoyaltySplitValidationIssue[];
}

/** `""` → 0, `"12.5"` → 12.5, `"abc"` → NaN. */
export function parsePercent(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/** Percent → basis points, rounding to the nearest whole unit. */
export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * (TOTAL_BASIS_POINTS / 100));
}

export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / (TOTAL_BASIS_POINTS / 100);
}

export function totalBasisPoints(rows: SplitParticipant[]): number {
  return rows.reduce((sum, row) => {
    const value = parsePercent(row.percent);
    return sum + (Number.isFinite(value) ? percentToBasisPoints(value) : 0);
  }, 0);
}

/** Sum of shares at contract precision, ignoring anything unparseable. */
export function totalPercent(rows: SplitParticipant[]): number {
  return basisPointsToPercent(totalBasisPoints(rows));
}

/** 0.1 + 0.2 problems are exactly why shares are stored as integers. */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "");
}

/**
 * Reshapes a set of shares so they add up to exactly 100% again after an edit.
 *
 * The edited row is honoured and the remainder is spread across the others as
 * evenly as possible, with the leftover basis points handed to the first rows so
 * nothing is lost to rounding. Falls back to an even split when there is a
 * single row, which is the only self-consistent answer.
 */
export function rebalanceToTotal(
  rows: SplitParticipant[],
  changedId: string,
  requestedPercent: number
): SplitParticipant[] {
  const changed = rows.find((row) => row.id === changedId);
  if (!changed || rows.length === 0) return rows;

  const targetBasisPoints = percentToBasisPoints(Math.min(100, Math.max(0, requestedPercent)));
  const target = basisPointsToPercent(targetBasisPoints);
  const others = rows.filter((row) => row.id !== changedId);

  if (others.length === 0) {
    return rows.map((row) =>
      row.id === changedId ? { ...row, percent: basisPointsToPercent(TOTAL_BASIS_POINTS) } : row
    );
  }

  const remaining = TOTAL_BASIS_POINTS - targetBasisPoints;
  const othersBasis = others.map((row) => {
    const value = parsePercent(row.percent);
    return Number.isFinite(value) ? percentToBasisPoints(value) : 0;
  });
  const othersTotal = othersBasis.reduce((sum, value) => sum + value, 0);

  // Scale the existing shares when they already add up, otherwise start from an
  // even division so a partially filled form still resolves to 100%.
  const scaled = othersBasis.map((value) =>
    othersTotal > 0
      ? Math.floor((value * remaining) / othersTotal)
      : Math.floor(remaining / others.length)
  );
  let leftover = remaining - scaled.reduce((sum, value) => sum + value, 0);
  for (let index = 0; leftover > 0; index = (index + 1) % scaled.length) {
    scaled[index] += 1;
    leftover -= 1;
  }

  return rows.map((row) => {
    if (row.id === changedId) return { ...row, percent: target };
    const index = others.findIndex((other) => other.id === row.id);
    return { ...row, percent: basisPointsToPercent(scaled[index]) };
  });
}

/** Hand the contract exactly what it expects: normalized addresses and integer shares. */
export function toBasisPointEntries(rows: SplitParticipant[]): RoyaltySplitEntry[] {
  return rows.map((row) => ({
    recipient: normalizeStellarAddress(row.address),
    basisPoints: percentToBasisPoints(parsePercent(row.percent)),
  }));
}

/**
 * Canonical validator for royalty split configs (#286, #591).
 *
 * Checks run in a fixed order:
 * 1. Collection bounds (at least 1, at most MAX_COLLABORATORS).
 * 2. Per-entry recipient address (checksum + secret/muxed detection) and
 *    duplicate detection on the normalized address.
 * 3. Per-entry share bounds (finite integer, > 0, <= 10 000 basis points).
 * 4. Integer basis-point total equal to exactly 10 000 (100%).
 */
export function validateRoyaltySplit(splits: RoyaltySplitEntry[]): RoyaltySplitValidationResult {
  const issues: RoyaltySplitValidationIssue[] = [];

  if (splits.length === 0) {
    issues.push({
      code: "empty",
      message: "Add at least one collaborator to the split.",
    });
    return { valid: false, errors: issues.map((issue) => issue.message), issues };
  }

  if (splits.length > MAX_COLLABORATORS) {
    issues.push({
      code: "too_many_recipients",
      message: `A split can hold at most ${MAX_COLLABORATORS} collaborators.`,
    });
    return { valid: false, errors: issues.map((issue) => issue.message), issues };
  }

  const seenAddresses = new Set<string>();
  let totalBasisPoints = 0;
  let allSharesFinite = true;

  for (let index = 0; index < splits.length; index += 1) {
    const split = splits[index];
    const normalized = normalizeStellarAddress(split.recipient);

    if (!normalized) {
      issues.push({
        code: "missing_address",
        index,
        message: "Enter the collaborator's Stellar address.",
      });
    } else {
      const addressCheck = validateStellarPublicKey(normalized);
      if (!addressCheck.valid) {
        issues.push({
          code: "invalid_address",
          index,
          message: addressCheck.error,
        });
      } else if (seenAddresses.has(addressCheck.normalized)) {
        issues.push({
          code: "duplicate_recipient",
          index,
          message: `Duplicate recipient: ${addressCheck.normalized} is already in this split.`,
        });
      } else {
        seenAddresses.add(addressCheck.normalized);
      }
    }

    if (!Number.isFinite(split.basisPoints)) {
      allSharesFinite = false;
      issues.push({
        code: "invalid_share",
        index,
        message: "Enter a number.",
      });
    } else if (split.basisPoints <= 0) {
      issues.push({
        code: "non_positive_share",
        index,
        message: "Share must be greater than 0%.",
      });
    } else if (split.basisPoints > TOTAL_BASIS_POINTS) {
      issues.push({
        code: "share_exceeds_max",
        index,
        message: "Share cannot be more than 100%.",
      });
    } else {
      totalBasisPoints += split.basisPoints;
    }
  }

  if (allSharesFinite && totalBasisPoints !== TOTAL_BASIS_POINTS) {
    issues.push({
      code: "invalid_total",
      message: `Splits must add up to 100% — currently ${formatPercent(basisPointsToPercent(totalBasisPoints))}%.`,
    });
  }

  return {
    valid: issues.length === 0,
    errors: issues.map((issue) => issue.message),
    issues,
  };
}

/**
 * UI adapter over {@link validateRoyaltySplit}. Checks the UI-only collaborator
 * name field, converts percentages to basis points once via
 * `toBasisPointEntries`, and projects the canonical validation issues onto
 * row-keyed and total errors so the UI and service never disagree.
 */
export function validateSplitDraft(rows: SplitParticipant[]): SplitDraftErrors {
  const errors: SplitDraftErrors = { rows: {} };

  if (rows.length === 0 || rows.length > MAX_COLLABORATORS) {
    const result = validateRoyaltySplit(toBasisPointEntries(rows));
    errors.total = result.errors[0];
    return errors;
  }

  for (const row of rows) {
    if (!row.name.trim()) {
      errors.rows[row.id] = "Enter a name or stage name.";
    }
  }

  const result = validateRoyaltySplit(toBasisPointEntries(rows));

  for (const issue of result.issues) {
    if (issue.index !== undefined) {
      const row = rows[issue.index];
      if (row && !errors.rows[row.id]) {
        errors.rows[row.id] = issue.message;
      }
    } else if (issue.code !== "invalid_total" || Object.keys(errors.rows).length === 0) {
      errors.total = errors.total ?? issue.message;
    }
  }

  return errors;
}

export function isSplitDraftValid(rows: SplitParticipant[]): boolean {
  const errors = validateSplitDraft(rows);
  return Object.keys(errors.rows).length === 0 && !errors.total;
}
