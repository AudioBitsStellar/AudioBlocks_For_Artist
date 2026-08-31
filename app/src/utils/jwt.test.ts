import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRoleFromToken } from "./jwt";

vi.mock("js-cookie", () => ({
  default: { get: vi.fn(() => undefined) },
}));

/** Builds a syntactically valid `header.payload.signature` JWT from `claims`. */
function tokenWith(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "none", typ: "JWT" })}.${b64(claims)}.sig`;
}

describe("getRoleFromToken", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("returns null when no token is stored", () => {
    expect(getRoleFromToken()).toBeNull();
  });

  it("reads a top-level `role` claim", () => {
    localStorage.setItem("token", tokenWith({ role: "manager" }));
    expect(getRoleFromToken()).toBe("manager");
  });

  it("falls back to a `user_role` claim", () => {
    localStorage.setItem("token", tokenWith({ user_role: "viewer" }));
    expect(getRoleFromToken()).toBe("viewer");
  });

  it("reads a nested `user.role` claim", () => {
    localStorage.setItem("token", tokenWith({ user: { role: "owner" } }));
    expect(getRoleFromToken()).toBe("owner");
  });

  it("returns null for an unknown role value", () => {
    localStorage.setItem("token", tokenWith({ role: "superadmin" }));
    expect(getRoleFromToken()).toBeNull();
  });

  it("returns null for a malformed token", () => {
    localStorage.setItem("token", "not-a-jwt");
    expect(getRoleFromToken()).toBeNull();
  });

  it("returns null when the payload is not valid JSON", () => {
    localStorage.setItem("token", "header.%%%.sig");
    expect(getRoleFromToken()).toBeNull();
  });
});
