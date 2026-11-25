"use client";

import type { EstimatedFee } from "@/hooks/useEstimatedFee";

export default function EstimatedFeeNotice({ estimate, isLoading, error, refetch }: EstimatedFee) {
  const message = error
    ? "Unable to estimate fees. Try again before submitting."
    : isLoading || !estimate
      ? "Estimating network fee..."
      : `Est. gas: ${estimate}`;

  return (
    <div
      role={error ? "alert" : undefined}
      className={`text-[10px] ${error ? "text-red-500" : "text-gray-500"}`}
    >
      {message}
      {error && (
        <button type="button" onClick={refetch} className="ml-2 underline">
          Retry fee estimate
        </button>
      )}
    </div>
  );
}
