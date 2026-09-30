/**
 * Guards the brand token system (#463).
 *
 * The palette lives in three places that historically drifted apart: the CSS
 * custom properties in `globals.css`, the TypeScript map in `theme/colors.ts`,
 * and the token catalog documented in `theme/README.md` and
 * `docs/theme-tokens.md`. These tests keep all three consistent and catch the
 * failure mode that motivated the issue — components referencing CSS variables
 * that were never declared, which silently renders unstyled, theme-blind UI.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP_ROOT = join(__dirname, "..", "..");
const SRC_DIR = join(APP_ROOT, "src");
const GLOBALS_CSS = readFileSync(join(SRC_DIR, "app", "globals.css"), "utf8");
const THEME_README = readFileSync(join(SRC_DIR, "theme", "README.md"), "utf8");
const COLORS_TS = readFileSync(join(SRC_DIR, "theme", "colors.ts"), "utf8");

/** `next/font` injects these at runtime, so they're declared nowhere in CSS. */
const RUNTIME_PROVIDED_VARS = new Set(["--font-geist-sans", "--font-geist-mono"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(entry.name) ? [path] : [];
  });
}

/** Custom properties assigned inside a `:root { … }` or `.dark { … }` block. */
function declarationsIn(blockSelector: string, css: string): Map<string, string> {
  const start = css.indexOf(`${blockSelector} {`);
  if (start === -1) throw new Error(`No "${blockSelector}" block found in globals.css`);
  const block = css.slice(start + blockSelector.length + 1, css.indexOf("}", start));
  const entries = new Map<string, string>();
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    entries.set(match[1], match[2].trim());
  }
  return entries;
}

const rootDeclarations = declarationsIn(":root", GLOBALS_CSS);
const darkDeclarations = declarationsIn(".dark", GLOBALS_CSS);

describe("theme token palette (#463)", () => {
  it("declares a dark-mode value for every light-mode token", () => {
    const undocumented = [...rootDeclarations.keys()].filter(
      (token) => !darkDeclarations.has(token)
    );
    expect(undocumented).toEqual([]);
  });

  it("matches the token catalog documented in app/src/theme/README.md", () => {
    const rows = THEME_README.split("\n")
      .map((line) => line.trim())
      .filter((line) => /^\|\s*`[\w-]+`\s*\|/.test(line));

    expect(rows.length).toBeGreaterThan(10);

    const mismatches: string[] = [];
    for (const row of rows) {
      const cells = row
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);
      const token = cells[0].replace(/`/g, "");
      const lightHex = cells[1].match(/#[0-9a-fA-F]{6}/)?.[0]?.toLowerCase();
      const darkHex = cells[2].match(/#[0-9a-fA-F]{6}/)?.[0]?.toLowerCase();
      if (!lightHex || !darkHex) continue;
      if (rootDeclarations.get(`--color-${token}`) !== lightHex) {
        mismatches.push(
          `--color-${token}: light is ${rootDeclarations.get(`--color-${token}`)}, docs say ${lightHex}`
        );
      }
      if (darkDeclarations.get(`--color-${token}`) !== darkHex) {
        mismatches.push(
          `--color-${token}: dark is ${darkDeclarations.get(`--color-${token}`)}, docs say ${darkHex}`
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("keeps every token in theme/colors.ts backed by a CSS custom property", () => {
    const referenced = [...COLORS_TS.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1]);
    expect(referenced.length).toBeGreaterThan(10);
    const missing = referenced.filter((token) => !rootDeclarations.has(token));
    expect(missing).toEqual([]);
  });
});

describe("CSS custom property usage", () => {
  it("only references variables that are actually declared", () => {
    const known = new Set<string>();
    const referenced = new Set<string>();
    for (const file of sourceFiles(SRC_DIR)) {
      const contents = readFileSync(file, "utf8");
      for (const match of contents.matchAll(/(--[\w-]+)\s*:/g)) known.add(match[1]);
      for (const match of contents.matchAll(/var\((--[\w-]+)/g)) referenced.add(match[1]);
    }
    const undefinedVars = [...referenced]
      .filter((token) => !known.has(token) && !RUNTIME_PROVIDED_VARS.has(token))
      .sort();
    expect(undefinedVars).toEqual([]);
  });

  it("registers every colour token used as a Tailwind utility in @theme", () => {
    const themeStart = GLOBALS_CSS.indexOf("@theme inline {");
    const themeBlock = GLOBALS_CSS.slice(themeStart, GLOBALS_CSS.indexOf("}", themeStart));
    const registered = new Set(
      [...themeBlock.matchAll(/(--color-[\w-]+)\s*:/g)].map((match) => match[1])
    );
    const usedAsUtility = new Set<string>();
    for (const file of sourceFiles(SRC_DIR)) {
      if (!/\.tsx?$/.test(file)) continue;
      const contents = readFileSync(file, "utf8");
      for (const match of contents.matchAll(
        /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|placeholder|outline|accent|decoration)-(primary-hover|primary-contrast|secondary-contrast|surface-raised|surface-sunken|surface|text-muted|text-subtle|text-inverted|text|border-subtle|border|background|foreground|primary|secondary|success|warning|error|info)(?![\w-])/g
      )) {
        usedAsUtility.add(`--color-${match[1]}`);
      }
    }
    const missing = [...usedAsUtility]
      .filter((token) => !registered.has(token) && token !== "--color-border-default")
      .sort();
    expect(missing).toEqual([]);
  });
});

describe("print stylesheet", () => {
  it("stays outside the theme system so reports print on paper", () => {
    expect(GLOBALS_CSS).toContain("@media print");
    const printBlock = GLOBALS_CSS.slice(GLOBALS_CSS.indexOf("@media print"));
    expect(printBlock).not.toContain("var(--");
  });
});
