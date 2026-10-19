import { ALBUM_ENDPOINTS } from "@/api/api-endpoint";
import { useDelete, useGet, usePatch, usePost } from "@/api/queryClient";
import {
  ALBUM_PUBLISHED_INVALIDATIONS,
  DASHBOARD_CACHE,
  DASHBOARD_QUERY_KEYS,
} from "@/api/cachePolicy";
import { useHandleError, useHandleSuccess } from "@/hooks/useToastHandler";
import { AlbumCreateResponse, AlbumsResponse } from "@/types";

export const ALBUMS_QUERY_KEY = DASHBOARD_QUERY_KEYS.albums;

/** Album as returned by the backend `/albums` resource, with ordered tracks (#528). */
export interface BackendAlbum {
  id: string;
  title: string;
  coverImage?: string | null;
  coverArtUrl?: string | null;
  releaseDate?: string | null;
  tracks?: Array<{ id: string; title?: string; position?: number }>;
}

export interface DashboardAlbum {
  id: string;
  title: string;
  coverArtUrl?: string;
  releaseDate?: string;
  songCount: number;
  /** Track ids in album order. */
  trackIds: string[];
}

/** Maps a backend album to the dashboard shape, keeping track order. */
export function mapBackendAlbum(album: BackendAlbum): DashboardAlbum {
  const tracks = [...(album.tracks ?? [])].sort(
    (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
  );
  return {
    id: album.id,
    title: album.title,
    coverArtUrl: album.coverArtUrl ?? album.coverImage ?? undefined,
    releaseDate: album.releaseDate ?? undefined,
    songCount: tracks.length,
    trackIds: tracks.map((t) => t.id),
  };
}

/** Moves a track within an album's ordered list; out-of-range moves are no-ops. */
export function moveTrack(trackIds: string[], from: number, to: number): string[] {
  if (from < 0 || from >= trackIds.length || to < 0 || to >= trackIds.length) return trackIds;
  const next = [...trackIds];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Only the artist's own, ready songs can be added to an album. */
export function songsAddableToAlbum<T extends { artistId?: string; status?: string }>(
  songs: T[],
  artistId: string
): T[] {
  return songs.filter((s) => s.artistId === artistId && s.status === "ready");
}

export interface UpdateAlbumPayload {
  title?: string;
  releaseDate?: string;
  trackIds?: string[];
}

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
  const useGetAlbums = (enabled: boolean = true, artistId?: string) => {
    const endpoint = artistId ? ALBUM_ENDPOINTS.LIST_FOR_ARTIST(artistId) : ALBUM_ENDPOINTS.LIST;
    const queryKey = artistId ? [...ALBUMS_QUERY_KEY, artistId] : ALBUMS_QUERY_KEY;
    return useGet<AlbumsResponse>(queryKey, endpoint, {
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

  /** Updates album metadata and/or track order (`trackIds`) — persists reordering (#528). */
  const useUpdateAlbum = (albumId: string) => {
    return usePatch<unknown, UpdateAlbumPayload>(ALBUM_ENDPOINTS.UPDATE(albumId), {
      onSuccess() {
        handleSuccess("Album updated.");
      },
      onError(error: Error) {
        handleError(error.message || "Failed to update album.");
      },
      invalidateQueries: [ALBUMS_QUERY_KEY],
    });
  };

  const useDeleteAlbum = (albumId: string) => {
    return useDelete(ALBUM_ENDPOINTS.DELETE(albumId), {
      onSuccess() {
        handleSuccess("Album deleted.");
      },
      onError(error: Error) {
        handleError(error.message || "Failed to delete album.");
      },
      invalidateQueries: [...ALBUM_PUBLISHED_INVALIDATIONS],
    });
  };

  return { useGetAlbums, useCreateAlbum, useUpdateAlbum, useDeleteAlbum };
};

export default useAlbumServices;
