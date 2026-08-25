import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import useArtistServices from "@/services/artistServices";
import { USER_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePut } from "@/api/queryClient";
import type { ApiError } from "@/api/axios";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockHandleSuccess = vi.fn();
const mockHandleError = vi.fn();

const mockQueryState = {
  data: undefined as { user: { id: string; email: string } } | undefined,
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: vi.fn(),
};

const mockMutationState = {
  mutateAsync: vi.fn(),
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null as unknown,
  data: undefined,
  reset: vi.fn(),
};

vi.mock("@/api/queryClient", () => ({
  useGet: vi.fn(() => mockQueryState),
  usePut: vi.fn(() => mockMutationState),
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useHandleError: () => mockHandleError,
  useHandleSuccess: () => mockHandleSuccess,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("artistServices — error handling (issue #104)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations (not just call history) so persistent
    // `mockImplementation(...)` calls from prior tests don't leak into this one.
    vi.mocked(useGet).mockReset();
    vi.mocked(usePut).mockReset();

    // Restore the default happy-path behavior for hooks that don't override.
    vi.mocked(useGet).mockImplementation(() => mockQueryState);
    vi.mocked(usePut).mockImplementation(() => mockMutationState);

    // Reset the simulated query/mutation state fields between tests.
    mockQueryState.data = undefined;
    mockQueryState.isLoading = false;
    mockQueryState.isError = false;
    mockQueryState.error = null;

    mockMutationState.error = null;
    mockMutationState.isError = false;
    mockMutationState.isPending = false;
    mockMutationState.data = undefined;
    mockMutationState.mutateAsync.mockReset();
    mockMutationState.mutate.mockReset();
  });

  describe("hook surface", () => {
    it("exposes useGetArtistProfile and useUpdateArtistProfile", () => {
      const wrapper = makeWrapper();
      const { result } = renderHook(() => useArtistServices(), { wrapper });
      expect(result.current.useGetArtistProfile).toBeDefined();
      expect(result.current.useUpdateArtistProfile).toBeDefined();
    });

    it("calls useGet with the profile endpoint", async () => {
      const wrapper = makeWrapper();
      renderHook(() => useArtistServices().useGetArtistProfile(true), { wrapper });
      expect(useGet).toHaveBeenCalledWith(
        ["get-artist-profile"],
        USER_ENDPOINTS.PROFILE,
        expect.objectContaining({ enabled: true, staleTime: 0 })
      );
    });

    it("calls usePut with the update-profile endpoint", async () => {
      const wrapper = makeWrapper();
      renderHook(() => useArtistServices().useUpdateArtistProfile(), { wrapper });
      expect(usePut).toHaveBeenCalledWith(
        USER_ENDPOINTS.UPDATE_PROFILE,
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      );
    });
  });

  describe("error standardization", () => {
    it("useGetArtistProfile normalizes an ApiError-shaped failure and toasts the full {status, message, code} object", async () => {
      const wrapper = makeWrapper();

      vi.mocked(useGet).mockImplementationOnce(() => ({
        ...mockQueryState,
        isError: true,
        error: { status: 500, message: "Server error from backend", code: "ERR_INTERNAL" },
      }));

      renderHook(() => useArtistServices().useGetArtistProfile(true), { wrapper });

      await waitFor(() => expect(mockHandleError).toHaveBeenCalled());

      // The toast receives the full normalized ApiError.
      const [apiArg] = mockHandleError.mock.calls[0];
      expect(apiArg).toEqual({
        status: 500,
        message: "Server error from backend",
        code: "ERR_INTERNAL",
      });
    });

    it("useGetArtistProfile surfaces a plain Error instance through extractApiError", async () => {
      const wrapper = makeWrapper();

      // A plain JS `Error` is NOT already in `{status, message}` shape (it has
      // no `.status`), so `normalizeError` funnels it through
      // `extractApiError`, which takes the `instanceof Error` branch.
      vi.mocked(useGet).mockImplementationOnce(() => ({
        ...mockQueryState,
        isError: true,
        error: new Error("random failure string"),
      }));

      renderHook(() => useArtistServices().useGetArtistProfile(true), { wrapper });

      await waitFor(() => expect(mockHandleError).toHaveBeenCalled());

      const [apiArg] = mockHandleError.mock.calls[0];
      expect(apiArg).toEqual({ status: 0, message: "random failure string" });
    });

    it("useGetArtistProfile does NOT fire toast on every rerender for the same fingerprint", async () => {
      const wrapper = makeWrapper();

      vi.mocked(useGet).mockImplementation(() => ({
        ...mockQueryState,
        isError: true,
        error: { status: 401, message: "Authentication required" },
      }));

      const { rerender } = renderHook(() => useArtistServices().useGetArtistProfile(true), {
        wrapper,
      });

      await waitFor(() => expect(mockHandleError).toHaveBeenCalledTimes(1));

      rerender();
      rerender();

      // Still only the original toast — the fingerprint dedup prevents spam
      // when React Query re-emits the same error on background refetch.
      expect(mockHandleError).toHaveBeenCalledTimes(1);
    });

    it("useGetArtistProfile fires toast AGAIN when the error fingerprint changes", async () => {
      const wrapper = makeWrapper();

      vi.mocked(useGet).mockImplementationOnce(() => ({
        ...mockQueryState,
        isError: true,
        error: { status: 401, message: "Authentication required" },
      }));

      const { rerender } = renderHook(() => useArtistServices().useGetArtistProfile(true), {
        wrapper,
      });

      await waitFor(() => expect(mockHandleError).toHaveBeenCalledTimes(1));

      // Now switch to a NEW failure (e.g. server error) — the toast must fire again.
      vi.mocked(useGet).mockImplementation(() => ({
        ...mockQueryState,
        isError: true,
        error: { status: 500, message: "Internal Server Error" },
      }));

      rerender();

      await waitFor(() => expect(mockHandleError).toHaveBeenCalledTimes(2));
      expect(mockHandleError.mock.calls[1][0]).toMatchObject({
        status: 500,
        message: "Internal Server Error",
      });
    });

    it("useUpdateArtistProfile propagates the full ApiError to the toast handler", async () => {
      const wrapper = makeWrapper();
      let capturedOptions: { onError?: (error: unknown) => void } = {};

      vi.mocked(usePut).mockImplementationOnce((_endpoint, options) => {
        capturedOptions = (options ?? {}) as { onError?: (error: unknown) => void };
        return mockMutationState;
      });

      renderHook(() => useArtistServices().useUpdateArtistProfile(), { wrapper });

      act(() => {
        capturedOptions.onError?.({ status: 422, message: "Validation failed", code: "VAL_ERR" });
      });

      expect(mockHandleError).toHaveBeenCalledTimes(1);
      const [apiArg] = mockHandleError.mock.calls[0];
      expect(apiArg).toEqual({
        status: 422,
        message: "Validation failed",
        code: "VAL_ERR",
      });
    });

    it("useUpdateArtistProfile normalizes a plain Error instance into ApiError", async () => {
      const wrapper = makeWrapper();
      let capturedOptions: { onError?: (error: unknown) => void } = {};

      vi.mocked(usePut).mockImplementationOnce((_endpoint, options) => {
        capturedOptions = (options ?? {}) as { onError?: (error: unknown) => void };
        return mockMutationState;
      });

      renderHook(() => useArtistServices().useUpdateArtistProfile(), { wrapper });

      act(() => {
        capturedOptions.onError?.(new Error("boom"));
      });

      const [apiArg] = mockHandleError.mock.calls[0];
      // extractApiError omits `code` entirely when it's not present, so we
      // match against the actual returned shape rather than `{ ..., code: undefined }`.
      expect(apiArg).toEqual({ status: 0, message: "boom" });
    });

    it("useUpdateArtistProfile success path surfaces the response message", async () => {
      const wrapper = makeWrapper();
      let capturedOptions: { onSuccess?: (data: unknown) => void } = {};

      vi.mocked(usePut).mockImplementationOnce((_endpoint, options) => {
        capturedOptions = (options ?? {}) as { onSuccess?: (data: unknown) => void };
        return mockMutationState;
      });

      renderHook(() => useArtistServices().useUpdateArtistProfile(), { wrapper });

      act(() => {
        capturedOptions.onSuccess?.({ message: "All set!" });
      });

      expect(mockHandleSuccess).toHaveBeenCalledWith("All set!");
    });

    it("useUpdateArtistProfile success path falls back to a default message", async () => {
      const wrapper = makeWrapper();
      let capturedOptions: { onSuccess?: (data: unknown) => void } = {};

      vi.mocked(usePut).mockImplementationOnce((_endpoint, options) => {
        capturedOptions = (options ?? {}) as { onSuccess?: (data: unknown) => void };
        return mockMutationState;
      });

      renderHook(() => useArtistServices().useUpdateArtistProfile(), { wrapper });

      act(() => {
        capturedOptions.onSuccess?.({});
      });

      expect(mockHandleSuccess).toHaveBeenCalledWith("Profile updated successfully!");
    });
  });

  describe("try/catch safety net", () => {
    it("useGetArtistProfile falls through to a generic toast if extractApiError throws", async () => {
      const wrapper = makeWrapper();

      // Use a plain Error (NOT already-normalized) so normalizeError funnels
      // through extractApiError instead of short-circuiting via the
      // idempotency guard, letting the spy throw.
      const axiosApi = await import("@/api/axios");
      vi.spyOn(axiosApi, "extractApiError").mockImplementationOnce(() => {
        throw new Error("Normalization blew up");
      });

      vi.mocked(useGet).mockImplementationOnce(() => ({
        ...mockQueryState,
        isError: true,
        error: new Error("boom"),
      }));

      renderHook(() => useArtistServices().useGetArtistProfile(true), { wrapper });

      await waitFor(() => expect(mockHandleError).toHaveBeenCalledTimes(1));

      const [apiArg] = mockHandleError.mock.calls[0];
      expect(apiArg).toEqual({
        status: 0,
        message: "An unexpected error occurred while loading your profile.",
      });
    });

    it("useUpdateArtistProfile falls through to a generic toast if extractApiError throws", async () => {
      const wrapper = makeWrapper();
      let capturedOptions: { onError?: (error: unknown) => void } = {};

      vi.mocked(usePut).mockImplementationOnce((_endpoint, options) => {
        capturedOptions = (options ?? {}) as { onError?: (error: unknown) => void };
        return mockMutationState;
      });

      // Plain Error so the idempotency guard doesn't short-circuit and the
      // spy can actually be reached.
      const axiosApi = await import("@/api/axios");
      vi.spyOn(axiosApi, "extractApiError").mockImplementationOnce(() => {
        throw new Error("Normalization blew up");
      });

      renderHook(() => useArtistServices().useUpdateArtistProfile(), { wrapper });

      act(() => {
        capturedOptions.onError?.(new Error("boom"));
      });

      expect(mockHandleError).toHaveBeenCalledTimes(1);
      const [apiArg] = mockHandleError.mock.calls[0];
      expect(apiArg).toEqual({
        status: 0,
        message: "An unexpected error occurred while updating your profile.",
      });
    });
  });
});
