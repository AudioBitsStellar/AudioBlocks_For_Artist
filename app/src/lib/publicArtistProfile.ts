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
 *  - `not-found`  → the API says this ID does not exist (route 404s)
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
  | { status: "private" }
  | { status: "not-found" }
  | { status: "unavailable" };

function toPublicProfile(payload: unknown): PublicArtistProfile | null {
  const data = (payload as { data?: unknown })?.data;
  if (!data || typeof data !== "object") return null;
  const { profile, openGraph } = data as {
    profile?: Record<string, unknown>;
    openGraph?: Record<string, unknown>;
  };
  if (!profile || typeof profile.id !== "string") return null;
  const text = (value: unknown) => (typeof value === "string" && value ? value : undefined);
  return {
    id: profile.id,
    handle: text(profile.username) ?? profile.id,
    name: text(openGraph?.title) ?? text(profile.name) ?? text(profile.username) ?? "Artist",
    bio: text(openGraph?.description) ?? text(profile.bio),
    profileImage: text(openGraph?.image) ?? text(profile.profileImage),
    website: text(profile.website),
    twitter: text(profile.twitterUsername),
  };
}

/** ID-based URLs match the backend's canonical /artist/:id/metadata contract. */
export async function fetchPublicArtistProfile(
  artistId: string
): Promise<PublicArtistProfileResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  const id = artistId.trim();
  if (!id || !baseUrl) return { status: "unavailable" };
  // User IDs are UUIDs. Handles cannot be resolved by the current backend.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { status: "not-found" };
  }
  try {
    // The metadata route does not check isProfilePublic. Always check the
    // privacy endpoint first and do not cache this decision.
    const visibility = await fetch(`${baseUrl}${PUBLIC_ARTIST_ENDPOINTS.VISIBILITY(id)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (visibility.status === 404) return { status: "not-found" };
    if (visibility.status === 403) return { status: "private" };
    if (!visibility.ok) return { status: "unavailable" };
    const publicBody = await visibility.json();
    if (publicBody?.data?.private === true) return { status: "private" };
    if (publicBody?.data?.id !== id) return { status: "unavailable" };
    const response = await fetch(`${baseUrl}${PUBLIC_ARTIST_ENDPOINTS.PROFILE(id)}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) return { status: "not-found" };
    if (response.status === 403) return { status: "private" };
    if (!response.ok) return { status: "unavailable" };
    const profile = toPublicProfile(await response.json());
    return profile && profile.id === id ? { status: "ok", profile } : { status: "unavailable" };
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
