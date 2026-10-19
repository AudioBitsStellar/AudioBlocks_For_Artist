import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRoleFromToken } from "./jwt";
import { CLAIMS_COOKIE } from "@/lib/session";

// The access token is httpOnly, so the browser only sees the claims cookie (#521).
const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {} as Record<string, string | undefined>,
}));

vi.mock("js-cookie", () => ({
  default: {
    get: (name: string) => cookieStore[name],
    set: vi.fn(),
    remove: vi.fn(),
  },
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

/** Stores what the server exposes to the browser: the payload segment only. */
function setSession(token: string): void {
  cookieStore[CLAIMS_COOKIE] = token.split(".")[1] ?? token;
}

describe("getRoleFromToken", () => {
  beforeEach(() => {
    for (const key of Object.keys(cookieStore)) delete cookieStore[key];
  });
  afterEach(() => {
    for (const key of Object.keys(cookieStore)) delete cookieStore[key];
  });

  it("returns null when no session is stored", () => {
    expect(getRoleFromToken()).toBeNull();
  });

  it("reads a top-level `role` claim", () => {
    setSession(tokenWith({ role: "manager" }));
    expect(getRoleFromToken()).toBe("manager");
  });

  it("falls back to a `user_role` claim", () => {
    setSession(tokenWith({ user_role: "viewer" }));
    expect(getRoleFromToken()).toBe("viewer");
  });

  it("reads a nested `user.role` claim", () => {
    setSession(tokenWith({ user: { role: "owner" } }));
    expect(getRoleFromToken()).toBe("owner");
  });

  it("returns null for an unknown role value", () => {
    setSession(tokenWith({ role: "superadmin" }));
    expect(getRoleFromToken()).toBeNull();
  });

  it("returns null for a malformed token", () => {
    setSession("not-a-jwt");
    expect(getRoleFromToken()).toBeNull();
  });

  it("returns null when the payload is not valid JSON", () => {
    setSession("header.%%%.sig");
    expect(getRoleFromToken()).toBeNull();
  });
});
