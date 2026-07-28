import { describe, it, expect } from "vitest";
import { sanitize } from "@/utils/sanitize";

describe("sanitize", () => {
  it("escapes script tags instead of interpreting them", () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("escapes an inline event-handler injection attempt", () => {
    expect(sanitize('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });

  it("leaves plain text unchanged", () => {
    expect(sanitize("My favorite track")).toBe("My favorite track");
  });

  it("returns an empty string for empty input", () => {
    expect(sanitize("")).toBe("");
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitize(undefined)).toBe("");
    expect(sanitize(null)).toBe("");
    expect(sanitize(42)).toBe("");
  });

  it("does not double-escape when applied to already-safe text", () => {
    expect(sanitize("Amet minim mollit non deserunt")).toBe(
      "Amet minim mollit non deserunt"
    );
  });
});
