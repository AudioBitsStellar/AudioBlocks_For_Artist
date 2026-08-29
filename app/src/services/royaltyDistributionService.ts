/**
 * On-chain royalty distribution service (#294).
 *
 * Prepares and submits Soroban transactions for automatic royalty splitting.
 * The contract enforces basis-point allocation across recipients so the
 * frontend never handles partial payouts manually.
 */

import { ARTIST_ONCHAIN_ENDPOINTS, SONG_ONCHAIN_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import type { RoyaltySplitEntry } from "@/types/royalty";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreparedTransaction {
  xdr: string;
  networkPassphrase: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/** Request to prepare a royalty split setup transaction. */
export interface PrepareRoyaltySplitRequest {
  songId: string;
  splits: RoyaltySplitEntry[];
}

/** Request to submit a signed royalty split transaction. */
export interface SubmitRoyaltySplitRequest {
  songId: string;
  signedXdr: string;
}

/** Response after submitting a royalty split transaction. */
export interface SubmitRoyaltySplitResponse {
  txHash: string;
  songId: string;
  splitId: string;
  recipients: Array<{
    address: string;
    basisPoints: number;
  }>;
}

/** A royalty distribution record. */
export interface RoyaltyDistribution {
  songId: string;
  splitId: string;
  recipients: Array<{
    address: string;
    basisPoints: number;
    sharePercentage: number;
  }>;
  totalBasisPoints: number;
  createdAt: string;
}

/** Request to fetch royalty distribution for a song. */
export interface GetRoyaltyDistributionRequest {
  songId: string;
}

/** Request to update royalty distribution. */
export interface UpdateRoyaltySplitRequest {
  songId: string;
  splitId: string;
  splits: RoyaltySplitEntry[];
}

// ── API endpoint helpers ──────────────────────────────────────────────────────

const ROYALTY_ENDPOINTS = {
  prepareSplit: (songId: string) => `/song/${songId}/onchain/prepare-royalty-split`,
  submitSplit: (songId: string) => `/song/${songId}/onchain/submit-royalty-split`,
  getDistribution: (songId: string) => `/song/${songId}/royalty-distribution`,
  updateSplit: (songId: string, splitId: string) =>
    `/song/${songId}/onchain/prepare-update-royalty-split/${splitId}`,
};

// ── Service hook ──────────────────────────────────────────────────────────────

/**
 * React hook providing royalty distribution mutations.
 *
 * Usage:
 * ```tsx
 * const { usePrepareRoyaltySplit, useSubmitRoyaltySplit } = useRoyaltyDistributionService();
 * const prepare = usePrepareRoyaltySplit();
 * const submit = useSubmitRoyaltySplit();
 *
 * // Step 1: Prepare the XDR
 * prepare.mutate({ songId: "abc", splits: [...] });
 * // Step 2: Sign with Freighter, then submit
 * submit.mutate({ songId: "abc", signedXdr: "..." });
 * ```
 */
export const useRoyaltyDistributionService = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Build the `setup_royalty_split` Soroban transaction XDR.
   *
   * The backend validates the splits, builds the transaction with the
   * correct contract invocation, and returns the XDR for signing.
   */
  const usePrepareRoyaltySplit = () =>
    usePost<ApiEnvelope<PreparedTransaction>, PrepareRoyaltySplitRequest>(
      ROYALTY_ENDPOINTS.prepareSplit(""),
      {
        onError: (error) =>
          handleError(error.message || "Failed to prepare royalty split transaction."),
      }
    );

  /**
   * Submit the signed `setup_royalty_split` XDR to the network.
   *
   * After Freighter signs the XDR, this relays it to the Stellar network
   * and returns the on-chain transaction hash and split details.
   */
  const useSubmitRoyaltySplit = () =>
    usePost<ApiEnvelope<SubmitRoyaltySplitResponse>, SubmitRoyaltySplitRequest>(
      ROYALTY_ENDPOINTS.submitSplit(""),
      {
        onSuccess: () => handleSuccess("Royalty split configured on-chain!"),
        onError: (error) =>
          handleError(error.message || "Failed to submit royalty split transaction."),
      }
    );

  /**
   * Update an existing royalty split configuration.
   *
   * Builds a new `update_royalty_split` transaction XDR. The previous
   * split is superseded once the new one is confirmed on-chain.
   */
  const useUpdateRoyaltySplit = () =>
    usePost<ApiEnvelope<PreparedTransaction>, UpdateRoyaltySplitRequest>(
      ROYALTY_ENDPOINTS.updateSplit("", ""),
      {
        onError: (error) =>
          handleError(error.message || "Failed to prepare royalty split update."),
      }
    );

  return {
    usePrepareRoyaltySplit,
    useSubmitRoyaltySplit,
    useUpdateRoyaltySplit,
  };
};

// ── Utility functions ─────────────────────────────────────────────────────────

/**
 * Convert basis points to a human-readable percentage string.
 *
 * @example formatBasisPoints(2500) // "25.00%"
 */
export function formatBasisPoints(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2)}%`;
}

/**
 * Calculate each recipient's share in XLM given a total distribution amount.
 *
 * @param splits - The royalty split entries
 * @param totalAmount - Total amount in stroops
 * @returns Array of recipient addresses with their share in stroops
 */
export function calculateRoyaltyShares(
  splits: RoyaltySplitEntry[],
  totalAmount: number
): Array<{ address: string; shareStroops: number; sharePercentage: string }> {
  return splits.map((split) => ({
    address: split.recipient,
    shareStroops: Math.floor((totalAmount * split.basisPoints) / 10_000),
    sharePercentage: formatBasisPoints(split.basisPoints),
  }));
}

/**
 * Validate that royalty splits sum to exactly 10,000 basis points (100%).
 */
export function validateRoyaltyTotal(splits: RoyaltySplitEntry[]): boolean {
  const total = splits.reduce((sum, s) => sum + s.basisPoints, 0);
  return total === 10_000;
}
