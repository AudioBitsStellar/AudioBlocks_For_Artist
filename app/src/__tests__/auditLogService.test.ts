import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AUDIT_RETENTION_MS,
  MAX_AUDIT_ENTRIES,
  clearAuditLog,
  describeAuditEntry,
  exportAuditLogCsv,
  exportAuditLogJson,
  getAuditLog,
  queryAuditLog,
  recordAuditEvent,
  recordDeniedAttempt,
  subscribeToAuditLog,
  type AuditActor,
} from "@/services/auditLogService";

const OWNER: AuditActor = { id: "self", name: "Ada Artist", role: "owner" };
const VIEWER: AuditActor = { id: "m-1", name: "Bo Manager", role: "manager" };

function invite(target: string, actor: AuditActor = OWNER) {
  return recordAuditEvent({
    actor,
    action: "member.invited",
    outcome: "success",
    targetName: target,
    detail: "viewer",
  });
}

describe("auditLogService — recording (#461)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuditLog();
  });

  it("returns the entry it recorded, with an id and timestamp", () => {
    const entry = invite("bo@studio.com");

    expect(entry.id).toBeTruthy();
    expect(entry.at).toBeGreaterThan(0);
    expect(entry.actor).toEqual(OWNER);
    expect(entry.action).toBe("member.invited");
    expect(getAuditLog()).toHaveLength(1);
    expect(getAuditLog()[0]).toEqual(entry);
  });

  it("starts empty and stays newest-first", () => {
    expect(getAuditLog()).toEqual([]);

    const first = invite("first@studio.com");
    const second = invite("second@studio.com");

    expect(getAuditLog().map((entry) => entry.id)).toEqual([second.id, first.id]);
  });

  it("gives every entry a distinct id", () => {
    const ids = new Set(Array.from({ length: 25 }, () => invite("same@studio.com").id));
    expect(ids.size).toBe(25);
  });

  it("caps the trail at MAX_AUDIT_ENTRIES, dropping the oldest", () => {
    const recorded = Array.from({ length: MAX_AUDIT_ENTRIES + 5 }, (_, index) =>
      invite(`member${index}@studio.com`)
    );

    const log = getAuditLog();
    expect(log).toHaveLength(MAX_AUDIT_ENTRIES);
    expect(log.some((entry) => entry.id === recorded[0].id)).toBe(false);
    expect(log[0].id).toBe(recorded[recorded.length - 1].id);
  });

  it("ages out entries past the retention window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const old = invite("old@studio.com");

    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + AUDIT_RETENTION_MS + 1000);
    const fresh = invite("fresh@studio.com");

    expect(getAuditLog().map((entry) => entry.id)).toEqual([fresh.id]);
    expect(getAuditLog().some((entry) => entry.id === old.id)).toBe(false);
    vi.useRealTimers();
  });

  it("survives a corrupt or non-array payload instead of throwing", () => {
    invite("good@studio.com");
    window.localStorage.setItem("audioblocks:audit-log:v1", "{not json");
    expect(getAuditLog()).toEqual([]);

    window.localStorage.setItem("audioblocks:audit-log:v1", JSON.stringify({ nope: true }));
    expect(getAuditLog()).toEqual([]);
  });

  it("skips malformed rows but keeps the readable ones", () => {
    const good = invite("good@studio.com");
    window.localStorage.setItem(
      "audioblocks:audit-log:v1",
      JSON.stringify([
        { id: "no-actor" },
        { ...good, action: "not.a.real.action" },
        { ...good, actor: { id: "x", name: "X", role: "admin" } },
        good,
      ])
    );

    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].id).toBe(good.id);
  });
});

describe("auditLogService — denied attempts", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuditLog();
  });

  it("records the attempt, not just the success", () => {
    const entry = recordDeniedAttempt(VIEWER, "member.removed", "ada@studio.com");

    expect(entry.outcome).toBe("denied");
    expect(entry.actor.role).toBe("manager");
    expect(getAuditLog()[0].detail).toContain("manager");
    expect(describeAuditEntry(entry)).toMatch(/denied$/);
  });

  it("keeps successes and denials side by side in order", () => {
    invite("one@studio.com");
    recordDeniedAttempt(VIEWER, "member.role_changed", "two@studio.com");

    const outcomes = getAuditLog().map((entry) => entry.outcome);
    expect(outcomes).toEqual(["denied", "success"]);
    expect(queryAuditLog({ outcome: "denied" })).toHaveLength(1);
    expect(queryAuditLog({ outcome: "success" })).toHaveLength(1);
  });
});

