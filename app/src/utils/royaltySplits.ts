/**
 * Split-royalty configuration for collaborations (#417).
 *
 * Percentages are the artist-facing unit; the contract and
 * `lib/royaltySplit.ts` speak basis points. Everything that crosses that
 * boundary — parsing, rebalancing, formatting — lives here so the rounding
 * rule is stated once and unit-tested.
 */

import { TOTAL_BASIS_POINTS } from "@/types/royalty";

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

/** Sum of every row, ignoring anything unparseable. */
export function totalPercent(rows: SplitParticipant[]): number {
  return rows.reduce((sum, row) => {
    const value = parsePercent(row.percent);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
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

  const target = Math.min(100, Math.max(0, requestedPercent));
  const others = rows.filter((row) => row.id !== changedId);

  if (others.length === 0) {
    return rows.map((row) => (row.id === changedId ? { ...row, percent: target } : row));
  }

  const remaining = TOTAL_BASIS_POINTS - percentToBasisPoints(target);
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

/**
 * Client-side mirror of the contract invariants, with messages written for an
 * artist rather than a protocol engineer.
 */
export function validateSplitDraft(rows: SplitParticipant[]): SplitDraftErrors {
  const errors: SplitDraftErrors = { rows: {} };

  if (rows.length === 0) {
    errors.total = "Add at least one collaborator to the split.";
    return errors;
  }
  if (rows.length > MAX_COLLABORATORS) {
    errors.total = `A split can hold at most ${MAX_COLLABORATORS} collaborators.`;
    return errors;
  }

  const seenAddresses = new Map<string, string>();
  for (const row of rows) {
    if (!row.name.trim()) {
      errors.rows[row.id] = "Enter a name or stage name.";
      continue;
    }
    const address = row.address.trim();
    if (!address) {
      errors.rows[row.id] = "Enter the collaborator's Stellar address.";
      continue;
    }
    if (!/^G[A-Z2-7]{55}$/.test(address)) {
      errors.rows[row.id] = "That is not a valid Stellar address.";
      continue;
    }
    if (seenAddresses.has(address)) {
      errors.rows[row.id] = `Same address as ${seenAddresses.get(address)}.`;
      continue;
    }
    seenAddresses.set(address, row.name.trim());

    const percent = parsePercent(row.percent);
    if (!Number.isFinite(percent)) {
      errors.rows[row.id] = "Enter a number.";
      continue;
    }
    if (percent <= 0) {
      errors.rows[row.id] = "Share must be greater than 0%.";
      continue;
    }
    if (percent > 100) {
      errors.rows[row.id] = "Share cannot be more than 100%.";
    }
  }

  const total = totalPercent(rows);
  if (!errors.total && Object.keys(errors.rows).length === 0 && Math.abs(total - 100) > 0.0001) {
    errors.total = `Splits must add up to 100% — currently ${formatPercent(total)}%.`;
  }

  return errors;
}

export function isSplitDraftValid(rows: SplitParticipant[]): boolean {
  const errors = validateSplitDraft(rows);
  return Object.keys(errors.rows).length === 0 && !errors.total;
}

/** Hand the contract exactly what it expects: integer basis points, 10 000 total. */
export function toBasisPointEntries(rows: SplitParticipant[]) {
  return rows.map((row) => ({
    recipient: row.address.trim(),
    basisPoints: percentToBasisPoints(parsePercent(row.percent)),
  }));
}
