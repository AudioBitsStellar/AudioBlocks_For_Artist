/**
 * Audit trail for team member actions (#461).
 *
 * The artist workspace is becoming multi-user (#460), so "who changed what,
 * when, and were they allowed to" has to stop being implicit. There's no audit
 * backend yet, so this mirrors the localStorage-backed stand-ins the repo
 * already sanctions (`notificationPreferences.ts`, `emailVerificationService.ts`)
 * and is written so a real backend can replace the storage calls without
 * touching the UI.
 *
 * Two rules shape the API:
 *  1. Denied attempts are recorded alongside successes — an audit trail that
 *     only logs the things that worked cannot show an attempted abuse.
 *  2. Recording never throws and never blocks the action it describes. Losing
 *     an audit entry is bad; failing a payout because the log was full is worse.
 *
 * Pure functions – no React deps so it can be tested in isolation.
 */

import type { Role } from "@/types/role";

/** The workspace the entry belongs to. Single-workspace today; scoped for the backend. */
export const AUDIT_WORKSPACE = "artist";

/** Actions an artist workspace can record. */
export type AuditAction =
  | "member.invited"
  | "member.joined"
  | "member.invite_revoked"
  | "member.role_changed"
  | "member.removed"
  | "content.created"
  | "content.updated"
  | "content.deleted"
  | "settings.updated";

export type AuditOutcome = "success" | "denied";

/** Who performed the action. */
export interface AuditActor {
  id: string;
  name: string;
  role: Role;
}

export interface AuditLogEntry {
  id: string;
  /** Epoch ms the action was recorded at. */
  at: number;
  workspace: string;
  actor: AuditActor;
  action: AuditAction;
  outcome: AuditOutcome;
  /** Member or resource the action targeted, when it isn't the actor themselves. */
  targetId?: string;
  targetName?: string;
  /** Free-text context shown in the feed (e.g. `"manager -> viewer"`). */
  detail?: string;
}

/** Input for {@link recordAuditEvent}: `at` and `id` are generated. */
export type AuditEventInput = Omit<AuditLogEntry, "id" | "at" | "workspace"> &
  Partial<Pick<AuditLogEntry, "workspace">>;

/** Filters accepted by {@link queryAuditLog}. */
export interface AuditLogFilter {
  actorId?: string;
  action?: AuditAction | Array<AuditAction>;
  outcome?: AuditOutcome;
  /** Include entries at or after this epoch ms. */
  from?: number;
  /** Include entries at or before this epoch ms. */
  to?: number;
  /** Stop after this many entries (newest first). */
  limit?: number;
}

/**
 * The log is a rolling window, not an archive: it is capped so localStorage
 * cannot grow without bound, and entries older than the retention period are
 * dropped on read. A real backend owns long-term retention.
 */
export const MAX_AUDIT_ENTRIES = 200;
export const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const STORAGE_KEY = "audioblocks:audit-log:v1";
const CHANGE_EVENT = "audioblocks:audit-log:changed";

const EMPTY_LOG: Array<AuditLogEntry> = [];

const ACTION_LABELS: Record<AuditAction, string> = {
  "member.invited": "invited",
  "member.joined": "accepted an invite to",
  "member.invite_revoked": "revoked an invite for",
  "member.role_changed": "changed the role of",
  "member.removed": "removed",
  "content.created": "created",
  "content.updated": "updated",
  "content.deleted": "deleted",
  "settings.updated": "updated settings for",
};

let cachedRaw: string | null = null;
let cachedLog: Array<AuditLogEntry> = EMPTY_LOG;

function isAction(value: unknown): value is AuditAction {
  return typeof value === "string" && value in ACTION_LABELS;
}

function isOutcome(value: unknown): value is AuditOutcome {
  return value === "success" || value === "denied";
}

function isRoleValue(value: unknown): value is Role {
  return value === "owner" || value === "manager" || value === "viewer";
}

/** Parses one stored entry, returning `null` for anything unusable. */
function parseEntry(value: unknown): AuditLogEntry | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.at !== "number") return null;
  if (!isAction(raw.action) || !isOutcome(raw.outcome)) return null;

  const actor = raw.actor as Record<string, unknown> | undefined;
  if (!actor || typeof actor !== "object") return null;
  if (typeof actor.id !== "string" || typeof actor.name !== "string") return null;
  if (!isRoleValue(actor.role)) return null;

  const entry: AuditLogEntry = {
    id: raw.id,
    at: raw.at,
    workspace: typeof raw.workspace === "string" ? raw.workspace : AUDIT_WORKSPACE,
    actor: { id: actor.id, name: actor.name, role: actor.role },
    action: raw.action,
    outcome: raw.outcome,
  };
  if (typeof raw.targetId === "string") entry.targetId = raw.targetId;
  if (typeof raw.targetName === "string") entry.targetName = raw.targetName;
  if (typeof raw.detail === "string") entry.detail = raw.detail;
  return entry;
}

function parseLog(raw: string): Array<AuditLogEntry> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_LOG;
    return parsed
      .map(parseEntry)
      .filter((entry): entry is AuditLogEntry => entry !== null)
      .filter((entry) => entry.at >= Date.now() - AUDIT_RETENTION_MS)
      .sort((a, b) => b.at - a.at);
  } catch {
    return EMPTY_LOG;
  }
}

