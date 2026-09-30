/**
 * Album / EP release drafting (#398).
 *
 * Pure helpers behind the release creation flow: track list operations,
 * per-type track-count rules, validation, and the multipart payload sent to
 * `POST /artist/albums`.
 */

export type ReleaseType = "album" | "ep";

export interface DraftTrack {
  id: number;
  title: string;
  file: File | null;
}

export interface ReleaseDraft {
  type: ReleaseType;
  title: string;
  genre: string;
  purchasePrice: string;
  releaseDate: string; // yyyy-mm-dd, optional
  cover: File | null;
  tracks: DraftTrack[];
}

/** Industry-standard track-count bounds per release type. */
export const TRACK_LIMITS: Record<ReleaseType, { min: number; max: number }> = {
  ep: { min: 2, max: 6 },
  album: { min: 7, max: 30 },
};

export const RELEASE_TYPE_LABELS: Record<ReleaseType, string> = {
  album: "Album",
  ep: "EP",
};

export const MAX_TITLE_LENGTH = 100;

export function emptyDraft(type: ReleaseType = "album"): ReleaseDraft {
  return {
    type,
    title: "",
    genre: "",
    purchasePrice: "",
    releaseDate: "",
    cover: null,
    tracks: [],
  };
}

// ── Track list operations (immutable) ────────────────────────────────────────

export function addTrack(tracks: DraftTrack[], id: number, file: File | null = null): DraftTrack[] {
  const title = file ? file.name.replace(/\.[^.]+$/, "") : "";
  return [...tracks, { id, title, file }];
}

export function removeTrack(tracks: DraftTrack[], id: number): DraftTrack[] {
  return tracks.filter((t) => t.id !== id);
}

export function updateTrack(
  tracks: DraftTrack[],
  id: number,
  patch: Partial<Omit<DraftTrack, "id">>
): DraftTrack[] {
  return tracks.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

/** Move a track one position up (-1) or down (+1); no-op at the edges. */
export function moveTrack(tracks: DraftTrack[], id: number, direction: -1 | 1): DraftTrack[] {
  const from = tracks.findIndex((t) => t.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= tracks.length) return tracks;
  const next = [...tracks];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

// ── Validation ───────────────────────────────────────────────────────────────

export type DetailsErrors = Partial<
  Record<"title" | "genre" | "purchasePrice" | "releaseDate" | "cover", string>
>;

export function validateDetails(draft: ReleaseDraft, today = new Date()): DetailsErrors {
  const errors: DetailsErrors = {};
  const label = RELEASE_TYPE_LABELS[draft.type];
  const title = draft.title.trim();
  if (!title) errors.title = `${label} title is required`;
  else if (title.length > MAX_TITLE_LENGTH)
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
  if (!draft.genre) errors.genre = "Please select a genre";
  const price = draft.purchasePrice.trim();
  if (price && (Number.isNaN(Number(price)) || Number(price) < 0)) {
    errors.purchasePrice = "Price must be a valid non-negative number";
  }
  if (draft.releaseDate) {
    const date = new Date(`${draft.releaseDate}T00:00:00`);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (Number.isNaN(date.getTime())) errors.releaseDate = "Enter a valid date";
    else if (date < startOfToday) errors.releaseDate = "Release date can't be in the past";
  }
  if (!draft.cover) errors.cover = "Add a cover image";
  return errors;
}

export interface TracksValidation {
  /** List-level problem (count out of range), if any. */
  list?: string;
  /** Per-track problems keyed by track id. */
  tracks: Record<number, string>;
}

export function validateTracks(draft: ReleaseDraft): TracksValidation {
  const { min, max } = TRACK_LIMITS[draft.type];
  const label = RELEASE_TYPE_LABELS[draft.type];
  const result: TracksValidation = { tracks: {} };
  const count = draft.tracks.length;
  if (count < min || count > max) {
    result.list = `An ${label === "Album" ? "album" : "EP"} needs ${min}–${max} tracks (currently ${count})`;
  }
  const seen = new Map<string, number>();
  for (const t of draft.tracks) {
    const title = t.title.trim();
    if (!t.file) result.tracks[t.id] = "Choose an audio file";
    else if (!title) result.tracks[t.id] = "Track title is required";
    else if (title.length > MAX_TITLE_LENGTH)
      result.tracks[t.id] = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
    else {
      const key = title.toLowerCase();
      if (seen.has(key)) result.tracks[t.id] = "Duplicate track title";
      seen.set(key, t.id);
    }
  }
  return result;
}

export function isDraftValid(draft: ReleaseDraft, today = new Date()): boolean {
  const tracks = validateTracks(draft);
  return (
    Object.keys(validateDetails(draft, today)).length === 0 &&
    !tracks.list &&
    Object.keys(tracks.tracks).length === 0
  );
}

/** Suggest EP vs album from the number of tracks (<=6 -> EP). */
export function suggestReleaseType(trackCount: number): ReleaseType {
  return trackCount <= TRACK_LIMITS.ep.max ? "ep" : "album";
}

// ── Payload ──────────────────────────────────────────────────────────────────

/**
 * Multipart payload for `POST /artist/albums`. Keeps the existing fields
 * (`albumTitle`, `genre`, `songTitle`, `purchasePrice`, `cover`, `songs`) so
 * the current backend keeps working, and adds `releaseType`, `releaseDate`
 * and `trackTitles` (JSON array, same order as `songs`).
 */
export function buildReleaseFormData(draft: ReleaseDraft): FormData {
  if (!draft.cover) throw new Error("Cover image is required");
  const tracks = draft.tracks.filter((t): t is DraftTrack & { file: File } => !!t.file);
  const fd = new FormData();
  fd.append("releaseType", draft.type);
  fd.append("albumTitle", draft.title.trim());
  fd.append("genre", draft.genre);
  fd.append("songTitle", tracks[0]?.title.trim() ?? "");
  fd.append("purchasePrice", draft.purchasePrice.trim());
  if (draft.releaseDate) fd.append("releaseDate", draft.releaseDate);
  fd.append("cover", draft.cover);
  tracks.forEach((t) => fd.append("songs", t.file));
  fd.append("trackTitles", JSON.stringify(tracks.map((t) => t.title.trim())));
  return fd;
}
