/**
 * Server-recorded audit trail (#526).
 *
 * The localStorage log in `auditLogService.ts` lives in the browser of the
 * person being audited, so it can be cleared or edited and isn't shared with
 * the team. This reads audit events from the backend instead, with the same
 * filters plus pagination, and reuses the existing entry shape so
 * AuditTrailPanel can render either source.
 */

import { AUDIT_LOG_ENDPOINTS } from "@/api/api-endpoint";
import { useGet } from "@/api/queryClient";
import type { AuditAction, AuditLogEntry, AuditOutcome } from "@/services/auditLogService";

export const AUDIT_LOG_QUERY_KEY = ["artist-audit-logs"] as const;
export const AUDIT_LOG_PAGE_SIZE = 25;

export interface ServerAuditLogFilter {
  actorId?: string;
  action?: AuditAction;
  outcome?: AuditOutcome;
  /** ISO date or epoch ms. */
  from?: string | number;
  to?: string | number;
  page?: number;
  pageSize?: number;
}

/** Builds the list URL with filters and pagination as query params. */
export function buildAuditLogUrl(filter: ServerAuditLogFilter = {}): string {
  const params = new URLSearchParams();
  if (filter.actorId) params.set("actorId", filter.actorId);
  if (filter.action) params.set("action", filter.action);
  if (filter.outcome) params.set("outcome", filter.outcome);
  const iso = (v: string | number) => (typeof v === "number" ? new Date(v).toISOString() : v);
  if (filter.from !== undefined) params.set("from", iso(filter.from));
  if (filter.to !== undefined) params.set("to", iso(filter.to));
  params.set("page", String(Math.max(1, filter.page ?? 1)));
  params.set("limit", String(filter.pageSize ?? AUDIT_LOG_PAGE_SIZE));
  return `${AUDIT_LOG_ENDPOINTS.LIST}?${params.toString()}`;
}

interface ServerAuditRecord {
  id: string;
  createdAt: string;
  workspace?: string;
  actor?: { id?: string; name?: string; role?: string };
  action: string;
  outcome?: string;
  targetId?: string;
  targetName?: string;
  detail?: string;
}

/** Maps a backend audit record to the dashboard entry shape; drops unusable rows. */
export function mapServerAuditRecord(record: ServerAuditRecord): AuditLogEntry | null {
  const at = Date.parse(record.createdAt);
  if (!record.id || Number.isNaN(at) || !record.actor?.id) return null;
  const role = record.actor.role;
  return {
    id: record.id,
    at,
    workspace: record.workspace ?? "artist",
    actor: {
      id: record.actor.id,
      name: record.actor.name ?? record.actor.id,
      role: role === "owner" || role === "manager" || role === "viewer" ? role : "viewer",
    },
    action: record.action as AuditAction,
    outcome: record.outcome === "denied" ? "denied" : "success",
    ...(record.targetId ? { targetId: record.targetId } : {}),
    ...(record.targetName ? { targetName: record.targetName } : {}),
    ...(record.detail ? { detail: record.detail } : {}),
  };
}

export interface ServerAuditLogPage {
  data: ServerAuditRecord[];
  total?: number;
  page?: number;
}

/** Fetches one page of server audit events. */
export function useServerAuditLog(filter: ServerAuditLogFilter = {}, enabled: boolean = true) {
  const url = buildAuditLogUrl(filter);
  return useGet<ServerAuditLogPage>([...AUDIT_LOG_QUERY_KEY, url], url, { enabled });
}
