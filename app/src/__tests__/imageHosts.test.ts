import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// PERF-06: production image optimisation must not reach for a placeholder
// host. This is a test rather than a comment because the three remote patterns
// that were here looked harmless and shipped for months.

// jsdom gives `import.meta.url` an http scheme, so the path is taken from the
// package root vitest runs in (app/), not from the module URL.
const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

describe("next.config image hosts", () => {
  it.each([
    "images.unsplash.com",
    "source.unsplash.com",
    "picsum.photos",
    "placehold.co",
    "via.placeholder.com",
  ])("does not allow the placeholder host %s", (host) => {
    expect(config).not.toContain(host);
  });

  it("lists no remote patterns at all, since covers are served from our own origin", () => {
    expect(config).toMatch(/remotePatterns:\s*\[\s*\]/);
  });
});
