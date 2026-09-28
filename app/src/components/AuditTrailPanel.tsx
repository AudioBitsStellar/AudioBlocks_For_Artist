"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MAX_AUDIT_ENTRIES,
  describeAuditEntry,
  exportAuditLogCsv,
  exportAuditLogJson,
  queryAuditLog,
  type AuditAction,
  type AuditLogFilter,
  type AuditOutcome,
} from "@/services/auditLogService";
import { useAuditLog } from "@/hooks/useAuditLog";

/** Rows the panel understands as one group each. */
const ACTION_GROUPS: Record<string, Array<AuditAction>> = {
  all: [],
  member: [
    "member.invited",
    "member.joined",
    "member.invite_revoked",
    "member.role_changed",
    "member.removed",
  ],
  content: ["content.created", "content.updated", "content.deleted"],
  settings: ["settings.updated"],
};

type GroupKey = keyof typeof ACTION_GROUPS;
type OutcomeKey = "all" | AuditOutcome;

const GROUP_LABELS: Record<GroupKey, string> = {
  all: "All activity",
  member: "Team access",
  content: "Content",
  settings: "Settings",
};

const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  all: "Allowed and blocked",
  success: "Allowed only",
  denied: "Blocked only",
};

/** Triggers a browser download for an export string. */
function downloadTextFile(filename: string, mimeType: string, contents: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // The browser needs the blob to outlive the click, not this component.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface AuditTrailPanelProps {
  /** Rows shown before paging out. Defaults to 12. */
  limit?: number;
}

/**
 * The team audit trail (#461): what happened in this workspace, who did it, and
 * whether their role allowed it. Blocked attempts are shown because they are the
 * rows an artist actually needs to read after a suspicious week.
 *
 * Reads live from `useAuditLog`, so a change made through the invite form above
 * appears without a refresh.
 */
export default function AuditTrailPanel({ limit = 12 }: AuditTrailPanelProps) {
  const [group, setGroup] = useState<GroupKey>("all");
  const [outcome, setOutcome] = useState<OutcomeKey>("all");

  const filter = useMemo<AuditLogFilter>(() => {
    const actions = ACTION_GROUPS[group];
    return {
      ...(actions.length ? { action: actions } : {}),
      ...(outcome === "all" ? {} : { outcome }),
    };
  }, [group, outcome]);

  const entries = useAuditLog(filter);
  const totalRecorded = useAuditLog().length;

  const handleExport = (kind: "csv" | "json") => {
    // Export the filtered view: an artist investigating one member should not
    // have to wade through the rest of the log.
    const rows = queryAuditLog(filter);
    if (rows.length === 0) {
      toast.error("Nothing to export for this filter.");
      return;
    }
    if (kind === "csv") {
      downloadTextFile(
        `audioblocks-audit-${stamp()}.csv`,
        "text/csv;charset=utf-8",
        exportAuditLogCsv(rows)
      );
    } else {
      downloadTextFile(
        `audioblocks-audit-${stamp()}.json`,
        "application/json",
        exportAuditLogJson(rows)
      );
    }
    toast.success(`Exported ${rows.length} audit ${rows.length === 1 ? "entry" : "entries"}`);
  };

  return (
    <section aria-labelledby="audit-trail-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="audit-trail-heading" className="text-xl font-semibold text-text">
            Activity log
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Every team access change, including attempts that were blocked. Keeps the last{" "}
            {MAX_AUDIT_ENTRIES} events.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:border-secondary hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport("json")}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:border-secondary hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-group" className="text-xs uppercase tracking-wide text-text-muted">
            Show
          </label>
          <select
            id="audit-group"
            value={group}
            onChange={(event) => setGroup(event.target.value as GroupKey)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {(Object.keys(GROUP_LABELS) as Array<GroupKey>).map((key) => (
              <option key={key} value={key}>
                {GROUP_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="audit-outcome"
            className="text-xs uppercase tracking-wide text-text-muted"
          >
            Result
          </label>
          <select
            id="audit-outcome"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as OutcomeKey)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {(Object.keys(OUTCOME_LABELS) as Array<OutcomeKey>).map((key) => (
              <option key={key} value={key}>
                {OUTCOME_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {entries.length === 0 ? (
        <p
          role="status"
          className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-text-muted"
        >
          No matching events yet. Invites, role changes and removals appear here as they happen.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Team activity">
          {entries.slice(0, limit).map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <span
                className={
                  entry.outcome === "denied" ? "text-sm text-red-400" : "text-sm text-text"
                }
              >
                {describeAuditEntry(entry)}
              </span>
              <time
                dateTime={new Date(entry.at).toISOString()}
                className="text-xs text-text-muted tabular-nums"
              >
                {new Date(entry.at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}

      {entries.length > limit ? (
        <p className="text-xs text-text-muted">
          Showing the newest {limit} of {entries.length} matching events ({totalRecorded} recorded
          in total).
        </p>
      ) : null}
    </section>
  );
}
