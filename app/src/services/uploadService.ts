import { ARTIST_UPLOAD_ENDPOINTS, USER_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { updateProfilePayload, UploadChunkResponse, UploadCoverResponse, UploadSong } from "@/types";
import { OVERVIEW_QUERY_KEY } from "@/services/overviewService";

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
            onSuccess(response: any) {

                handleSuccess(response.message || "Chunk uploaded successfully!");
                return response;
            },
            onError(error) {
                handleError(error.message || "Failed to upload chunk.");
            },
        });
    }

    /**
     * Uploads a song's cover art.
     *
     * @returns A React Query mutation: call `.mutate(formData)` or `.mutateAsync(formData)` with a `FormData` containing `fileId` and `cover`.
     * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
     */
    const useUploadCover = () => {
        return usePost<any>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_COVER, {
            onSuccess(response: any) {
                handleSuccess(response.message || "Cover uploaded successfully!");
                return response;
            },
            onError(error) {
                handleError(error.message || "Failed to upload cover.");
            },
        });
    }

    /**
     * Finalizes a chunked song upload once all chunks and the cover art have
     * been uploaded, registering the song with its metadata (title,
     * description, genre, composers). Invalidates the overview cache
     * (issue #121) since a new song changes its KPIs.
     *
     * @returns A React Query mutation: call `.mutate(payload)` or `.mutateAsync(payload)` with `{ fileId, totalChunks, title, description, genre, composers, coverArtPath }`; resolves to an `UploadSong`.
     * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
     */
    const useFinalizeUpload = () => {
        return usePost<UploadSong>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_SONG, {
            onSuccess(response: any) {
                handleSuccess(response.message || "Song uploaded successfully!");
            },
            onError(error) {
                handleError(error.message || "Failed to finalize upload.");
            },
            // A newly-published song changes songsPublished/totalEarnings on
            // the overview dashboard (issue #121) — bypass its cache so the
            // artist doesn't see stale KPIs after uploading.
            invalidateQueries: [OVERVIEW_QUERY_KEY],
        });
    }

    return {    
        useUploadChunk,
        useUploadCover,
        useFinalizeUpload,
    };
};

export default useUploadServices;
