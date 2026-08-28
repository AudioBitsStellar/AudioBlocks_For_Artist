"use client";

/**
 * Live network gas estimate for the "Est. gas" hint shown before minting or
 * transferring on-chain (#289). Replaces the previous hardcoded "~0.001 XLM"
 * with Horizon's actual median per-operation fee, falling back to that same
 * static figure if Horizon is unreachable so the UI never shows a blank hint.
 */

import { useEffect, useState } from "react";
import { estimateOperationFeeXlm } from "@/lib/horizon";

const FALLBACK_ESTIMATE = "~0.001 XLM";

export interface EstimatedFee {
  estimate: string;
  isLoading: boolean;
}

export function useEstimatedFee(operationCount = 1): EstimatedFee {
  const [estimate, setEstimate] = useState(FALLBACK_ESTIMATE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // No callers currently vary `operationCount` after mount, so `isLoading`
    // only needs its initial `true` value here, not a re-assertion per
    // effect run — that would call setState synchronously in the effect body.
    estimateOperationFeeXlm(operationCount)
      .then((value) => {
        if (!cancelled) setEstimate(value);
      })
      .catch(() => {
        if (!cancelled) setEstimate(FALLBACK_ESTIMATE);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [operationCount]);

  return { estimate, isLoading };
}
