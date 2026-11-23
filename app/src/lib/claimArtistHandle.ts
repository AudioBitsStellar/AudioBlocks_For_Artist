/**
 * Handle-only claim lookup. The public page uses the separate UUID/privacy reader.
 *
 * Requires the separately deployed /artist/public/:handle contract. This is
 * deliberately opt-in: a UUID reader's local rejection, or a missing backend
 * route, is not evidence that a handle is free. No result is cached.
 */

/** Normalize claim handles: trim whitespace and an optional @, preserving case. */
export function normalizeArtistHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").trim();
}

export interface PublicArtistProfile {
  id: string;
  handle: string;
  name: string;
  bio?: string;
  profileImage?: string;
  website?: string;
  twitter?: string;
  genres?: string[];
  songCount?: number;
  albumCount?: number;
  listenersCount?: number;
  /**
   * Followers of this artist, when the public payload reports them. Distinct
   * from `listenersCount` (all-time plays) and optional: an API that doesn't
   * send it simply leaves the follower surfaces off the page.
   */
  followersCount?: number;
  joinedAt?: string;
  /** Verification state; only `verified` profiles show the public badge. */
  status?: "verified" | "pending" | "unverified";
}

export type PublicArtistProfileResult =
  | { status: "ok"; profile: PublicArtistProfile }
  | { status: "not-found" }
  | { status: "unavailable" };

function toPublicProfile(payload: unknown): PublicArtistProfile | null {
  const data = (payload as { data?: unknown })?.data ?? payload;
  if (!data || typeof data !== "object") return null;

  const record = data as Record<string, unknown>;
  if (typeof record.handle !== "string" || !record.handle) return null;

  return {
    id:
      typeof record.id === "string" || typeof record.id === "number"
        ? String(record.id)
        : record.handle,
    handle: record.handle,
    name: typeof record.name === "string" && record.name ? record.name : `@${record.handle}`,
    bio: typeof record.bio === "string" ? record.bio : undefined,
    profileImage: typeof record.profileImage === "string" ? record.profileImage : undefined,
    website: typeof record.website === "string" ? record.website : undefined,
    twitter: typeof record.twitter === "string" ? record.twitter : undefined,
    genres: Array.isArray(record.genres)
      ? record.genres.filter((g): g is string => typeof g === "string")
      : undefined,
    songCount: typeof record.songCount === "number" ? record.songCount : undefined,
    albumCount: typeof record.albumCount === "number" ? record.albumCount : undefined,
    listenersCount: typeof record.listenersCount === "number" ? record.listenersCount : undefined,
    followersCount: typeof record.followersCount === "number" ? record.followersCount : undefined,
    joinedAt: typeof record.joinedAt === "string" ? record.joinedAt : undefined,
    status:
      record.status === "verified" || record.status === "pending" || record.status === "unverified"
        ? record.status
        : undefined,
  };
}

/**
 * Looks up a handle for claim availability. Failure never implies availability.
 */
export async function fetchArtistHandleProfile(
  handle: string,
  signal?: AbortSignal
): Promise<PublicArtistProfileResult> {
  // The current backend has no handle lookup. Enable only after validating the
  // deployment contract, including genuine missing-handle 404s and uniqueness.
  if (process.env.NEXT_PUBLIC_ARTIST_HANDLE_LOOKUP_ENABLED !== "true") {
    return { status: "unavailable" };
  }
  // Tolerate a trailing slash so `…/api/` + `/artist/public/x` doesn't double up.
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  const normalizedHandle = normalizeArtistHandle(handle);
  if (!normalizedHandle || !baseUrl) return { status: "unavailable" };

  try {
    const response = await fetch(
      `${baseUrl}/artist/public/${encodeURIComponent(normalizedHandle)}`,
      {
        // Do not cache a missing handle: it may be claimed immediately after this check.
        cache: "no-store",
        signal,
        headers: { Accept: "application/json" },
      }
    );

    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };

    // Malformed success is a contract mismatch, never proof of availability.
    const profile = toPublicProfile(await response.json());
    return profile ? { status: "ok", profile } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
