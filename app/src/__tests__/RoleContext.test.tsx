import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { RoleProvider } from "@/context/RoleContext";
import { CLAIMS_COOKIE } from "@/lib/session";
import { useRole } from "@/hooks/useRole";

// The access token is httpOnly, so the browser only sees the claims cookie (#521).
const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {} as Record<string, string | undefined>,
}));

vi.mock("js-cookie", () => ({
  default: { get: (name: string) => cookieStore[name], set: vi.fn(), remove: vi.fn() },
}));

function setSession(token: string): void {
  cookieStore[CLAIMS_COOKIE] = token.split(".")[1] ?? token;
}

function clearSession(): void {
  for (const key of Object.keys(cookieStore)) delete cookieStore[key];
}

function tokenWith(claims: Record<string, unknown>): string {
  const b64 = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64(claims)}.sig`;
}

function RoleProbe() {
  const { role, can } = useRole();
  return (
    <div>
      <span data-testid="role">{role}</span>
      <span data-testid="can-delete">{String(can("content:delete"))}</span>
    </div>
  );
}

describe("RoleProvider — session role resolution", () => {
  beforeEach(() => {
    clearSession();
  });
  afterEach(() => {
    clearSession();
  });

  it("uses an explicit initialRole when given", () => {
    setSession(tokenWith({ role: "viewer" }));
    render(
      <RoleProvider initialRole="manager">
        <RoleProbe />
      </RoleProvider>
    );
    expect(screen.getByTestId("role")).toHaveTextContent("manager");
  });

  it("derives the role from the session JWT when no initialRole is given", () => {
    setSession(tokenWith({ role: "manager" }));
    render(
      <RoleProvider>
        <RoleProbe />
      </RoleProvider>
    );
    expect(screen.getByTestId("role")).toHaveTextContent("manager");
    expect(screen.getByTestId("can-delete")).toHaveTextContent("true");
  });

  it("falls back to viewer (not owner) for a session with no role claim", () => {
    render(
      <RoleProvider>
        <RoleProbe />
      </RoleProvider>
    );
    expect(screen.getByTestId("role")).toHaveTextContent("viewer");
    expect(screen.getByTestId("can-delete")).toHaveTextContent("false");
  });

  it("falls back to viewer when useRole is used with no provider", () => {
    render(<RoleProbe />);
    expect(screen.getByTestId("role")).toHaveTextContent("viewer");
    expect(screen.getByTestId("can-delete")).toHaveTextContent("false");
  });
});
