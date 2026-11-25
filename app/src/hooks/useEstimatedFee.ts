"use client";

/**
 * Live network gas estimate for the "Est. gas" hint shown before minting or
 * transferring on-chain (#289). Replaces the previous hardcoded "~0.001 XLM"
 * with Horizon's actual median per-operation fee. An unavailable estimate is
 * surfaced to the caller so an on-chain action can fail closed.
 */

import { useCallback, useEffect, useState } from "react";
import { estimateOperationFeeXlm } from "@/lib/horizon";

export interface EstimatedFee {
  estimate: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEstimatedFee(operationCount = 1): EstimatedFee {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    operationCount: number;
    attempt: number;
    estimate: string | null;
    error: Error | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    estimateOperationFeeXlm(operationCount)
      .then((estimate) => {
        if (!cancelled) setResult({ operationCount, attempt, estimate, error: null });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setResult({
            operationCount,
            attempt,
            estimate: null,
            error: cause instanceof Error ? cause : new Error("Unable to estimate network fees."),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, operationCount]);

  const currentResult =
    result?.operationCount === operationCount && result.attempt === attempt ? result : null;
  const refetch = useCallback(() => setAttempt((current) => current + 1), []);
  return {
    estimate: currentResult?.estimate ?? null,
    isLoading: currentResult === null,
    error: currentResult?.error ?? null,
    refetch,
  };
}
