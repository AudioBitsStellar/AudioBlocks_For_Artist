/**
 * Admin-only artist search / discovery (issue #420).
 *
 * Backs the admin directory so platform staff can find an artist by name,
 * handle, email or wallet and jump to their public profile. Read-only: this
 * service never mutates artist data, so it only wraps `useGet`.
 *
 * Authorization is enforced by the backend — the `admin` account role is only
 * checked client-side to decide whether to render the UI at all (see
 * `getAccountRoleFromToken` in `@/utils/jwt` and the RBAC notes in
 * `src/context/RBAC.md`).
 */

import { useGet } from "@/api/queryClient";
import { ADMIN_ARTIST_ENDPOINTS, type ArtistDirectoryStatus } from "@/api/api-endpoint";
import { CACHE_TIME } from "@/api/cachePolicy";
import type { ArtistDirectoryEntry, ArtistDirectoryResponse } from "@/types/api";

// Response types live in the central `@/types/api` module (#140); re-exported
// here so existing imports from this service keep working.
export type { ArtistDirectoryEntry, ArtistDirectoryResponse } from "@/types/api";

export interface ArtistSearchParams {
  /** Free-text query. An empty string lists the whole directory. */
  query?: string;
  page?: number;
  limit?: number;
  status?: ArtistDirectoryStatus;
}

const ADMIN_ARTIST_DIRECTORY_QUERY_KEY = "admin-artist-directory";

const artistsQueryKey = (params: Required<ArtistSearchParams>) => [
  ADMIN_ARTIST_DIRECTORY_QUERY_KEY,
  params,
];

/** Normalizes an untrusted response into a list of directory rows. */
export function toArtistDirectoryEntries(response: ArtistDirectoryResponse | undefined) {
  const rows = response?.data;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is ArtistDirectoryEntry => Boolean(row?.id && row?.handle));
}

export const artistDirectoryStatuses: ReadonlyArray<ArtistDirectoryStatus> = [
  "all",
  "verified",
  "pending",
  "unverified",
];

const useArtistDirectoryService = () => {
  /**
   * Searches the artist directory.
   *
   * Callers pass `enabled: false` until they have confirmed the session
   * carries the platform `admin` role, so a non-admin never fires a request
   * that would 403. Search input is debounced by the caller, so each call is a
   * discrete query rather than a keystroke-by-keystroke request.
   *
   * @param params - Search term, page (1-based), page size and verification filter.
   * @param enabled - Whether the query should run.
   */
  const useSearchArtists = (params: ArtistSearchParams = {}, enabled: boolean = true) => {
    const normalized: Required<ArtistSearchParams> = {
      query: params.query ?? "",
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status ?? "all",
    };

    return useGet<ArtistDirectoryResponse>(
      artistsQueryKey(normalized),
      ADMIN_ARTIST_ENDPOINTS.SEARCH(
        normalized.query,
        normalized.page,
        normalized.limit,
        normalized.status
      ),
      {
        enabled,
        staleTime: CACHE_TIME.SHORT,
      }
    );
  };

  return { useSearchArtists };
};

export default useArtistDirectoryService;
