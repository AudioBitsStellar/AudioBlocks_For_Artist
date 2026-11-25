
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { getCanonicalRedirect, middleware } from "../../middleware";

const EXPECTED_PERMISSIONS_POLICY =
  "camera=(), microphone=(), geolocation=()";

describe("Domain, TLS, Redirects and Canonical Host (OPS-08 / #773)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Canonical host enforcement", () => {
    it("redirects non-canonical host to CANONICAL_HOST with 301", () => {
      vi.stubEnv("CANONICAL_HOST", "artists.audioblocks.io");

      const req = new NextRequest("http://audioblocks.io/dashboard/overview", {
        headers: { host: "audioblocks.io" },
      });

      const redirect = getCanonicalRedirect(req);

      expect(redirect).not.toBeNull();
      expect(redirect?.status).toBe(301);
      expect(redirect?.headers.get("location")).toBe(
        "https://artists.audioblocks.io/dashboard/overview"
      );
    });

    it("does not redirect when the host already matches CANONICAL_HOST", () => {
      vi.stubEnv("CANONICAL_HOST", "artists.audioblocks.io");

      const req = new NextRequest(
        "https://artists.audioblocks.io/dashboard/overview",
        {
          headers: { host: "artists.audioblocks.io" },
        }
      );

      const redirect = getCanonicalRedirect(req);

      expect(redirect).toBeNull();
    });

    it("does not redirect when CANONICAL_HOST is not configured", () => {
      vi.stubEnv("CANONICAL_HOST", "");

      const req = new NextRequest("http://localhost:3000/dashboard", {
        headers: { host: "localhost:3000" },
      });

      const redirect = getCanonicalRedirect(req);

      expect(redirect).toBeNull();
    });
  });

  describe("HTTP to HTTPS redirect in production", () => {
    it("redirects HTTP requests to HTTPS with 301 when x-forwarded-proto is http", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("CANONICAL_HOST", "artists.audioblocks.io");

      const req = new NextRequest("http://artists.audioblocks.io/dashboard", {
        headers: {
          host: "artists.audioblocks.io",
          "x-forwarded-proto": "http",
        },
      });

      const redirect = getCanonicalRedirect(req);

      expect(redirect).not.toBeNull();
      expect(redirect?.status).toBe(301);
      expect(redirect?.headers.get("location")).toBe(
        "https://artists.audioblocks.io/dashboard"
      );
    });
  });

  describe("Strict-Transport-Security (HSTS) headers", () => {
    it("applies HSTS header in production", () => {
      vi.stubEnv("NODE_ENV", "production");

      const req = new NextRequest("https://artists.audioblocks.io/login", {
        headers: { host: "artists.audioblocks.io" },
      });

      const response = middleware(req);

      expect(response.headers.get("Strict-Transport-Security")).toBe(
        "max-age=63072000; includeSubDomains; preload"
      );
    });

    it("does not apply HSTS in development environment", () => {
      vi.stubEnv("NODE_ENV", "development");

      const req = new NextRequest("http://localhost:3000/login", {
        headers: { host: "localhost:3000" },
      });

      const response = middleware(req);

      expect(response.headers.get("Strict-Transport-Security")).toBeNull();
    });
  });

  describe("X-Content-Type-Options header", () => {
    it("sets nosniff on responses", () => {
      vi.stubEnv("NODE_ENV", "development");

      const req = new NextRequest("http://localhost:3000/login", {
        headers: { host: "localhost:3000" },
      });

      const response = middleware(req);

      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });
  });

  describe("Referrer-Policy header", () => {
    it("sets strict-origin-when-cross-origin on responses", () => {
      vi.stubEnv("NODE_ENV", "development");

      const req = new NextRequest("http://localhost:3000/login", {
        headers: { host: "localhost:3000" },
      });

      const response = middleware(req);

      expect(response.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
    });
  });

  describe("Permissions-Policy header", () => {
    it("disables camera, microphone, and geolocation", () => {
      vi.stubEnv("NODE_ENV", "development");

      const req = new NextRequest("http://localhost:3000/login", {
        headers: { host: "localhost:3000" },
      });

      const response = middleware(req);

      expect(response.headers.get("Permissions-Policy")).toBe(
        EXPECTED_PERMISSIONS_POLICY
      );
    });
  });

  describe("Security headers on redirects", () => {
    it("applies security headers to authentication redirects", () => {
      vi.stubEnv("NODE_ENV", "development");

      const req = new NextRequest("http://localhost:3000/dashboard", {
        headers: { host: "localhost:3000" },
      });

      const response = middleware(req);

      // Unauthenticated dashboard access redirects to login.
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");

      // SEC-07 headers should be present on redirect responses too.
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
      expect(response.headers.get("Permissions-Policy")).toBe(
        EXPECTED_PERMISSIONS_POLICY
      );
    });

    it("applies security headers to canonical host redirects", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("CANONICAL_HOST", "artists.audioblocks.io");

      const req = new NextRequest("https://audioblocks.io/login", {
        headers: { host: "audioblocks.io" },
      });

      const response = middleware(req);

      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe(
        "https://artists.audioblocks.io/login"
      );

      expect(response.headers.get("Strict-Transport-Security")).toBe(
        "max-age=63072000; includeSubDomains; preload"
      );
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
      expect(response.headers.get("Permissions-Policy")).toBe(
        EXPECTED_PERMISSIONS_POLICY
      );
    });
  });
});
