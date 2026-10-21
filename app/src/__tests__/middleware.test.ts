import { describe, it, expect } from "vitest";
import {
  getMiddlewareDecision,
  isTokenExpired,
  sanitizeReturnTo,
  type MiddlewareRequestLike,
} from "../../middleware";

function createMockJwt(expInSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expInSeconds })).toString("base64url");
  return `${header}.${payload}.mockSignature`;
}

function mockRequest(
  pathname: string,
  search = "",
  cookies: Record<string, string> = {}
): MiddlewareRequestLike {
  return {
    nextUrl: { pathname, search },
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  };
}

describe("Middleware auth decision & returnTo validation", () => {
  describe("sanitizeReturnTo", () => {
    it("preserves safe relative paths", () => {
      expect(sanitizeReturnTo("/dashboard/overview")).toBe("/dashboard/overview");
      expect(sanitizeReturnTo("/admin/artists?query=test")).toBe("/admin/artists?query=test");
    });

    it("rejects protocol-relative open redirect URLs", () => {
      expect(sanitizeReturnTo("//evil.com")).toBe("/dashboard");
      expect(sanitizeReturnTo("/\\evil.com")).toBe("/dashboard");
    });

    it("rejects absolute or non-relative URLs", () => {
      expect(sanitizeReturnTo("https://evil.com")).toBe("/dashboard");
      expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/dashboard");
      expect(sanitizeReturnTo("")).toBe("/dashboard");
    });
  });

  describe("isTokenExpired", () => {
    it("returns true for malformed tokens", () => {
      expect(isTokenExpired("not-a-token")).toBe(true);
      expect(isTokenExpired("")).toBe(true);
    });

    it("returns true for tokens expired in the past", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      expect(isTokenExpired(createMockJwt(pastExp))).toBe(true);
    });

    it("returns false for tokens valid in the future", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      expect(isTokenExpired(createMockJwt(futureExp))).toBe(false);
    });
  });

  describe("getMiddlewareDecision", () => {
    it("allows unprotected public routes through without auth", () => {
      const req = mockRequest("/login");
      expect(getMiddlewareDecision(req)).toEqual({ type: "next" });
    });

    it("redirects unauthenticated requests on /dashboard to /login with returnTo", () => {
      const req = mockRequest("/dashboard/overview", "?tab=sales");
      const decision = getMiddlewareDecision(req);

      expect(decision.type).toBe("redirect");
      if (decision.type === "redirect") {
        expect(decision.redirectPath).toBe(
          `/login?returnTo=${encodeURIComponent("/dashboard/overview?tab=sales")}`
        );
      }
    });

    it("redirects unauthenticated requests on /admin to /login with returnTo", () => {
      const req = mockRequest("/admin");
      const decision = getMiddlewareDecision(req);

      expect(decision.type).toBe("redirect");
      if (decision.type === "redirect") {
        expect(decision.redirectPath).toBe(`/login?returnTo=${encodeURIComponent("/admin")}`);
      }
    });

    it("redirects requests with expired token", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      const expiredToken = createMockJwt(pastExp);
      const req = mockRequest("/dashboard", "", { audioblocks_jwt: expiredToken });
      const decision = getMiddlewareDecision(req);

      expect(decision.type).toBe("redirect");
    });

    it("allows protected requests with valid audioblocks_jwt", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const validToken = createMockJwt(futureExp);
      const req = mockRequest("/dashboard/overview", "", { audioblocks_jwt: validToken });

      expect(getMiddlewareDecision(req)).toEqual({ type: "next" });
    });

    it("allows protected requests with valid privy-token", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const validToken = createMockJwt(futureExp);
      const req = mockRequest("/admin/moderation", "", { "privy-token": validToken });

      expect(getMiddlewareDecision(req)).toEqual({ type: "next" });
    });
  });
});