/**
 * The full log, newest first. Malformed entries are skipped rather than
 * throwing, and reads are cached by the stored string so callers can use this
 * as a `useSyncExternalStore` snapshot.
 */
export function getAuditLog(): Array<AuditLogEntry> {
  if (typeof window === "undefined") return EMPTY_LOG;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_LOG;
  }
  if (raw === null) return EMPTY_LOG;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLog = parseLog(raw);
  }
  return cachedLog;
}

/** Empty snapshot for server rendering, where storage doesn't exist. */
export function getAuditLogServerSnapshot(): Array<AuditLogEntry> {
  return EMPTY_LOG;
}

/** Subscribes to log changes (this tab and other tabs). */
export function subscribeToAuditLog(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    cachedRaw = null; // force the next read to re-parse
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function notifyAuditLogChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function writeLog(entries: Array<AuditLogEntry>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota or disabled storage: the action itself has already happened, so
    // there is nothing useful to propagate to the caller.
    return;
  }
  notifyAuditLogChanged();
}

function newId(at: number): string {
  const cryptoObj = typeof globalThis.crypto === "undefined" ? undefined : globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  const random = Math.floor(Math.random() * 1_000_000)
    .toString(36)
    .padStart(4, "0");
  return `audit-${at.toString(36)}-${random}`;
}

/**
 * Appends an entry to the trail. Returns the recorded entry (including the
 * generated `id`), so callers can quote it in a toast. Never throws.
 */
export function recordAuditEvent(input: AuditEventInput): AuditLogEntry {
  const at = Date.now();
  const entry: AuditLogEntry = {
    id: newId(at),
    at,
    workspace: input.workspace ?? AUDIT_WORKSPACE,
    actor: input.actor,
    action: input.action,
    outcome: input.outcome,
    targetId: input.targetId,
    targetName: input.targetName,
    detail: input.detail,
  };
  writeLog([entry, ...getAuditLog()].slice(0, MAX_AUDIT_ENTRIES));
  return entry;
}

/**
 * Convenience wrapper for the RBAC rejections #460 produces: the actor is by
 * definition not allowed to do the thing, so the entry records the attempt with
 * the role they actually hold rather than the one they asked for.
 */
export function recordDeniedAttempt(
  actor: AuditActor,
  action: AuditAction,
  targetName?: string
): AuditLogEntry {
  return recordAuditEvent({
    actor,
    action,
    outcome: "denied",
    targetName,
    detail: `Blocked: ${actor.role} cannot perform ${action}`,
  });
}

function matches(entry: AuditLogEntry, filter: AuditLogFilter): boolean {
  if (filter.actorId && entry.actor.id !== filter.actorId) return false;
  if (filter.outcome && entry.outcome !== filter.outcome) return false;
  if (typeof filter.from === "number" && entry.at < filter.from) return false;
  if (typeof filter.to === "number" && entry.at > filter.to) return false;
  if (filter.action && filter.action.length > 0) {
    const allowed = Array.isArray(filter.action) ? filter.action : [filter.action];
    if (!allowed.includes(entry.action)) return false;
  }
  return true;
}

/** Applies a filter to a list of entries, newest first. Exported for hooks that already hold a snapshot. */
export function filterAuditLog(
  entries: Array<AuditLogEntry>,
  filter: AuditLogFilter = {}
): Array<AuditLogEntry> {
  const filtered = entries.filter((entry) => matches(entry, filter));
  return typeof filter.limit === "number" ? filtered.slice(0, filter.limit) : filtered;
}

/** Filtered view of the trail, newest first. */
export function queryAuditLog(filter: AuditLogFilter = {}): Array<AuditLogEntry> {
  return filterAuditLog(getAuditLog(), filter);
}

/** One-line, human-readable summary for a feed row. */
export function describeAuditEntry(entry: AuditLogEntry): string {
  const label = ACTION_LABELS[entry.action];
  const subject = entry.targetName ?? entry.actor.name;
  const base = `${entry.actor.name} ${label} ${subject}`;
  if (entry.outcome === "denied") return `${base} — denied`;
  return entry.detail ? `${base} (${entry.detail})` : base;
}

/**
 * Guards against spreadsheet formula injection: a cell that starts with one of
 * these characters is executed by Excel/Sheets when the export is opened.
 */
function csvCell(value: string): string {
  const unsafe = /^[=+\-@\t\r]/.test(value);
  const body = unsafe ? `'${value}` : value;
  return `"${body.replace(/"/g, '""')}"`;
}

/** The trail as CSV, newest first. Header row always present, even when empty. */
export function exportAuditLogCsv(entries: Array<AuditLogEntry> = getAuditLog()): string {
  const header = ["timestamp", "actor", "actor_role", "action", "outcome", "target", "detail"];
  const rows = entries.map((entry) =>
    [
      new Date(entry.at).toISOString(),
      entry.actor.name,
      entry.actor.role,
      entry.action,
      entry.outcome,
      entry.targetName ?? "",
      entry.detail ?? "",
    ]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

/** The trail as JSON, newest first. */
export function exportAuditLogJson(entries: Array<AuditLogEntry> = getAuditLog()): string {
  return JSON.stringify(entries, null, 2);
}

/** Empties the trail — used on logout and by tests. */
export function clearAuditLog(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  cachedRaw = null;
  cachedLog = EMPTY_LOG;
  notifyAuditLogChanged();
}
