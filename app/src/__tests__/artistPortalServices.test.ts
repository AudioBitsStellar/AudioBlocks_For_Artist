import { describe, it, expect, beforeEach } from "vitest";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  getSecuritySettings,
  setLoginAlerts,
} from "@/services/securitySettingsService";
import {
  acceptInvite,
  clearInvites,
  createInvite,
  getInviteLink,
  listInvites,
  resendInvite,
  revokeInvite,
} from "@/services/collaboratorService";
import {
  bulkSetModerationStatus,
  clearModeration,
  getModerationMap,
  getModerationStatus,
  removeComment,
  restoreComment,
  setModerationStatus,
} from "@/services/commentModerationService";

describe("securitySettingsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 2FA disabled with login alerts on", () => {
    const settings = getSecuritySettings();
    expect(settings.twoFactorStatus).toBe("disabled");
    expect(settings.provider).toBe("privy");
    expect(settings.loginAlerts).toBe(true);
  });

  it("runs the enrolment flow and enables 2FA with recovery codes", () => {
    const setup = beginTwoFactorSetup();
    expect(setup.challenge).toMatch(/^\d{6}$/);
    expect(setup.otpauthUri).toContain("otpauth://totp/");
    expect(getSecuritySettings().twoFactorStatus).toBe("pending");

    const wrong = confirmTwoFactorSetup("000000");
    if (setup.challenge === "000000") {
      expect(wrong.ok).toBe(true);
    } else {
      expect(wrong.ok).toBe(false);
    }

    const result = confirmTwoFactorSetup(setup.challenge);
    expect(result.ok).toBe(true);
    const settings = getSecuritySettings();
    expect(settings.twoFactorStatus).toBe("enabled");
    expect(settings.recoveryCodes?.length).toBeGreaterThan(0);
  });

  it("rejects malformed codes", () => {
    beginTwoFactorSetup();
    expect(confirmTwoFactorSetup("12")).toEqual({ ok: false, error: "Enter the 6-digit code." });
  });

  it("disables 2FA and clears enrolment state", () => {
    const setup = beginTwoFactorSetup();
    confirmTwoFactorSetup(setup.challenge);
    disableTwoFactor();
    const settings = getSecuritySettings();
    expect(settings.twoFactorStatus).toBe("disabled");
    expect(settings.recoveryCodes).toBeUndefined();
    expect(settings.setup).toBeUndefined();
  });

  it("toggles login alerts", () => {
    expect(setLoginAlerts(false).loginAlerts).toBe(false);
    expect(getSecuritySettings().loginAlerts).toBe(false);
  });
});

describe("collaboratorService", () => {
  beforeEach(() => {
    localStorage.clear();
    clearInvites();
  });

  it("rejects invalid emails", () => {
    expect(createInvite({ email: "nope", role: "manager" })).toEqual({
      ok: false,
      error: "Enter a valid email address.",
    });
  });

  it("creates a pending invite with an accept token", () => {
    const result = createInvite({
      email: "Co@Example.com",
      role: "manager",
      message: "join me",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invite.email).toBe("co@example.com");
    expect(result.invite.status).toBe("pending");
    expect(result.invite.token.length).toBeGreaterThan(10);
    expect(listInvites()).toHaveLength(1);
    expect(getInviteLink(result.invite.token)).toContain(`/invite/${result.invite.token}`);
  });

  it("blocks duplicate pending invites for the same email", () => {
    createInvite({ email: "co@example.com", role: "viewer" });
    const second = createInvite({ email: "co@example.com", role: "viewer" });
    expect(second.ok).toBe(false);
  });

  it("revokes and resends invites", () => {
    const created = createInvite({ email: "co@example.com", role: "viewer" });
    if (!created.ok) throw new Error("invite should be created");

    const revoked = revokeInvite(created.invite.id);
    expect(revoked?.status).toBe("revoked");
    expect(revokeInvite(created.invite.id)).toBeNull();

    const second = createInvite({ email: "other@example.com", role: "manager" });
    if (!second.ok) throw new Error("invite should be created");
    const resent = resendInvite(second.invite.id);
    expect(resent?.token).not.toBe(second.invite.token);
  });

  it("accepts an invite by token", () => {
    const created = createInvite({ email: "co@example.com", role: "viewer" });
    if (!created.ok) throw new Error("invite should be created");
    const accepted = acceptInvite(created.invite.token);
    expect(accepted?.status).toBe("accepted");
    expect(listInvites()[0].status).toBe("accepted");
  });
});

describe("commentModerationService", () => {
  beforeEach(() => {
    localStorage.clear();
    clearModeration();
  });

  it("treats unknown comments as visible", () => {
    expect(getModerationStatus("1")).toBe("visible");
  });

  it("hides and restores a single comment", () => {
    setModerationStatus(7, "hidden");
    expect(getModerationStatus(7)).toBe("hidden");
    restoreComment(7);
    expect(getModerationStatus(7)).toBe("visible");
    expect(getModerationMap()).toEqual({});
  });

  it("soft-deletes a comment", () => {
    removeComment("42");
    expect(getModerationStatus("42")).toBe("removed");
  });

  it("applies bulk decisions", () => {
    bulkSetModerationStatus([1, 2, 3], "flagged");
    expect(getModerationStatus(1)).toBe("flagged");
    expect(getModerationStatus(2)).toBe("flagged");
    expect(getModerationStatus(3)).toBe("flagged");
    expect(Object.keys(getModerationMap())).toHaveLength(3);
  });

  it("ignores corrupted storage", () => {
    localStorage.setItem("audioblocks:comment-moderation:v1", "{oops");
    expect(getModerationMap()).toEqual({});
  });
});
