import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock('@/api/axios', () => ({
  createApiClient: vi.fn().mockResolvedValue({
    get: mockGet,
  }),
}));

import useAlbumServices from '@/services/albumService';
import { ALBUM_ENDPOINTS } from '@/api/api-endpoint';
import { AlbumsResponse } from '@/types';

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

const mockAlbum: AlbumsResponse = {
  success: true,
  data: [
    {
      id: '1',
      title: 'Test Album',
      artist: 'Test Artist',
      coverImage: 'https://example.com/cover.jpg',
      releaseDate: '2025-01-01',
      trackCount: 10,
    },
  ],
};

const emptyAlbums: AlbumsResponse = {
  success: true,
  data: [],
};

describe('useAlbumServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGetAlbums', () => {
    it('calls the correct endpoint', async () => {
      mockGet.mockResolvedValueOnce({ data: mockAlbum });

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith(ALBUM_ENDPOINTS.LIST, expect.anything());
    });

    it('returns album data on success', async () => {
      mockGet.mockResolvedValueOnce({ data: mockAlbum });

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockAlbum);
      expect(result.current.data?.data).toHaveLength(1);
    });

    it('returns empty list when no albums exist', async () => {
      mockGet.mockResolvedValueOnce({ data: emptyAlbums });

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(0);
    });

    it('handles API errors gracefully', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('does not fetch when enabled is false', () => {
      const { result } = renderHook(() => useAlbumServices().useGetAlbums(false), {
        wrapper: Wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('fetches by default when no argument is provided', async () => {
      mockGet.mockResolvedValueOnce({ data: mockAlbum });

      const { result } = renderHook(() => useAlbumServices().useGetAlbums(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  describe('service structure', () => {
    it('returns useGetAlbums function', () => {
      const { result } = renderHook(() => useAlbumServices(), {
        wrapper: Wrapper,
      });

      expect(typeof result.current.useGetAlbums).toBe('function');
    });
  });
});
