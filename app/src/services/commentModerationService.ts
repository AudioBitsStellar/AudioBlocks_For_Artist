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

import { COMMENT_MODERATION_ENDPOINTS } from "@/api/api-endpoint";
import { createApiClient } from "@/api/axios";

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

/**
 * In-memory moderation map — removing localStorage persistence (#537).
 * Real moderation decisions now flow to the backend flag/delete endpoints.
 */
let inMemoryModeration: ModerationMap = {};

function normalizeId(id: string | number): string {
  return String(id);
}

/** Full moderation map keyed by comment id. */
export function getModerationMap(): ModerationMap {
  return { ...inMemoryModeration };
}

function persist(map: ModerationMap): ModerationMap {
  inMemoryModeration = map;
  return map;
}

/**
 * Report a comment to platform moderators via the backend flag endpoint.
 */
export async function reportCommentToBackend(
  id: string | number,
  reason: string = "Reported by artist"
): Promise<boolean> {
  try {
    const client = await createApiClient();
    await client.post(COMMENT_MODERATION_ENDPOINTS.REPORT(id), { reason });
    setModerationStatus(id, "flagged", reason);
    return true;
  } catch {
    setModerationStatus(id, "flagged", reason);
    return false;
  }
}

/**
 * Delete a comment on an artist's song via the backend delete endpoint.
 */
export async function deleteCommentOnBackend(
  id: string | number
): Promise<boolean> {
  try {
    const client = await createApiClient();
    await client.delete(COMMENT_MODERATION_ENDPOINTS.DELETE(id));
    removeComment(id);
    return true;
  } catch {
    removeComment(id);
    return false;
  }
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
