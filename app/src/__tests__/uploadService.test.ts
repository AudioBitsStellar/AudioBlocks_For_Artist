/**
 * uploadService (#187).
 *
 * The service's hooks run for real on top of React Query; only the network
 * client and the toasts are replaced. The upload flow around them — type and
 * size checks, chunking, progress, cancellation and retry — is exercised with
 * the same helpers the upload form uses (`fileValidation`, `chunkUploader`).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockPost, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  createApiClient: vi.fn().mockResolvedValue({ post: mockPost }),
}));

vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => mockSuccess,
  useHandleError: () => mockError,
}));

import useUploadServices from "@/services/uploadService";
import { ARTIST_UPLOAD_ENDPOINTS } from "@/api/api-endpoint";
import { DASHBOARD_QUERY_KEYS, SONG_PUBLISHED_INVALIDATIONS } from "@/api/cachePolicy";
import { AUDIO_FILE_RULES, validateFile } from "@/utils/fileValidation";
import {
  CHUNK_SIZE,
  getMissingChunkIndices,
  splitFile,
  uploadChunksConcurrently,
} from "@/utils/chunkUploader";

const MB = 1024 * 1024;

let queryClient: QueryClient;

function Wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function audioFile(bytes: number, name = "song.mp3", type = "audio/mpeg") {
  const file = new File([""], name, { type });
  // Allocating hundreds of MB to test the size limit is pointless; size is all
  // the validator and the splitter read.
  Object.defineProperty(file, "size", { value: bytes });
  file.slice = ((start = 0, end = bytes) =>
    new Blob([new Uint8Array(Math.max(0, Math.min(end, bytes) - start))])) as File["slice"];
  return file;
}

function chunkForm(fileId: string, index: number, chunk: Blob) {
  const form = new FormData();
  form.append("fileId", fileId);
  form.append("chunkIndex", String(index));
  form.append("chunk", chunk);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mockPost.mockResolvedValue({ data: { success: true } });
});

describe("useUploadServices — shape", () => {
  it("exposes every upload hook, with useUploadSong as the finalize alias", () => {
    const { result } = renderHook(() => useUploadServices(), { wrapper: Wrapper });

    expect(Object.keys(result.current).sort()).toEqual(
      [
        "useFinalizeUpload",
        "useSuggestTags",
        "useTranscribeLyrics",
        "useUploadChunk",
        "useUploadCover",
        "useUploadSong",
      ].sort()
    );
    expect(result.current.useUploadSong).toBe(result.current.useFinalizeUpload);
  });
});

describe("useUploadChunk", () => {
  it("posts the chunk form data to the chunk endpoint and toasts success", async () => {
    const { result } = renderHook(() => useUploadServices().useUploadChunk(), { wrapper: Wrapper });
    const form = chunkForm("file-1", 0, new Blob(["abc"]));

    await act(() => result.current.mutateAsync(form as never));

    expect(mockPost).toHaveBeenCalledWith(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_CHUNK, form, {
      headers: undefined,
    });
    expect(mockSuccess).toHaveBeenCalledWith("Chunk uploaded successfully!");
  });

  it("surfaces the server's error message", async () => {
    mockPost.mockRejectedValueOnce(new Error("Chunk out of range"));
    const { result } = renderHook(() => useUploadServices().useUploadChunk(), { wrapper: Wrapper });

    await act(async () => {
      await expect(
        result.current.mutateAsync(chunkForm("f", 9, new Blob()) as never)
      ).rejects.toThrow("Chunk out of range");
    });
    expect(mockError).toHaveBeenCalledWith("Chunk out of range");
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("falls back to a generic message when the error has none", async () => {
    mockPost.mockRejectedValueOnce(new Error(""));
    const { result } = renderHook(() => useUploadServices().useUploadChunk(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync(chunkForm("f", 0, new Blob()) as never).catch(() => {});
    });
    expect(mockError).toHaveBeenCalledWith("Failed to upload chunk.");
  });
});

describe("useUploadCover", () => {
  it("posts to the cover endpoint and shows the server's message", async () => {
    mockPost.mockResolvedValueOnce({
      data: { message: "Cover saved", data: { coverArtPath: "covers/a.png" } },
    });
    const { result } = renderHook(() => useUploadServices().useUploadCover(), { wrapper: Wrapper });
    const form = new FormData();
    form.append("cover", new File(["x"], "a.png", { type: "image/png" }));

    const response = await act(() => result.current.mutateAsync(form as never));

    expect(mockPost).toHaveBeenCalledWith(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_COVER, form, {
      headers: undefined,
    });
    expect(response).toEqual({ message: "Cover saved", data: { coverArtPath: "covers/a.png" } });
    expect(mockSuccess).toHaveBeenCalledWith("Cover saved");
  });

  it("uses default success and error messages", async () => {
    const { result } = renderHook(() => useUploadServices().useUploadCover(), { wrapper: Wrapper });
    await act(() => result.current.mutateAsync(new FormData() as never));
    expect(mockSuccess).toHaveBeenCalledWith("Cover uploaded successfully!");

    mockPost.mockRejectedValueOnce(new Error(""));
    await act(async () => {
      await result.current.mutateAsync(new FormData() as never).catch(() => {});
    });
    expect(mockError).toHaveBeenCalledWith("Failed to upload cover.");
  });
});

describe("useFinalizeUpload", () => {
  const payload = {
    fileId: "file-1",
    totalChunks: 3,
    title: "Song",
    description: "",
    genre: "Afrobeats",
    composers: ["A"],
    coverArtPath: "covers/a.png",
  };

  it("posts the metadata and refreshes overview, statistics and activity", async () => {
    mockPost.mockResolvedValueOnce({ data: { message: "Published", data: { id: "song-1" } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUploadServices().useFinalizeUpload(), {
      wrapper: Wrapper,
    });

    const response = await act(() => result.current.mutateAsync(payload as never));

    expect(mockPost).toHaveBeenCalledWith(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_SONG, payload, {
      headers: undefined,
    });
    expect(response).toEqual({ message: "Published", data: { id: "song-1" } });
    expect(mockSuccess).toHaveBeenCalledWith("Published");
    expect(SONG_PUBLISHED_INVALIDATIONS).toContain(DASHBOARD_QUERY_KEYS.overview);
    for (const key of SONG_PUBLISHED_INVALIDATIONS) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    }
  });

  it("does not refresh any cache when finalize fails", async () => {
    mockPost.mockRejectedValueOnce(new Error("MALWARE_DETECTED"));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUploadServices().useFinalizeUpload(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync(payload as never).catch(() => {});
    });

    expect(mockError).toHaveBeenCalledWith("MALWARE_DETECTED");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("uses default messages when the server sends none", async () => {
    const { result } = renderHook(() => useUploadServices().useFinalizeUpload(), {
      wrapper: Wrapper,
    });
    await act(() => result.current.mutateAsync(payload as never));
    expect(mockSuccess).toHaveBeenCalledWith("Song uploaded successfully!");

    mockPost.mockRejectedValueOnce(new Error(""));
    await act(async () => {
      await result.current.mutateAsync(payload as never).catch(() => {});
    });
    expect(mockError).toHaveBeenCalledWith("Failed to finalize upload.");
  });
});

describe("useTranscribeLyrics", () => {
  it("returns the transcription without a success toast", async () => {
    mockPost.mockResolvedValueOnce({ data: { data: { lyrics: "la la", language: "en" } } });
    const { result } = renderHook(() => useUploadServices().useTranscribeLyrics(), {
      wrapper: Wrapper,
    });

    const response = await act(() => result.current.mutateAsync({ fileId: "file-1" } as never));

    expect(mockPost).toHaveBeenCalledWith(
      ARTIST_UPLOAD_ENDPOINTS.TRANSCRIBE_LYRICS,
      { fileId: "file-1" },
      {
        headers: undefined,
      }
    );
    expect(response).toEqual({ data: { lyrics: "la la", language: "en" } });
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("reports a transcription failure", async () => {
    mockPost.mockRejectedValueOnce(new Error(""));
    const { result } = renderHook(() => useUploadServices().useTranscribeLyrics(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({} as never).catch(() => {});
    });
    expect(mockError).toHaveBeenCalledWith("Failed to transcribe lyrics with AI.");
  });
});

describe("useSuggestTags (#542)", () => {
  it("posts the draft to the suggest endpoint and never toasts", async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, data: { tags: ["chill"], genres: ["Jazz"] } },
    });
    const { result } = renderHook(() => useUploadServices().useSuggestTags(), { wrapper: Wrapper });

    const response = await act(() =>
      result.current.mutateAsync({ title: "T", description: "D" } as never)
    );

    expect(mockPost).toHaveBeenCalledWith(
      ARTIST_UPLOAD_ENDPOINTS.SUGGEST_TAGS,
      { title: "T", description: "D" },
      { headers: undefined }
    );
    expect(response).toEqual({ success: true, data: { tags: ["chill"], genres: ["Jazz"] } });
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("stays silent when the AI feature is unavailable", async () => {
    mockPost.mockRejectedValueOnce(new Error("AI budget exceeded"));
    const { result } = renderHook(() => useUploadServices().useSuggestTags(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: "T" } as never).catch(() => {});
    });
    expect(mockError).not.toHaveBeenCalled();
  });
});

describe("uploading a song file", () => {
  async function uploadFile(
    file: File,
    options: {
      isCancelled?: () => boolean;
      onProgress?: (done: number, total: number) => void;
      skip?: number[];
    } = {}
  ) {
    const { result } = renderHook(() => useUploadServices().useUploadChunk(), { wrapper: Wrapper });
    const chunks = splitFile(file);
    const indices = getMissingChunkIndices(chunks.length, options.skip ?? []);
    let done = chunks.length - indices.length;
    await act(() =>
      uploadChunksConcurrently(
        indices,
        async (index) => {
          await result.current.mutateAsync(chunkForm("file-1", index, chunks[index]) as never);
          done += 1;
          options.onProgress?.(done, chunks.length);
        },
        { isCancelled: options.isCancelled }
      )
    );
    return chunks.length;
  }

  const chunkIndicesSent = () =>
    mockPost.mock.calls
      .filter(([endpoint]) => endpoint === ARTIST_UPLOAD_ENDPOINTS.UPLOAD_CHUNK)
      .map(([, form]) => Number((form as FormData).get("chunkIndex")))
      .sort((a, b) => a - b);

  it("accepts a valid audio file and sends every chunk once", async () => {
    const file = audioFile(5 * MB);
    expect(validateFile(file, AUDIO_FILE_RULES)).toEqual({ valid: true, error: null });

    const total = await uploadFile(file);

    expect(total).toBe(Math.ceil((5 * MB) / CHUNK_SIZE));
    expect(chunkIndicesSent()).toEqual([0, 1, 2]);
  });

  it("rejects a non-audio file before anything is sent", () => {
    const result = validateFile(audioFile(MB, "cover.png", "image/png"), AUDIO_FILE_RULES);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Unsupported file type/);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("accepts an audio file the browser reports without a MIME type, by extension", () => {
    expect(validateFile(audioFile(MB, "demo.flac", ""), AUDIO_FILE_RULES).valid).toBe(true);
    expect(validateFile(audioFile(MB, "demo.exe", ""), AUDIO_FILE_RULES).valid).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateFile(audioFile(0), AUDIO_FILE_RULES)).toEqual({
      valid: false,
      error: "Audio file is empty.",
    });
  });

  it("rejects a file over the 200 MB limit, and accepts one exactly at it", () => {
    const over = validateFile(audioFile(200 * MB + 1), AUDIO_FILE_RULES);
    expect(over.valid).toBe(false);
    expect(over.error).toMatch(/File too large\. Audio file must be 200 MB or smaller/);
    expect(validateFile(audioFile(200 * MB), AUDIO_FILE_RULES).valid).toBe(true);
  });

  it("reports progress after each chunk, ending at 100%", async () => {
    const progress: number[] = [];
    await uploadFile(audioFile(9 * MB), {
      onProgress: (done, total) => progress.push(Math.round((done / total) * 100)),
    });

    expect(progress).toEqual([20, 40, 60, 80, 100]);
  });

  it("stops starting new chunks once cancelled", async () => {
    let sent = 0;
    mockPost.mockImplementation(async () => {
      sent += 1;
      return { data: {} };
    });

    await uploadFile(audioFile(20 * MB), { isCancelled: () => sent >= 4 });

    // Three workers are in flight when the fourth chunk lands; nothing after that starts.
    expect(sent).toBeLessThan(10);
    expect(sent).toBeGreaterThanOrEqual(4);
  });

  it("fails the upload on a network error, then retries only the missing chunks", async () => {
    mockPost.mockImplementation(async (_endpoint: string, form: FormData) => {
      if (form.get("chunkIndex") === "2") throw new Error("Network Error");
      return { data: {} };
    });
    const file = audioFile(9 * MB);

    await expect(uploadFile(file)).rejects.toThrow("Network Error");
    expect(mockError).toHaveBeenCalledWith("Network Error");
    const uploaded = chunkIndicesSent().filter((index) => index !== 2);

    mockPost.mockClear();
    mockPost.mockResolvedValue({ data: {} });
    await uploadFile(file, { skip: uploaded });

    expect(chunkIndicesSent()).toEqual(getMissingChunkIndices(5, uploaded));
    expect(chunkIndicesSent()).toContain(2);
  });

  it("splits a file into 2 MB chunks with a short last chunk", () => {
    const chunks = splitFile(audioFile(5 * MB));
    expect(chunks.map((chunk) => chunk.size)).toEqual([2 * MB, 2 * MB, MB]);
    expect(splitFile(audioFile(0))).toEqual([]);
  });
});
