import { ALBUM_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import { AlbumsResponse } from "@/types";

const useAlbumServices = () => {
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
