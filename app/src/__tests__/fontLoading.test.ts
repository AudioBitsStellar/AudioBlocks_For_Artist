import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CLS_BUDGET, budgetFor } from "@/lib/performanceBudgets";

// PERF-07. The layout already loaded Geist through next/font; what was missing
// was the guarantee that it stays that way. A `<link>` to fonts.googleapis.com
// added in a component would reintroduce a third-party round trip and a font
// swap after first paint, and nothing would fail.

const appRoot = process.cwd();
const layout = readFileSync(join(appRoot, "src", "app", "layout.tsx"), "utf8");
const globals = readFileSync(join(appRoot, "src", "app", "globals.css"), "utf8");

describe("font loading", () => {
  it("loads Geist through next/font, not a stylesheet link", () => {
    expect(layout).toContain('from "next/font/google"');
    expect(layout).toMatch(/Geist\(/);
    expect(layout).toMatch(/Geist_Mono\(/);
  });

  it("subsets both faces to latin", () => {
    expect(layout.match(/subsets:\s*\["latin"\]/g)?.length).toBe(2);
  });

  it("uses display: swap and preloads both faces", () => {
    expect(layout.match(/display:\s*"swap",/g)?.length).toBe(2);
    expect(layout.match(/preload:\s*true/g)?.length).toBe(2);
  });

  it("applies both font variables on the body, so the fallback and the real face share a scope", () => {
    expect(layout).toContain("geistSans.variable");
    expect(layout).toContain("geistMono.variable");
  });

  it("never imports a font from a third-party origin", () => {
    for (const source of [layout, globals]) {
      expect(source).not.toMatch(/fonts\.googleapis\.com/);
      expect(source).not.toMatch(/fonts\.gstatic\.com/);
      expect(source).not.toMatch(/@import\s+url\(/);
    }
  });

  it("has a documented CLS budget to regress against", () => {
    // next/font's adjusted fallback is what keeps the swap from shifting
    // layout; this is the number a regression would have to break.
    expect(CLS_BUDGET).toBe(0.1);
    expect(budgetFor("CLS")).toBe(CLS_BUDGET);
  });
});
