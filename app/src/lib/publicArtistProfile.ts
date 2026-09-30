/**
 * Server-side reader for a public artist profile (issue #421).
 *
 * The `/artist/[handle]` route is server-rendered so its `<head>` can contain
 * the artist's real name, bio and avatar. That means the profile has to be
 * fetched with plain `fetch` — the shared axios client in `@/api/axios` is
 * browser-oriented (cookie/CSRF/token interceptors).
 *
 * Every failure mode is reported instead of thrown so the route can decide what
 * to render:
 *  - `ok`         → profile found
 *  - `not-found`  → the API says this handle does not exist (route 404s)
 *  - `unavailable`→ the API is unreachable / misconfigured (route degrades and
 *                    asks not to be indexed, so a broken backend never floods
 *                    the index with thin pages)
 */

import { PUBLIC_ARTIST_ENDPOINTS } from "@/api/api-endpoint";

/** How long a rendered profile may be served before it is refetched. */
const REVALIDATE_SECONDS = 300;

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
 * Fetches a public artist profile by handle. Safe to call during
 * `generateMetadata` — it never throws.
 */
export async function fetchPublicArtistProfile(handle: string): Promise<PublicArtistProfileResult> {
  // Tolerate a trailing slash so `…/api/` + `/artist/public/x` doesn't double up.
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  const normalizedHandle = handle.trim().replace(/^@/, "");
  if (!normalizedHandle || !baseUrl) return { status: "unavailable" };

  try {
    const response = await fetch(`${baseUrl}${PUBLIC_ARTIST_ENDPOINTS.PROFILE(normalizedHandle)}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });

    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };

    // A 200 we can't parse is a contract mismatch, not a missing artist:
    // degrade (noindex) rather than 404 a profile that really exists.
    const profile = toPublicProfile(await response.json());
    return profile ? { status: "ok", profile } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * Best-effort display name for a handle, used when the profile could not be
 * fetched so the page still has a sensible title (e.g. `mistybrown` →
 * `Mistybrown`).
 */
export function displayNameFromHandle(handle: string): string {
  return handle
    .trim()
    .replace(/^@/, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