describe("auditLogService — querying", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuditLog();
    invite("bo@studio.com");
    recordAuditEvent({
      actor: VIEWER,
      action: "content.updated",
      outcome: "success",
      targetName: "Midnight Set",
    });
    recordDeniedAttempt(VIEWER, "member.removed", "ada@studio.com");
  });

  it("filters by actor", () => {
    const byViewer = queryAuditLog({ actorId: VIEWER.id });
    expect(byViewer).toHaveLength(2);
    expect(byViewer.every((entry) => entry.actor.id === VIEWER.id)).toBe(true);
  });

  it("filters by one action or a list of them", () => {
    expect(queryAuditLog({ action: "member.invited" })).toHaveLength(1);
    expect(queryAuditLog({ action: ["member.invited", "member.removed"] })).toHaveLength(2);
    expect(queryAuditLog({ action: [] })).toHaveLength(3);
  });

  it("filters by a time window", () => {
    const now = Date.now();
    expect(queryAuditLog({ from: now - 60_000 })).toHaveLength(3);
    expect(queryAuditLog({ to: now - 60_000 })).toHaveLength(0);
  });

  it("caps results with limit without changing the total", () => {
    expect(queryAuditLog({ limit: 1 })).toHaveLength(1);
    expect(getAuditLog()).toHaveLength(3);
  });

  it("combines filters", () => {
    const result = queryAuditLog({ actorId: VIEWER.id, outcome: "denied" });
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("member.removed");
  });
});

describe("auditLogService — export", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuditLog();
  });

  it("writes a CSV header even with nothing recorded", () => {
    expect(exportAuditLogCsv()).toBe("timestamp,actor,actor_role,action,outcome,target,detail");
  });

  it("quotes and escapes cells, newest first", () => {
    invite("ada@studio.com", { id: "self", name: 'Ada "The Artist"', role: "owner" });
    const csv = exportAuditLogCsv();
    const [header, row] = csv.split("\n");

    expect(header).toContain("actor_role");
    expect(row).toContain('"Ada ""The Artist"""');
    expect(row.startsWith('"20')).toBe(true);
  });

  it("neutralises spreadsheet formulas in exported text", () => {
    invite("ada@studio.com", { id: "self", name: '=HYPERLINK("http://evil")', role: "owner" });
    const csv = exportAuditLogCsv();

    expect(csv).toContain("\"'=HYPERLINK");
    expect(csv).not.toContain(',"=HYPERLINK');
  });

  it("exports JSON that round-trips", () => {
    const entry = invite("ada@studio.com");
    const parsed = JSON.parse(exportAuditLogJson()) as Array<{ id: string }>;

    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(entry.id);
  });
});

describe("auditLogService — describe + subscribe + clear", () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuditLog();
  });

  it("reads as a sentence for a feed row", () => {
    const entry = invite("bo@studio.com");
    expect(describeAuditEntry(entry)).toBe("Ada Artist invited bo@studio.com (viewer)");

    const roleChange = recordAuditEvent({
      actor: OWNER,
      action: "member.role_changed",
      outcome: "success",
      targetName: "bo@studio.com",
      detail: "manager -> viewer",
    });
    expect(describeAuditEntry(roleChange)).toBe(
      "Ada Artist changed the role of bo@studio.com (manager -> viewer)"
    );
  });

  it("notifies subscribers when an entry lands, and stops after unsubscribe", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToAuditLog(onChange);

    invite("bo@studio.com");
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    invite("cy@studio.com");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("empties the trail on clear", () => {
    invite("bo@studio.com");
    clearAuditLog();
    expect(getAuditLog()).toEqual([]);
    expect(window.localStorage.getItem("audioblocks:audit-log:v1")).toBeNull();
  });
});
