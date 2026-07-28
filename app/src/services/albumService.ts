import { ALBUM_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { AlbumsResponse } from "@/types";

const useAlbumServices = () => {
  /**
   * Fetches the artist's albums, cached for 2 minutes.
   *
   * @param enabled - Set false to skip fetching. Defaults to true.
   * @returns A React Query result: `{ data: AlbumsResponse | undefined, isLoading, isError, error, refetch, ... }`.
   * @throws Never throws directly — request failures surface via the returned `error`/`isError` fields.
   */
  const useGetAlbums = (enabled: boolean = true) => {
    return useGet<AlbumsResponse>(
      ["get-artist-albums"],
      ALBUM_ENDPOINTS.LIST,
      {
        enabled,
        staleTime: 1000 * 60 * 2,
      }
    );
  };

  return { useGetAlbums };
};

export default useAlbumServices;
