import { ALBUM_ENDPOINTS } from "@/api/api-endpoint";
import { useGet, usePost } from "@/api/queryClient";
import {
  ALBUM_PUBLISHED_INVALIDATIONS,
  DASHBOARD_CACHE,
  DASHBOARD_QUERY_KEYS,
} from "@/api/cachePolicy";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { AlbumCreateResponse, AlbumsResponse } from "@/types";

export const ALBUMS_QUERY_KEY = DASHBOARD_QUERY_KEYS.albums;

const useAlbumServices = () => {
  const handleSuccess = useHandleSuccess();
  const handleError = useHandleError();

  /**
   * Fetches the artist's albums, cached for 2 minutes.
   *
   * @param enabled - Set false to skip fetching. Defaults to true.
   * @returns A React Query result: `{ data: AlbumsResponse | undefined, isLoading, isError, error, refetch, ... }`.
   * @throws Never throws directly — request failures surface via the returned `error`/`isError` fields.
   */
  const useGetAlbums = (enabled: boolean = true) => {
    return useGet<AlbumsResponse>(ALBUMS_QUERY_KEY, ALBUM_ENDPOINTS.LIST, {
      enabled,
      staleTime: DASHBOARD_CACHE.albums,
    });
  };

  /**
   * Creates a new album, uploading its cover art and song files as multipart
   * form data.
   *
   * @returns A React Query mutation: call `.mutate(formData)` or `.mutateAsync(formData)` with a `FormData` containing `albumTitle`, `genre`, `songTitle`, `purchasePrice`, `cover`, and one or more `songs` entries.
   * @throws Never throws directly — failures surface via the `onError` toast and the mutation's `error`/`isError` fields.
   */
  const useCreateAlbum = () => {
    return usePost<AlbumCreateResponse, FormData>(ALBUM_ENDPOINTS.CREATE, {
      onSuccess(response: AlbumCreateResponse & { message?: string }) {
        handleSuccess(response.message || "Album uploaded successfully!");
      },
      onError(error: Error) {
        handleError(error.message || "Failed to upload album.");
      },
      // A new album changes the albums list and the overview/statistics/activity summaries.
      invalidateQueries: [...ALBUM_PUBLISHED_INVALIDATIONS],
    });
  };

  return { useGetAlbums, useCreateAlbum };
};

export default useAlbumServices;
