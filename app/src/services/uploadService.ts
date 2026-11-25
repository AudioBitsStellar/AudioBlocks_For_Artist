import { ARTIST_UPLOAD_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { UploadChunkResponse } from "@/types";
import { FinalizeSongResponse, UploadCoverResponse as UploadCoverResponseType } from "@/types/api";
import { SONG_PUBLISHED_INVALIDATIONS } from "@/api/cachePolicy";

export interface SuggestTagsResponse {
  success?: boolean;
  data?: { tags?: string[]; genres?: string[] };
}

const useUploadServices = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Uploads one chunk of a song's audio file as part of a chunked upload.
   *
   * @returns A React Query mutation: call `.mutate(formData)` or `.mutateAsync(formData)` with a `FormData` containing `fileId`, `chunkIndex`, and `chunk`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useUploadChunk = () => {
    return usePost<UploadChunkResponse>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_CHUNK, {
      onSuccess() {
        handleSuccess("Chunk uploaded successfully!");
      },
      onError(error: Error) {
        handleError(error.message || "Failed to upload chunk.");
      },
    });
  };

  /**
   * Uploads a song's cover art.
   *
   * @returns A React Query mutation: call `.mutate(formData)` or `.mutateAsync(formData)` with a `FormData` containing `fileId` and `cover`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useUploadCover = () => {
    return usePost<UploadCoverResponseType>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_COVER, {
      onSuccess(response: { message?: string }) {
        handleSuccess(response.message || "Cover uploaded successfully!");
      },
      onError(error: Error) {
        handleError(error.message || "Failed to upload cover.");
      },
    });
  };

  /**
   * Finalizes a chunked song upload once all chunks and the cover art have
   * been uploaded, registering the song with its metadata (title,
   * description, genre, composers). Invalidates the overview, statistics and
   * recent-activity caches (issue #121) since a new song changes them.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with `{ fileId, totalChunks, title, description, genre, composers, coverArtPath }`; resolves to a `FinalizeSongResponse`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useFinalizeUpload = () => {
    return usePost<FinalizeSongResponse>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_SONG, {
      onSuccess(response: { message?: string }) {
        handleSuccess(response.message || "Song uploaded successfully!");
      },
      onError(error: Error) {
        handleError(error.message || "Failed to finalize upload.");
      },
      // A newly-published song changes songsPublished/totalEarnings on the
      // overview dashboard (issue #121), plus the statistics and recent
      // activity feeds — bypass their caches so the artist doesn't see
      // stale numbers after uploading.
      invalidateQueries: [...SONG_PUBLISHED_INVALIDATIONS],
    });
  };

  const useTranscribeLyrics = () => {
    return usePost<{ data?: { lyrics?: string; language?: string }; lyrics?: string }>(
      ARTIST_UPLOAD_ENDPOINTS.TRANSCRIBE_LYRICS,
      {
        onError(error: Error) {
          handleError(error.message || "Failed to transcribe lyrics with AI.");
        },
      }
    );
  };

  /**
   * AI-suggested tags and genres for a draft song (#542), from
   * `POST /song/upload/suggest-tags` with `{ title, description }`.
   * Deliberately silent: the suggestions are optional, so a disabled or
   * over-budget AI feature must never toast an error at the artist.
   *
   * @returns A React Query mutation resolving to `{ success, data: { tags, genres } }`.
   */
  const useSuggestTags = () => usePost<SuggestTagsResponse>(ARTIST_UPLOAD_ENDPOINTS.SUGGEST_TAGS);

  return {
    useUploadChunk,
    useUploadCover,
    useFinalizeUpload,
    useUploadSong: useFinalizeUpload,
    useTranscribeLyrics,
    useSuggestTags,
  };
};

export default useUploadServices;
