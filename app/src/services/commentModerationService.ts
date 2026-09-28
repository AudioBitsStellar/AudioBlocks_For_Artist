/**
 * Fan engagement comment moderation (issue #418).
 *
 * Moderation decisions are recorded locally – there is no moderation endpoint
 * on the backend yet – so the artist's hide/flag/remove actions survive a
 * reload. The functions here are the seam for the real moderation API (see
 * COMMENT_MODERATION_ENDPOINTS); the UI only reads this map.
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

export type ModerationStatus = "visible" | "hidden" | "flagged" | "removed";

export interface ModerationRecord {
  status: ModerationStatus;
  moderatedAt: string;
  reason?: string;
}

export type ModerationMap = Record<string, ModerationRecord>;

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  visible: "Visible",
  hidden: "Hidden",
  flagged: "Flagged",
  removed: "Removed",
};

const STORAGE_KEY = "audioblocks:comment-moderation:v1";

function normalizeId(id: string | number): string {
  return String(id);
}

/** Full moderation map keyed by comment id. Corrupted storage reads as empty. */
export function getModerationMap(): ModerationMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const map: ModerationMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const record = value as Partial<ModerationRecord>;
      if (
        record.status === "visible" ||
        record.status === "hidden" ||
        record.status === "flagged" ||
        record.status === "removed"
      ) {
        map[key] = {
          status: record.status,
          moderatedAt:
            typeof record.moderatedAt === "string" ? record.moderatedAt : new Date().toISOString(),
          reason: typeof record.reason === "string" ? record.reason : undefined,
        };
      }
    }
    return map;
  } catch {
    return {};
  }
}

function persist(map: ModerationMap): ModerationMap {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      // storage unavailable (private mode) – callers still get the result
    }
  }
  return map;
}

/** Effective status for a single comment; anything unknown is "visible". */
export function getModerationStatus(id: string | number): ModerationStatus {
  return getModerationMap()[normalizeId(id)]?.status ?? "visible";
}

/** Records a moderation decision for one comment. */
export function setModerationStatus(
  id: string | number,
  status: ModerationStatus,
  reason?: string
): ModerationMap {
  const map = getModerationMap();
  map[normalizeId(id)] = {
    status,
    moderatedAt: new Date().toISOString(),
    reason,
  };
  return persist(map);
}

/** Applies one decision to many comments (bulk approve / hide / flag). */
export function bulkSetModerationStatus(
  ids: Array<string | number>,
  status: ModerationStatus,
  reason?: string
): ModerationMap {
  const map = getModerationMap();
  const moderatedAt = new Date().toISOString();
  for (const id of ids) {
    map[normalizeId(id)] = { status, moderatedAt, reason };
  }
  return persist(map);
}

/** Soft-deletes a comment from the artist's feed (restorable). */
export function removeComment(id: string | number): ModerationMap {
  return setModerationStatus(id, "removed", "Removed by the artist");
}

/** Puts a comment back in front of fans. */
export function restoreComment(id: string | number): ModerationMap {
  const map = getModerationMap();
  delete map[normalizeId(id)];
  return persist(map);
}

/** Clears every local decision – used by tests and the "reset" escape hatch. */
export function clearModeration(): void {
  persist({});
}
