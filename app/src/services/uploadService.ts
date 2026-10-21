import { ARTIST_UPLOAD_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { TOAST_IDS } from "@/lib/toastIds";
import { UploadChunkResponse, UploadSong } from "@/types";
import { UploadCoverResponse as UploadCoverResponseType } from "@/types/api";
import { SONG_PUBLISHED_INVALIDATIONS } from "@/api/cachePolicy";

const useUploadServices = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Uploads one chunk of a song's audio file as part of a chunked upload.
   * Chunks don't toast on success (a song is dozens of chunks); the upload's
   * single success toast comes from `useFinalizeUpload`.
   *
   * @returns A React Query mutation: call `.mutate(formData)` or `.mutateAsync(formData)` with a `FormData` containing `fileId`, `chunkIndex`, and `chunk`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useUploadChunk = () => {
    return usePost<UploadChunkResponse>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_CHUNK, {
      onError(error: Error) {
        handleError(error.message || "Failed to upload chunk.", undefined, {
          id: TOAST_IDS.upload,
        });
      },
    });
  };

  /**
   * Uploads a song's cover art. Like chunks, this is one step of the upload,
   * so it only toasts on failure.
   *
   * @returns A React Query mutation: call `.mutate(formData)` or `.mutateAsync(formData)` with a `FormData` containing `fileId` and `cover`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useUploadCover = () => {
    return usePost<UploadCoverResponseType>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_COVER, {
      onError(error: Error) {
        handleError(error.message || "Failed to upload cover.", undefined, {
          id: TOAST_IDS.upload,
        });
      },
    });
  };

  /**
   * Finalizes a chunked song upload once all chunks and the cover art have
   * been uploaded, registering the song with its metadata (title,
   * description, genre, composers). Invalidates the overview, statistics and
   * recent-activity caches (issue #121) since a new song changes them.
   *
   * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with `{ fileId, totalChunks, title, description, genre, composers, coverArtPath }`; resolves to an `UploadSong`.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useFinalizeUpload = () => {
    return usePost<UploadSong>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_SONG, {
      onSuccess(response: { message?: string }) {
        handleSuccess(response.message || "Song uploaded successfully!", { id: TOAST_IDS.upload });
      },
      onError(error: Error) {
        handleError(error.message || "Failed to finalize upload.", undefined, {
          id: TOAST_IDS.upload,
        });
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

  return {
    useUploadChunk,
    useUploadCover,
    useFinalizeUpload,
    useUploadSong: useFinalizeUpload,
    useTranscribeLyrics,
  };
};

export default useUploadServices;
