import { act, renderHook, waitFor } from "@testing-library/react";
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

  it("starts without an estimate and resolves to the live network fee", async () => {
    mockEstimateOperationFeeXlm.mockResolvedValue("~0.05 XLM");

    const { result } = renderHook(() => useEstimatedFee());

    expect(result.current.estimate).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.estimate).toBe("~0.05 XLM");
    expect(result.current.error).toBeNull();
  });

  it("exposes a failure instead of presenting a guessed fee when Horizon is unreachable", async () => {
    const error = new Error("network error");
    mockEstimateOperationFeeXlm.mockRejectedValue(error);

    const { result } = renderHook(() => useEstimatedFee());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.estimate).toBeNull();
    expect(result.current.error).toBe(error);
  });

  it("passes the requested operation count through", async () => {
    mockEstimateOperationFeeXlm.mockResolvedValue("~0.15 XLM");

    renderHook(() => useEstimatedFee(3));

    await waitFor(() => expect(mockEstimateOperationFeeXlm).toHaveBeenCalledWith(3));
  });

  it("can retry a failed estimate", async () => {
    mockEstimateOperationFeeXlm
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce("~0.05 XLM");

    const { result } = renderHook(() => useEstimatedFee());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));

    await act(async () => result.current.refetch());
    await waitFor(() => expect(result.current.estimate).toBe("~0.05 XLM"));
    expect(mockEstimateOperationFeeXlm).toHaveBeenCalledTimes(2);
  });
});
