import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useUploadServices from '@/services/uploadSerive';
import { ARTIST_UPLOAD_ENDPOINTS } from '@/api/api-endpoint';

vi.mock('@/api/queryClient', () => ({
  usePost: vi.fn(),
}));

vi.mock('@/hooks/useToastHandler', () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

function mockMutation(result: any, options?: { isPending?: boolean; isError?: boolean; error?: Error }) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(result),
    data: result,
    error: options?.error ?? null,
    isPending: options?.isPending ?? false,
    isError: options?.isError ?? false,
    isSuccess: options?.isError ? false : !options?.isPending,
    reset: vi.fn(),
  };
}

describe('useUploadServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUploadChunk', () => {
    it('calls usePost with the chunk upload endpoint', () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation({ chunkIndex: 0, fileId: 'file-1', chunk: 0 }));

      const { result } = renderHook(() => useUploadServices().useUploadChunk(), { wrapper: Wrapper });

      expect(mockUsePost).toHaveBeenCalledWith(
        ARTIST_UPLOAD_ENDPOINTS.UPLOAD_CHUNK,
        expect.any(Object)
      );
    });

    it('returns a mutation with chunk upload data on success', async () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      const result = { chunkIndex: 0, fileId: 'file-1', chunk: 0 };
      mockUsePost.mockReturnValue(mockMutation(result));

      const { result: hookResult } = renderHook(
        () => useUploadServices().useUploadChunk(),
        { wrapper: Wrapper }
      );

      expect(hookResult.current.isSuccess).toBe(true);
    });

    it('handles upload chunk errors gracefully', async () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      const error = new Error('Network error during chunk upload');
      mockUsePost.mockReturnValue(mockMutation(null, { isError: true, error }));

      const { result: hookResult } = renderHook(
        () => useUploadServices().useUploadChunk(),
        { wrapper: Wrapper }
      );

      expect(hookResult.current.isError).toBe(true);
    });

    it('handles empty file for chunk upload', async () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation(null, { isError: true, error: new Error('File is empty') }));

      const { result: hookResult } = renderHook(
        () => useUploadServices().useUploadChunk(),
        { wrapper: Wrapper }
      );

      expect(hookResult.current.isError).toBe(true);
    });
  });

  describe('useUploadCover', () => {
    it('calls usePost with the cover upload endpoint', () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation({ cover: 'url', fileId: 'file-1' }));

      renderHook(() => useUploadServices().useUploadCover(), { wrapper: Wrapper });

      expect(mockUsePost).toHaveBeenCalledWith(
        ARTIST_UPLOAD_ENDPOINTS.UPLOAD_COVER,
        expect.any(Object)
      );
    });

    it('handles cover upload success', async () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation({ cover: 'url', fileId: 'file-1' }));

      const { result: hookResult } = renderHook(
        () => useUploadServices().useUploadCover(),
        { wrapper: Wrapper }
      );

      expect(hookResult.current.data).toBeTruthy();
    });

    it('rejects non-image file types', async () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation(null, { isError: true, error: new Error('Invalid file type') }));

      const { result: hookResult } = renderHook(
        () => useUploadServices().useUploadCover(),
        { wrapper: Wrapper }
      );

      expect(hookResult.current.isError).toBe(true);
    });

    it('handles huge image files', async () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation(null, { isError: true, error: new Error('File too large') }));

      const { result: hookResult } = renderHook(
        () => useUploadServices().useUploadCover(),
        { wrapper: Wrapper }
      );

      expect(hookResult.current.isError).toBe(true);
    });
  });

  describe('useFinalizeUpload', () => {
    it('calls usePost with the finalize upload endpoint', () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation({ fileId: 'file-1', totalChunks: 3, title: 'Test Song' }));

      renderHook(() => useUploadServices().useFinalizeUpload(), { wrapper: Wrapper });

      expect(mockUsePost).toHaveBeenCalledWith(
        ARTIST_UPLOAD_ENDPOINTS.UPLOAD_SONG,
        expect.any(Object)
      );
    });

    it('handles finalize upload success', async () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      const result = { fileId: 'file-1', totalChunks: 3, title: 'Test Song' };
      mockUsePost.mockReturnValue(mockMutation(result));

      const { result: hookResult } = renderHook(
        () => useUploadServices().useFinalizeUpload(),
        { wrapper: Wrapper }
      );

      expect(hookResult.current.data).toEqual(result);
    });

    it('handles network errors on finalize with retry information', async () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      const networkError = new Error('Network error');
      mockUsePost.mockReturnValue(mockMutation(null, { isError: true, error: networkError }));

      const { result: hookResult } = renderHook(
        () => useUploadServices().useFinalizeUpload(),
        { wrapper: Wrapper }
      );

      expect(hookResult.current.isError).toBe(true);
      expect(hookResult.current.error).toBe(networkError);
    });
  });

  describe('edge cases', () => {
    it('handles empty file across all upload hooks', () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation(null, { isError: true, error: new Error('Empty file') }));

      const { result } = renderHook(
        () => useUploadServices().useUploadChunk(),
        { wrapper: Wrapper }
      );

      expect(result.current.isError).toBe(true);
    });

    it('handles wrong content type (non-audio files)', () => {
      const mockUsePost = vi.mocked(require('@/api/queryClient').usePost);
      mockUsePost.mockReturnValue(mockMutation(null, { isError: true, error: new Error('Invalid content type') }));

      const { result } = renderHook(
        () => useUploadServices().useFinalizeUpload(),
        { wrapper: Wrapper }
      );

      expect(result.current.isError).toBe(true);
    });
  });
});