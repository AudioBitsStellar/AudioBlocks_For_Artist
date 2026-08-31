import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockGet, mockPost, mockHandleSuccess, mockHandleError } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockHandleSuccess: vi.fn(),
  mockHandleError: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn().mockResolvedValue({
    get: mockGet,
    post: mockPost,
  }),
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => mockHandleSuccess,
  useHandleError: () => mockHandleError,
}));

import useAlbumServices from "@/services/albumService";
import { ALBUM_ENDPOINTS } from "@/api/api-endpoint";
import { AlbumsResponse } from "@/types";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function makeWrapper() {
  const client = makeQueryClient();
  const invalidateSpy = vi.spyOn(client, "invalidateQueries");
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { Wrapper, invalidateSpy };
}

const mockAlbum: AlbumsResponse = {
  success: true,
  data: [
    {
      id: "1",
      title: "Test Album",
      artist: "Test Artist",
      coverImage: "https://example.com/cover.jpg",
      releaseDate: "2025-01-01",
      trackCount: 10,
    },
  ],
};

const emptyAlbums: AlbumsResponse = {
  success: true,
  data: [],
};

function makeAlbumFormData(): FormData {
  const fd = new FormData();
  fd.append("albumTitle", "New Album");
  fd.append("genre", "Afrobeats");
  fd.append("songTitle", "Track 1");
  fd.append("purchasePrice", "5");
  fd.append("cover", new Blob(["img"], { type: "image/png" }), "cover.png");
  fd.append("songs", new Blob(["audio"], { type: "audio/mpeg" }), "track1.mp3");
  return fd;
}

describe("useAlbumServices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useGetAlbums", () => {
    it("calls the correct endpoint", async () => {
      mockGet.mockResolvedValueOnce({ data: mockAlbum });
      const { Wrapper } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGet).toHaveBeenCalledWith(ALBUM_ENDPOINTS.LIST, expect.anything());
    });

    it("returns album data on success", async () => {
      mockGet.mockResolvedValueOnce({ data: mockAlbum });
      const { Wrapper } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockAlbum);
      expect(result.current.data?.data).toHaveLength(1);
    });

    it("returns empty list when no albums exist", async () => {
      mockGet.mockResolvedValueOnce({ data: emptyAlbums });
      const { Wrapper } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(0);
    });

    it("handles API errors gracefully", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network error"));
      const { Wrapper } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it("does not fetch when enabled is false", () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAlbumServices().useGetAlbums(false), {
        wrapper: Wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe("useCreateAlbum", () => {
    it("POSTs the FormData to the create endpoint", async () => {
      mockPost.mockResolvedValueOnce({ data: { id: "42", message: "Album uploaded successfully!" } });
      const { Wrapper } = makeWrapper();
      const fd = makeAlbumFormData();

      const { result } = renderHook(() => useAlbumServices().useCreateAlbum(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync(fd);
      });

      expect(mockPost).toHaveBeenCalledWith(ALBUM_ENDPOINTS.CREATE, fd);
    });

    it("shows a success toast (using the server message when present)", async () => {
      mockPost.mockResolvedValueOnce({ data: { id: "42", message: "Custom success" } });
      const { Wrapper } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useCreateAlbum(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync(makeAlbumFormData());
      });

      expect(mockHandleSuccess).toHaveBeenCalledWith("Custom success");
      expect(mockHandleError).not.toHaveBeenCalled();
    });

    it("falls back to a default success message when the server omits one", async () => {
      mockPost.mockResolvedValueOnce({ data: { id: "42" } });
      const { Wrapper } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useCreateAlbum(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync(makeAlbumFormData());
      });

      expect(mockHandleSuccess).toHaveBeenCalledWith("Album uploaded successfully!");
    });

    it("invalidates the albums list query after a successful upload", async () => {
      mockPost.mockResolvedValueOnce({ data: { id: "42", message: "ok" } });
      const { Wrapper, invalidateSpy } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useCreateAlbum(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync(makeAlbumFormData());
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["get-artist-albums"] });
    });

    it("shows an error toast and surfaces isError when the upload fails", async () => {
      mockPost.mockRejectedValueOnce(new Error("Upload rejected by server"));
      const { Wrapper } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useCreateAlbum(), { wrapper: Wrapper });

      await act(async () => {
        await expect(result.current.mutateAsync(makeAlbumFormData())).rejects.toThrow(
          "Upload rejected by server"
        );
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockHandleError).toHaveBeenCalledWith("Upload rejected by server");
      expect(mockHandleSuccess).not.toHaveBeenCalled();
    });

    it("falls back to a default error message when the error has none", async () => {
      mockPost.mockRejectedValueOnce(new Error(""));
      const { Wrapper } = makeWrapper();

      const { result } = renderHook(() => useAlbumServices().useCreateAlbum(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.mutateAsync(makeAlbumFormData()).catch(() => {});
      });

      expect(mockHandleError).toHaveBeenCalledWith("Failed to upload album.");
    });
  });

  describe("service structure", () => {
    it("exposes useGetAlbums and useCreateAlbum", () => {
      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useAlbumServices(), { wrapper: Wrapper });

      expect(typeof result.current.useGetAlbums).toBe("function");
      expect(typeof result.current.useCreateAlbum).toBe("function");
    });
  });
});
