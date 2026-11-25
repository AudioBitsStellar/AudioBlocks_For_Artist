// WCAG 2.1 AA audit run (#152): axe-core plus a keyboard pass over every route.
//
// Not part of the regular journeys: it only runs with A11Y_AUDIT=1, and writes
// its raw results to A11Y_AUDIT_OUT (default test-results/a11y-audit.json),
// which docs/accessibility/WCAG_2.1_AA_AUDIT_REPORT.md is written from.
//
//   NEXT_PUBLIC_USE_MOCK_DATA=true NEXT_PUBLIC_ANALYTICS_WRITE_KEY=audit \
//     NEXT_PUBLIC_PRIVY_APP_ID=audit npm run dev           # in one terminal
//   A11Y_AUDIT=1 A11Y_COLOR_SCHEME=dark npx playwright test e2e/a11y-audit.spec.ts --project=chromium
//
// Mock mode is on so every surface has content to audit; the backend is
// stubbed so no request leaves the machine.

import fs from "fs";
import path from "path";
import { test, type Page } from "@playwright/test";
import { signInAsArtist } from "./support/session";

const ROUTES: { path: string; auth: boolean }[] = [
  { path: "/", auth: false },
  { path: "/login", auth: false },
  { path: "/signup", auth: false },
  { path: "/artist-portal", auth: false },
  { path: "/artist-portal/signup", auth: false },
  { path: "/artist/test-artist", auth: false },
  { path: "/accessibility", auth: false },
  { path: "/privacy", auth: false },
  { path: "/terms", auth: false },
  { path: "/verify-email", auth: false },
  { path: "/onboarding", auth: true },
  { path: "/dashboard/overview", auth: true },
  { path: "/dashboard/analytics", auth: true },
  { path: "/dashboard/my-music", auth: true },
  { path: "/dashboard/my-music/albums", auth: true },
  { path: "/dashboard/my-music/tracks", auth: true },
  { path: "/dashboard/upload-music", auth: true },
  { path: "/dashboard/events", auth: true },
  { path: "/dashboard/events/1", auth: true },
  { path: "/dashboard/events/1/tickets", auth: true },
  { path: "/dashboard/events/1/check-in", auth: true },
  { path: "/dashboard/merches", auth: true },
  { path: "/dashboard/merches/inventory", auth: true },
  { path: "/dashboard/merches/preview", auth: true },
  { path: "/dashboard/messages", auth: true },
  { path: "/dashboard/payouts", auth: true },
  { path: "/dashboard/collaborators", auth: true },
  { path: "/dashboard/collaborators/royalties", auth: true },
  { path: "/dashboard/onchain-stats", auth: true },
  { path: "/dashboard/activity-log", auth: true },
  { path: "/dashboard/changelog", auth: true },
  { path: "/dashboard/referrals", auth: true },
  { path: "/dashboard/team", auth: true },
  { path: "/dashboard/profile", auth: true },
  { path: "/dashboard/accessibility", auth: true },
  { path: "/dashboard/settings/appearance", auth: true },
  { path: "/dashboard/settings/linked-accounts", auth: true },
  { path: "/dashboard/settings/network", auth: true },
  { path: "/dashboard/settings/notifications", auth: true },
  { path: "/dashboard/settings/payout", auth: true },
  { path: "/dashboard/settings/preferences", auth: true },
  { path: "/dashboard/settings/security", auth: true },
  { path: "/dashboard/settings/verification", auth: true },
  { path: "/dashboard/settings/wallet", auth: true },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const MAX_TABS = 80;
const AXE_SOURCE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

/** The slice of axe-core's result this spec reads (axe is injected as a script, not imported). */
type AxeRun = (
  context: Document,
  options: { runOnly: { type: "tag"; values: string[] } }
) => Promise<{
  violations: {
    id: string;
    impact: string | null;
    help: string;
    helpUrl: string;
    tags: string[];
    nodes: { target: string[]; html: string; failureSummary?: string }[];
  }[];
}>;

interface FocusStop {
  tag: string;
  role: string | null;
  name: string;
  visibleIndicator: boolean;
  inViewport: boolean;
}

interface RouteResult {
  path: string;
  title: string;
  lang: string | null;
  h1Count: number;
  landmarks: string[];
  violations: {
    id: string;
    impact: string | null;
    help: string;
    helpUrl: string;
    tags: string[];
    nodes: { target: string; html: string; summary: string }[];
  }[];
  keyboard: {
    stops: FocusStop[];
    firstStop: string | null;
    skipLinkWorks: boolean | null;
    trappedAt: number | null;
    stopsWithoutIndicator: number;
  };
  error?: string;
}

async function stubBackend(page: Page): Promise<void> {
  await page.route("**/api/backend/**", (route) => {
    const url = route.request().url();
    if (url.includes("/royalty-payouts/export")) {
      return route.fulfill({
        status: 200,
        contentType: "text/csv",
        body: "ID,SaleEventId,Status,Currency,GrossAmount,CreatedAt\n",
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
  // Nothing leaves the machine: every other origin gets an empty answer.
  await page.route(
    (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
    (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

async function keyboardPass(page: Page): Promise<RouteResult["keyboard"]> {
  // Start from the top of the document, as a keyboard user arriving on the page would.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  const stops: FocusStop[] = [];
  let trappedAt: number | null = null;
  const seen: string[] = [];

  for (let i = 0; i < MAX_TABS; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      const ring = style.boxShadow !== "none" && style.boxShadow !== "";
      const rect = el.getBoundingClientRect();
      const name = (
        el.getAttribute("aria-label") ||
        (el.getAttribute("aria-labelledby") &&
          document.getElementById(el.getAttribute("aria-labelledby")!)?.textContent) ||
        el.textContent ||
        (el as HTMLInputElement).placeholder ||
        el.getAttribute("title") ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      // A DOM path, not outerHTML: focus styles and aria-current change the markup.
      const pathOf = (node: Element): string => {
        const parts: string[] = [];
        for (
          let cur: Element | null = node;
          cur && cur !== document.documentElement;
          cur = cur.parentElement
        ) {
          const parent: Element | null = cur.parentElement;
          const index = parent ? [...parent.children].indexOf(cur) : 0;
          parts.unshift(`${cur.tagName}:${index}`);
        }
        return parts.join(">");
      };
      return {
        key: pathOf(el),
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        name,
        visibleIndicator: outline || ring,
        inViewport: rect.width > 0 && rect.height > 0,
      };
    });
    if (!stop) {
      if (stops.length > 0) break; // wrapped back to the document: end of the order
      continue;
    }
    if (seen.includes(stop.key)) {
      // Back at a stop seen before: either wrapped around or stuck in a cycle.
      if (seen.indexOf(stop.key) !== 0) trappedAt = stops.length;
      break;
    }
    seen.push(stop.key);
    const { key: _key, ...rest } = stop;
    stops.push(rest);
  }

  let skipLinkWorks: boolean | null = null;
  if (stops[0] && /skip/i.test(stops[0].name)) {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    skipLinkWorks = await page.evaluate(() => {
      const el = document.activeElement;
      return !!el && (el.id === "main-content" || !!el.closest("#main-content, main"));
    });
  }

  return {
    stops,
    firstStop: stops[0]?.name ?? null,
    skipLinkWorks,
    trappedAt,
    stopsWithoutIndicator: stops.filter((s) => !s.visibleIndicator && s.inViewport).length,
  };
}

test.describe("WCAG 2.1 AA audit (#152)", () => {
  // The app follows the OS theme by default; audit each with A11Y_COLOR_SCHEME=light|dark.
  test.use({ colorScheme: process.env.A11Y_COLOR_SCHEME === "dark" ? "dark" : "light" });
  test.skip(!process.env.A11Y_AUDIT, "Set A11Y_AUDIT=1 to run the accessibility audit");
  test.setTimeout(30 * 60_000);

  test("audits every route", async ({ page }) => {
    const results: RouteResult[] = [];

    for (const route of ROUTES) {
      await page.context().clearCookies();
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await stubBackend(page);
      if (route.auth) await signInAsArtist(page);

      const result: RouteResult = {
        path: route.path,
        title: "",
        lang: null,
        h1Count: 0,
        landmarks: [],
        violations: [],
        keyboard: {
          stops: [],
          firstStop: null,
          skipLinkWorks: null,
          trappedAt: null,
          stopsWithoutIndicator: 0,
        },
      };

      try {
        await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(1_500);

        Object.assign(
          result,
          await page.evaluate(() => ({
            title: document.title,
            lang: document.documentElement.getAttribute("lang"),
            h1Count: document.querySelectorAll("h1").length,
            landmarks: [
              ...document.querySelectorAll(
                "header, nav, main, aside, footer, [role=banner], [role=navigation], [role=main], [role=complementary], [role=contentinfo]"
              ),
            ].map((el) => el.getAttribute("role") || el.tagName.toLowerCase()),
          }))
        );

        await page.addScriptTag({ content: AXE_SOURCE });
        const axeResult = await page.evaluate(async (tags) => {
          const axe = (window as unknown as { axe: { run: AxeRun } }).axe;
          const r = await axe.run(document, { runOnly: { type: "tag", values: tags } });
          return r.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            tags: v.tags,
            nodes: v.nodes.slice(0, 8).map((n) => ({
              target: n.target.join(" "),
              html: n.html.slice(0, 200),
              summary: (n.failureSummary || "").slice(0, 300),
            })),
          }));
        }, WCAG_TAGS);
        result.violations = axeResult;
        result.keyboard = await keyboardPass(page);
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err);
      }
      results.push(result);
    }

    const out = process.env.A11Y_AUDIT_OUT ?? path.join("test-results", "a11y-audit.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(
      out,
      JSON.stringify({ generatedAt: new Date().toISOString(), tags: WCAG_TAGS, results }, null, 2)
    );
  });
});
