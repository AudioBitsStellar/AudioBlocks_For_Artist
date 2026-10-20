import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/axios", () => ({ createApiClient: vi.fn() }));

import { buildAuditLogUrl, mapServerAuditRecord } from "@/services/auditLogApi";

describe("server audit log (#526)", () => {
  it("encodes filters and pagination", () => {
    expect(buildAuditLogUrl()).toBe("/artist/audit-logs?page=1&limit=25");
    expect(
      buildAuditLogUrl({ actorId: "u1", action: "member.removed", from: 0, page: 3, pageSize: 10 })
    ).toBe(
      "/artist/audit-logs?actorId=u1&action=member.removed&from=1970-01-01T00%3A00%3A00.000Z&page=3&limit=10"
    );
  });

  it("maps server records and drops unusable ones", () => {
    expect(
      mapServerAuditRecord({
        id: "e1",
        createdAt: "2026-10-01T00:00:00.000Z",
        actor: { id: "u1", name: "Ada", role: "manager" },
        action: "member.removed",
        outcome: "denied",
        targetName: "Bob",
      })
    ).toEqual({
      id: "e1",
      at: Date.parse("2026-10-01T00:00:00.000Z"),
      workspace: "artist",
      actor: { id: "u1", name: "Ada", role: "manager" },
      action: "member.removed",
      outcome: "denied",
      targetName: "Bob",
    });
    expect(mapServerAuditRecord({ id: "e2", createdAt: "bad", action: "x" })).toBeNull();
  });
});
