import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import useUploadServices from "@/services/uploadService";
import { ARTIST_UPLOAD_ENDPOINTS } from "@/api/api-endpoint";

const { mockUsePost } = vi.hoisted(() => ({
  mockUsePost: vi.fn(),
}));

vi.mock("@/api/queryClient", () => ({
  usePost: mockUsePost,
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: makeQueryClient() }, children);
}

function mockMutation() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    data: undefined,
    error: null,
    isPending: false,
    isError: false,
    isSuccess: false,
    reset: vi.fn(),
  };
}

describe("useUploadServices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePost.mockReturnValue(mockMutation());
  });

  it("uses the chunk upload endpoint", () => {
    const { result } = renderHook(() => useUploadServices().useUploadChunk(), { wrapper: Wrapper });

    expect(result.current).toBeDefined();
    expect(mockUsePost).toHaveBeenCalledWith(
      ARTIST_UPLOAD_ENDPOINTS.UPLOAD_CHUNK,
      expect.any(Object)
    );
  });

  it("exposes the cover and finalize upload hooks", () => {
    const { result } = renderHook(() => useUploadServices(), { wrapper: Wrapper });

    expect(result.current.useUploadCover).toBeDefined();
    expect(result.current.useFinalizeUpload).toBeDefined();
  });
});
