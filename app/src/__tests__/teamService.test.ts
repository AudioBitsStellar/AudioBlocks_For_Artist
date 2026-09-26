import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ASSIGNABLE_ROLES,
  MAX_TEAM_SEATS,
  OWNER_MEMBER_ID,
  acceptTeamInvitation,
  canManageTeam,
  clearTeamRoster,
  countSeatsUsed,
  getTeamRestrictionReason,
  getTeamRoster,
  inviteTeamMember,
  listTeamMembers,
  removeTeamMember,
  subscribeToTeamRoster,
  updateTeamMemberRole,
  type WorkspaceOwner,
} from "@/services/teamService";
import { getAuditLog } from "@/services/auditLogService";
import type { AuditActor } from "@/services/auditLogService";

const OWNER: WorkspaceOwner = {
  id: OWNER_MEMBER_ID,
  name: "Ada Artist",
  email: "ada@studio.com",
  role: "owner",
};
const MANAGER: AuditActor = { id: "m-1", name: "Bo Manager", role: "manager" };
const VIEWER: AuditActor = { id: "v-1", name: "Cy Viewer", role: "viewer" };

/** Invites `email` as owner and returns the created member or throws. */
function addMember(email: string, role: "manager" | "viewer" = "viewer") {
  const result = inviteTeamMember({ name: email.split("@")[0], email, role }, OWNER);
  if (!result.ok) throw new Error(`invite failed: ${result.error}`);
  return result.value;
}

describe("teamService — permissions (#460)", () => {
  it("lets only the owner manage the team, per the shared RBAC table", () => {
    expect(canManageTeam("owner")).toBe(true);
    expect(canManageTeam("manager")).toBe(false);
    expect(canManageTeam("viewer")).toBe(false);

    expect(getTeamRestrictionReason("owner")).toBe("");
    expect(getTeamRestrictionReason("manager")).toMatch(/managed by the workspace owner/i);
    expect(getTeamRestrictionReason("viewer")).toMatch(/read-only/i);
  });

  it("offers manager and viewer as assignable roles, never owner", () => {
    expect(ASSIGNABLE_ROLES).toEqual(["manager", "viewer"]);
  });
});

