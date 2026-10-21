import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  buildCsp,
  generateNonce,
  getMiddlewareDecision,
  isTokenExpired,
  middleware,
  sanitizeReturnTo,
  type MiddlewareRequestLike,
} from "../../middleware";

function scriptSrc(policy: string): string {
  return policy.split("; ").find((directive) => directive.startsWith("script-src ")) ?? "";
}

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

  describe("buildCsp", () => {
    it("allows eval and inline scripts in development for HMR", () => {
      const script = scriptSrc(buildCsp({ isDev: true }));

      expect(script).toContain("'unsafe-eval'");
      expect(script).toContain("'unsafe-inline'");
      expect(script).not.toContain("nonce-");
    });

    it("allows localhost connections in development only", () => {
      expect(buildCsp({ isDev: true })).toContain(
        "connect-src 'self' https: ws: wss: http://localhost:*"
      );
      expect(buildCsp({ isDev: false, nonce: "abc" })).not.toContain("localhost");
    });

    it("blocks eval and inline scripts in production, allowing only the nonce", () => {
      const script = scriptSrc(buildCsp({ isDev: false, nonce: "abc123" }));

      expect(script).not.toContain("'unsafe-eval'");
      expect(script).not.toContain("'unsafe-inline'");
      expect(script).toContain("'nonce-abc123'");
      expect(script).toContain("'strict-dynamic'");
    });

    it("keeps the third-party script and frame hosts in both environments", () => {
      for (const policy of [buildCsp({ isDev: true }), buildCsp({ isDev: false, nonce: "n" })]) {
        expect(scriptSrc(policy)).toContain("https://js.stripe.com");
        expect(scriptSrc(policy)).toContain("https://*.sentry.io");
        expect(policy).toContain("frame-ancestors 'none'");
        expect(policy).toContain("object-src 'none'");
      }
    });
  });

  describe("generateNonce", () => {
    it("returns a fresh base64 value on every call", () => {
      const first = generateNonce();
      const second = generateNonce();

      expect(first).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(first).not.toBe(second);
    });
  });

  describe("middleware CSP headers", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("sets a nonce-based report-only policy on public responses in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      const response = middleware(new NextRequest("http://localhost/login"));
      const reported = response.headers.get("Content-Security-Policy-Report-Only") ?? "";
      const nonce = /'nonce-([^']+)'/.exec(scriptSrc(reported))?.[1];

      expect(nonce).toBeTruthy();
      expect(scriptSrc(reported)).not.toContain("'unsafe-inline'");
      expect(response.headers.get("Content-Security-Policy")).toBeNull();
    });

    it("forwards the same nonce policy to the app so Next.js can apply it", () => {
      vi.stubEnv("NODE_ENV", "production");
      const response = middleware(new NextRequest("http://localhost/login"));
      const reported = response.headers.get("Content-Security-Policy-Report-Only");
      const forwarded = response.headers.get("x-middleware-request-content-security-policy");

      expect(forwarded).toBe(reported);
    });

    it("does not forward a nonce policy in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      const response = middleware(new NextRequest("http://localhost/login"));

      expect(response.headers.get("x-middleware-request-content-security-policy")).toBeNull();
      expect(response.headers.get("Content-Security-Policy-Report-Only")).toContain(
        "'unsafe-eval'"
      );
    });

    it("sets the report-only policy on redirects too", () => {
      vi.stubEnv("NODE_ENV", "production");
      const response = middleware(new NextRequest("http://localhost/dashboard"));

      expect(response.status).toBe(307);
      expect(response.headers.get("Content-Security-Policy-Report-Only")).toContain(
        "default-src 'self'"
      );
    });
  });
});
