/**
 * Tests for lib/sanitizeReturnTo.ts (issue #718)
 *
 * Covers all hostile patterns that could lead to an open redirect, plus the
 * safe paths that must be preserved for the post-login redirect to work.
 */
import { describe, it, expect } from "vitest";
import { sanitizeReturnTo } from "@/lib/sanitizeReturnTo";

describe("sanitizeReturnTo", () => {
  // ── Safe paths — must be returned unchanged ──────────────────────────────────

  it("preserves a simple dashboard path", () => {
    expect(sanitizeReturnTo("/dashboard")).toBe("/dashboard");
  });

  it("preserves a nested path with query string", () => {
    expect(sanitizeReturnTo("/dashboard/overview?tab=sales")).toBe(
      "/dashboard/overview?tab=sales"
    );
  });

  it("preserves an admin path", () => {
    expect(sanitizeReturnTo("/admin/artists")).toBe("/admin/artists");
  });

  it("preserves a path with a hash fragment", () => {
    expect(sanitizeReturnTo("/profile#section")).toBe("/profile#section");
  });

  // ── Open-redirect hostile inputs — must return /dashboard ────────────────────

  it("rejects a protocol-relative URL (//evil.com)", () => {
    expect(sanitizeReturnTo("//evil.com")).toBe("/dashboard");
  });

  it("rejects a backslash protocol-relative URL (/\\\\evil.com)", () => {
    expect(sanitizeReturnTo("/\\evil.com")).toBe("/dashboard");
  });

  it("rejects an absolute HTTPS URL", () => {
    expect(sanitizeReturnTo("https://evil.com")).toBe("/dashboard");
  });

  it("rejects an absolute HTTP URL", () => {
    expect(sanitizeReturnTo("http://evil.com/steal")).toBe("/dashboard");
  });

  it("rejects a javascript: URI", () => {
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/dashboard");
  });

  it("rejects a data: URI", () => {
    expect(sanitizeReturnTo("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
  });

  it("rejects an empty string", () => {
    expect(sanitizeReturnTo("")).toBe("/dashboard");
  });

  it("rejects a path that starts with a space (not '/')", () => {
    expect(sanitizeReturnTo(" /dashboard")).toBe("/dashboard");
  });

  it("rejects a bare domain with no leading slash", () => {
    expect(sanitizeReturnTo("evil.com")).toBe("/dashboard");
  });

  it("rejects /login and /signup so a redirect can't loop back to auth (#575)", () => {
    expect(sanitizeReturnTo("/login")).toBe("/dashboard");
    expect(sanitizeReturnTo("/signup")).toBe("/dashboard");
  });

  // ── Type safety ──────────────────────────────────────────────────────────────

  it("handles non-string input gracefully (cast via any)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeReturnTo(null as any)).toBe("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeReturnTo(undefined as any)).toBe("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeReturnTo(42 as any)).toBe("/dashboard");
  });
});
