import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEstimateOperationFeeXlm = vi.hoisted(() => vi.fn());

vi.mock("@/lib/horizon", () => ({
  estimateOperationFeeXlm: mockEstimateOperationFeeXlm,
}));

import { useEstimatedFee } from "@/hooks/useEstimatedFee";

describe("useEstimatedFee", () => {
  beforeEach(() => {
    mockEstimateOperationFeeXlm.mockReset();
  });

  it("starts loading with the static fallback and resolves to the live estimate", async () => {
    mockEstimateOperationFeeXlm.mockResolvedValue("~0.05 XLM");

    const { result } = renderHook(() => useEstimatedFee());

    expect(result.current.estimate).toBe("~0.001 XLM");
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.estimate).toBe("~0.05 XLM");
  });

  it("falls back to the static estimate if Horizon is unreachable", async () => {
    mockEstimateOperationFeeXlm.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useEstimatedFee());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.estimate).toBe("~0.001 XLM");
  });

  it("passes the requested operation count through", async () => {
    mockEstimateOperationFeeXlm.mockResolvedValue("~0.15 XLM");

    renderHook(() => useEstimatedFee(3));

    await waitFor(() => expect(mockEstimateOperationFeeXlm).toHaveBeenCalledWith(3));
  });
});
