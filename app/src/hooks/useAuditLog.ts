"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  filterAuditLog,
  getAuditLog,
  getAuditLogServerSnapshot,
  subscribeToAuditLog,
  type AuditLogEntry,
  type AuditLogFilter,
} from "@/services/auditLogService";

/**
 * Live view over the audit trail (#461).
 *
 * Reads go through `useSyncExternalStore`, so the trail updates when another
 * tab or another component records an event, and the server render gets the
 * empty snapshot instead of a hydration mismatch.
 *
 * @param filter Compared by value, so callers can pass a fresh literal without
 * re-filtering the trail on every render.
 */
export function useAuditLog(filter?: AuditLogFilter): Array<AuditLogEntry> {
  const log = useSyncExternalStore(subscribeToAuditLog, getAuditLog, getAuditLogServerSnapshot);
  const filterKey = JSON.stringify(filter ?? {});
  return useMemo(
    () => filterAuditLog(log, JSON.parse(filterKey) as AuditLogFilter),
    [log, filterKey]
  );
}