describe("teamService — roster reads", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTeamRoster();
  });

  it("starts empty and counts the owner in the seats", () => {
    expect(getTeamRoster()).toEqual([]);
    expect(countSeatsUsed()).toBe(1);
  });

  it("puts the owner first, then staff newest first", () => {
    const first = addMember("bo@studio.com");
    const second = addMember("cy@studio.com");

    const members = listTeamMembers(OWNER);
    expect(members.map((member) => member.id)).toEqual([OWNER_MEMBER_ID, second.id, first.id]);
    expect(members[0].role).toBe("owner");
    expect(members[0].status).toBe("active");
    expect(countSeatsUsed()).toBe(3);
  });

  it("orders invites created in the same millisecond newest-added first", () => {
    // addedAt only has millisecond resolution, so a frozen clock makes two
    // invites tie — the listing must still be deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
    const first = addMember("first@studio.com");
    const second = addMember("second@studio.com");
    vi.useRealTimers();

    expect(first.addedAt).toBe(second.addedAt);
    expect(listTeamMembers(OWNER).map((member) => member.id)).toEqual([
      OWNER_MEMBER_ID,
      second.id,
      first.id,
    ]);
  });

  it("sorts a roster handed to it without reading storage", () => {
    const members = listTeamMembers(OWNER, [
      {
        id: "a",
        name: "A",
        email: "a@studio.com",
        role: "viewer",
        status: "active",
        addedAt: 10,
        addedBy: "self",
      },
      {
        id: "b",
        name: "B",
        email: "b@studio.com",
        role: "manager",
        status: "active",
        addedAt: 20,
        addedBy: "self",
      },
    ]);

    expect(members.map((member) => member.id)).toEqual([OWNER_MEMBER_ID, "b", "a"]);
  });

  it("survives corrupt storage by treating the roster as empty", () => {
    window.localStorage.setItem("audioblocks:team:v1", "nope");
    expect(getTeamRoster()).toEqual([]);

    window.localStorage.setItem("audioblocks:team:v1", JSON.stringify([{ id: "x" }]));
    expect(getTeamRoster()).toEqual([]);
  });

  it("notifies subscribers on change, and stops after unsubscribe", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToTeamRoster(onChange);

    addMember("bo@studio.com");
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    addMember("cy@studio.com");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("teamService — inviting", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTeamRoster();
  });

  it("creates a pending invite and records it in the audit trail", () => {
    const result = inviteTeamMember(
      { name: " Bo ", email: " BO@Studio.COM ", role: "manager" },
      OWNER
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      name: "Bo",
      email: "bo@studio.com",
      role: "manager",
      status: "invited",
      addedBy: OWNER_MEMBER_ID,
    });
    expect(getTeamRoster()).toHaveLength(1);

    const [entry] = getAuditLog();
    expect(entry.action).toBe("member.invited");
    expect(entry.outcome).toBe("success");
    expect(entry.targetName).toBe("bo@studio.com");
    expect(entry.detail).toBe("manager");
  });

  it("rejects a malformed address without touching the roster", () => {
    const result = inviteTeamMember({ name: "Bo", email: "bo@studio", role: "viewer" }, OWNER);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_email");
    expect(getTeamRoster()).toEqual([]);
  });

  it("rejects a blank or tiny name", () => {
    expect(inviteTeamMember({ name: "B", email: "bo@studio.com", role: "viewer" }, OWNER).ok).toBe(
      false
    );
    expect(
      inviteTeamMember({ name: "   ", email: "bo@studio.com", role: "viewer" }, OWNER)
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("refuses a duplicate address whatever its case", () => {
    addMember("bo@studio.com");
    const result = inviteTeamMember({ name: "Bo", email: "BO@studio.com", role: "viewer" }, OWNER);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("duplicate_email");
    expect(getTeamRoster()).toHaveLength(1);
  });

  it("refuses to grant the owner role to someone else", () => {
    const result = inviteTeamMember({ name: "Bo", email: "bo@studio.com", role: "owner" }, OWNER);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalid_role");
  });

  it("stops at the seat limit, counting the owner", () => {
    for (let index = 0; index < MAX_TEAM_SEATS - 1; index += 1) {
      addMember(`member${index}@studio.com`);
    }
    expect(countSeatsUsed()).toBe(MAX_TEAM_SEATS);

    const result = inviteTeamMember(
      { name: "Late", email: "late@studio.com", role: "viewer" },
      OWNER
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("seats_exhausted");
  });

  it("is refused for a manager or viewer, and logs the attempt as denied", () => {
    const result = inviteTeamMember(
      { name: "Bo", email: "bo@studio.com", role: "viewer" },
      MANAGER
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("forbidden");
    expect(getTeamRoster()).toEqual([]);

    const [entry] = getAuditLog();
    expect(entry.outcome).toBe("denied");
    expect(entry.actor.role).toBe("manager");
    expect(entry.action).toBe("member.invited");
  });
});

describe("teamService — role changes", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTeamRoster();
  });

  it("applies the new role and records the before/after", () => {
    const member = addMember("bo@studio.com", "viewer");
    const result = updateTeamMemberRole(member.id, "manager", OWNER);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.role).toBe("manager");
    expect(getTeamRoster()[0].role).toBe("manager");

    const entry = getAuditLog()[0];
    expect(entry.action).toBe("member.role_changed");
    expect(entry.detail).toBe("viewer -> manager");
  });

  it("is a no-op when the role is unchanged", () => {
    const member = addMember("bo@studio.com", "viewer");
    const before = getAuditLog().length;

    const result = updateTeamMemberRole(member.id, "viewer", OWNER);

    expect(result.ok).toBe(true);
    expect(getAuditLog()).toHaveLength(before);
  });

  it("cannot demote the workspace owner or an unknown member", () => {
    expect(updateTeamMemberRole(OWNER_MEMBER_ID, "viewer", OWNER)).toEqual(
      expect.objectContaining({ ok: false, error: "immutable_member" })
    );
    expect(updateTeamMemberRole("does-not-exist", "viewer", OWNER)).toEqual(
      expect.objectContaining({ ok: false, error: "not_found" })
    );
  });

  it("will not hand out the owner role", () => {
    const member = addMember("bo@studio.com", "viewer");
    expect(updateTeamMemberRole(member.id, "owner", OWNER)).toEqual(
      expect.objectContaining({ ok: false, error: "invalid_role" })
    );
  });

  it("refuses a manager actor and logs the denied attempt", () => {
    const member = addMember("bo@studio.com", "viewer");
    const auditBefore = getAuditLog().length;

    expect(updateTeamMemberRole(member.id, "manager", MANAGER)).toEqual(
      expect.objectContaining({ ok: false, error: "forbidden" })
    );
    expect(getTeamRoster()[0].role).toBe("viewer");
    expect(getAuditLog()).toHaveLength(auditBefore + 1);
    expect(getAuditLog()[0].outcome).toBe("denied");
  });
});

