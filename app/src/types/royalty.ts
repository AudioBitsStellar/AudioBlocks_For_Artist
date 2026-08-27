/**
 * Types for the planned royalty-split feature (#286).
 * See docs/ROYALTY_CONTRACT_DESIGN.md for the full contract design.
 *
 * These types describe the shape the frontend will send once the backend
 * exposes `prepare-royalty-split` / `submit-royalty-split`; nothing here
 * calls a real endpoint yet.
 */

export interface RoyaltySplitEntry {
  /** Stellar G... address of the recipient. */
  recipient: string;
  /** Share of proceeds, in basis points (1/100 of a percent). */
  basisPoints: number;
}

export interface RoyaltySplitConfig {
  songId: string;
  splits: RoyaltySplitEntry[];
}

export const TOTAL_BASIS_POINTS = 10_000;
