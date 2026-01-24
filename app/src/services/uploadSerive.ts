import { ARTIST_UPLOAD_ENDPOINTS, USER_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { updateProfilePayload, UploadChunkResponse, UploadCoverResponse, UploadSong } from "@/types";

const useUploadServices = () => {
    const handleSuccess = useHandleSuccess();
    const handleError = useHandleError();

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

    const useFinalizeUpload = () => {
        return usePost<UploadSong>(ARTIST_UPLOAD_ENDPOINTS.UPLOAD_SONG, {
            onSuccess(response: any) {
                handleSuccess(response.message || "Song uploaded successfully!");
            },
            onError(error) {
                handleError(error.message || "Failed to finalize upload.");
            },
        });
    }

    return {    
        useUploadChunk,
        useUploadCover,
        useFinalizeUpload,
    };
};

export default useUploadServices;