describe("teamService — removal", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTeamRoster();
  });

  it("removes an active member and audits it as a removal", () => {
    const member = addMember("bo@studio.com");
    acceptTeamInvitation("bo@studio.com");

    const result = removeTeamMember(member.id, OWNER);

    expect(result.ok).toBe(true);
    expect(getTeamRoster()).toEqual([]);
    expect(getAuditLog()[0].action).toBe("member.removed");
  });

  it("audits an unaccepted invite as a revoked invite", () => {
    const member = addMember("bo@studio.com");
    removeTeamMember(member.id, OWNER);

    expect(getAuditLog()[0].action).toBe("member.invite_revoked");
    expect(getAuditLog()[0].detail).toBe("viewer");
  });

  it("cannot remove the owner, and refuses a viewer", () => {
    const member = addMember("bo@studio.com");

    expect(removeTeamMember(OWNER_MEMBER_ID, OWNER)).toEqual(
      expect.objectContaining({ ok: false, error: "immutable_member" })
    );
    expect(removeTeamMember(member.id, VIEWER)).toEqual(
      expect.objectContaining({ ok: false, error: "forbidden" })
    );
    expect(getTeamRoster()).toHaveLength(1);
    expect(getAuditLog()[0].outcome).toBe("denied");
  });
});

describe("teamService — accepting an invite", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTeamRoster();
  });

  it("activates the member by address, case-insensitively", () => {
    addMember("Bo@Studio.com", "manager");

    const result = acceptTeamInvitation("  bo@studio.com ");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("active");
    expect(result.value.lastActiveAt).toBeGreaterThan(0);
    expect(getAuditLog()[0].action).toBe("member.joined");
    expect(getAuditLog()[0].actor.id).toBe(result.value.id);
  });

  it("has nothing to accept for an unknown address", () => {
    expect(acceptTeamInvitation("nobody@studio.com")).toEqual(
      expect.objectContaining({ ok: false, error: "not_found" })
    );
  });

  it("is idempotent once the member is active", () => {
    addMember("bo@studio.com");
    acceptTeamInvitation("bo@studio.com");
    const auditLength = getAuditLog().length;

    const again = acceptTeamInvitation("bo@studio.com");

    expect(again.ok).toBe(true);
    expect(getAuditLog()).toHaveLength(auditLength);
  });
});

describe("teamService — clearing", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTeamRoster();
  });

  it("drops the roster but keeps the audit trail", () => {
    addMember("bo@studio.com");
    clearTeamRoster();

    expect(getTeamRoster()).toEqual([]);
    expect(window.localStorage.getItem("audioblocks:team:v1")).toBeNull();
    expect(getAuditLog()).toHaveLength(1);
  });
});
