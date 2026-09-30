/**
 * Track visibility settings — public, unlisted and private (#458).
 *
 * Two separate jobs, because this repo can only do one of them:
 *
 *  1. The *rules*. What each mode permits, for each kind of viewer, lives here
 *     once, so no surface invents its own meaning for "unlisted".
 *  2. The *artist's choice*. There is no song GET/PATCH surface that carries a
 *     visibility yet, so the choice is persisted locally — the same
 *     localStorage stand-in used by verificationService.ts and
 *     collaboratorService.ts until the API ships it.
 *
 * Enforcement for listeners is necessarily server-side: this console renders no
 * buyer-facing track list (`/artist/[handle]` shows a profile and a
 * `songCount`, never track rows), so a `private` track cannot be hidden here
 * from someone who hits the API directly. What this module fixes is the
 * contract the API has to honour — the field name `visibility` and exactly
 * these three values, sent on the create and edit payloads.
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

export type TrackVisibility = "public" | "unlisted" | "private";

/** Who is asking. `link` means they arrived with a direct link, not via a catalog. */
export type ViewerKind = "owner" | "link" | "visitor";

/** What a viewer may do with a track at a given visibility. */
export interface VisibilityPermissions {
  /** Listed in catalogs and search results. */
  discoverable: boolean;
  /** Playable at all by this viewer. */
  playable: boolean;
  /** Given out as a link the artist can pass on. */
  shareable: boolean;
}

export interface VisibilityOption {
  value: TrackVisibility;
  label: string;
  /** One line, shown to the artist wherever the mode is chosen. */
  summary: string;
}

export const TRACK_VISIBILITIES: readonly TrackVisibility[] = ["public", "unlisted", "private"];

/**
 * A record that predates this feature has no visibility at all, and it was
 * listed — defaulting those to `private` would silently hide an artist's
 * existing catalog behind a setting they never chose.
 */
export const LEGACY_DEFAULT_VISIBILITY: TrackVisibility = "public";

/** A track being uploaded has never been heard by anyone, so it starts private. */
export const NEW_TRACK_DEFAULT_VISIBILITY: TrackVisibility = "private";

const STORAGE_KEY = "audioblocks:track-visibility:v1";

interface VisibilityOverride {
  visibility: TrackVisibility;
  /** ISO timestamp, kept so a later sync can tell the local choice from a stale one. */
  updatedAt: string;
}

/** The rules, stated once. The owner row is handled separately below. */
const LISTENER_RULES: Record<TrackVisibility, VisibilityPermissions> = {
  public: { discoverable: true, playable: true, shareable: true },
  unlisted: { discoverable: false, playable: true, shareable: true },
  private: { discoverable: false, playable: false, shareable: false },
};

export const TRACK_VISIBILITY_OPTIONS: readonly VisibilityOption[] = [
  { value: "public", label: "Public", summary: "Anyone can find it and play it." },
  {
    value: "unlisted",
    label: "Unlisted",
    summary: "Left out of search and catalogs, but anyone with the link can play it.",
  },
  { value: "private", label: "Private", summary: "Only you can see or play it." },
];

export function isTrackVisibility(value: unknown): value is TrackVisibility {
  return typeof value === "string" && (TRACK_VISIBILITIES as readonly string[]).includes(value);
}

/** Coerces anything (an API field, stored JSON) to a visibility, or to `fallback`. */
export function resolveTrackVisibility(
  value: unknown,
  fallback: TrackVisibility = LEGACY_DEFAULT_VISIBILITY
): TrackVisibility {
  return isTrackVisibility(value) ? value : fallback;
}

function readOverrides(): Record<string, VisibilityOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const overrides: Record<string, VisibilityOverride> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      const candidate = entry as Partial<VisibilityOverride> | null;
      if (!candidate || typeof candidate !== "object" || !isTrackVisibility(candidate.visibility)) {
        continue;
      }
      overrides[key] = {
        visibility: candidate.visibility,
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
      };
    }
    return overrides;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, VisibilityOverride>): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    return true;
  } catch {
    // Storage is unavailable (private browsing, quota) — the caller still gets a result.
    return false;
  }
}

/** Everything this artist has chosen locally, keyed by track id. */
export function listVisibilityOverrides(): Record<string, TrackVisibility> {
  const stored = readOverrides();
  const result: Record<string, TrackVisibility> = {};
  for (const [key, entry] of Object.entries(stored)) result[key] = entry.visibility;
  return result;
}

/** The locally stored choice for one track, if the artist ever made one. */
export function getStoredVisibility(trackId: string | number): TrackVisibility | undefined {
  return readOverrides()[String(trackId)]?.visibility;
}

/**
 * The visibility a track has right now.
 *
 * A value that travels with the record wins over the local choice: once the
 * API carries `visibility`, an edit made elsewhere must not be overridden by a
 * stale click in this browser.
 */
export function getTrackVisibility(source: {
  id: string | number;
  visibility?: unknown;
}): TrackVisibility {
  if (isTrackVisibility(source.visibility)) return source.visibility;
  return getStoredVisibility(source.id) ?? LEGACY_DEFAULT_VISIBILITY;
}

/**
 * Records the artist's choice for one track.
 * @returns false when the value isn't a visibility or storage rejected the write.
 */
export function setTrackVisibility(trackId: string | number, visibility: TrackVisibility): boolean {
  if (!isTrackVisibility(visibility)) return false;
  const overrides = readOverrides();
  overrides[String(trackId)] = { visibility, updatedAt: new Date().toISOString() };
  return writeOverrides(overrides);
}

/** Drops the local choice so the track falls back to its record or the legacy default. */
export function clearTrackVisibility(trackId: string | number): boolean {
  const overrides = readOverrides();
  const key = String(trackId);
  if (!(key in overrides)) return false;
  delete overrides[key];
  return writeOverrides(overrides);
}

/** The permissions a given viewer has on a track at the given visibility. */
export function visibilityPermissions(
  visibility: TrackVisibility,
  viewer: ViewerKind
): VisibilityPermissions {
  if (viewer === "owner") return { discoverable: true, playable: true, shareable: true };
  return LISTENER_RULES[visibility];
}

/** Anything with an id and an optional visibility — a fixture song or an API `SongMeta`. */
export interface VisibilitySource {
  id: string | number;
  visibility?: unknown;
}

/**
 * The catalog a given viewer is allowed to see, in the order it came in.
 * Every surface that lists tracks for someone other than the artist calls this.
 */
export function filterCatalog<T extends VisibilitySource>(
  tracks: readonly T[],
  viewer: ViewerKind
): T[] {
  return tracks.filter(
    (track) => visibilityPermissions(getTrackVisibility(track), viewer).discoverable
  );
}

/** Label for the mode, for badges and selects. */
export function visibilityLabel(visibility: TrackVisibility): string {
  return (
    TRACK_VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label ?? visibility
  );
}

/**
 * The one-line explanation of a mode, extended with what the artist's own
 * list can rely on: an unlisted track is reachable by link but absent from
 * catalogs, and a private one is neither.
 */
export function describeVisibility(visibility: TrackVisibility): string {
  const option = TRACK_VISIBILITY_OPTIONS.find((entry) => entry.value === visibility);
  return option?.summary ?? "Unknown visibility.";
}
