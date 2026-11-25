import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import budgets from "../performance-budgets.json";
import { signInAsArtist } from "./support/session";

const webVitalsSource = readFileSync(
  resolve(dirname(require.resolve("web-vitals")), "web-vitals.iife.js"),
  "utf8"
);

test("dashboard interactions stay within the INP budget", async ({ page }) => {
  await page.addInitScript({
    content: `${webVitalsSource}
      webVitals.onINP(
        (metric) => { window.__inp = Math.max(window.__inp ?? 0, metric.value); },
        { reportAllChanges: true, durationThreshold: 0 }
      );`,
  });
  await page.route("**/api/backend/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
  await signInAsArtist(page);

  await page.goto("/dashboard/settings/network");
  await expect(page.getByRole("heading", { name: "Stellar network" })).toBeVisible();
  await page.getByRole("radio", { name: "Mainnet" }).click();
  await page.getByRole("radio", { name: "Testnet" }).click();
  await page.getByRole("radio", { name: "Mainnet" }).click();

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __inp?: number }).__inp ?? 0))
    .toBeGreaterThan(0);
  const inp = await page.evaluate(() => (window as unknown as { __inp?: number }).__inp as number);
  expect(inp, `Measured dashboard INP: ${inp}ms`).toBeLessThanOrEqual(
    budgets.metrics.inpMilliseconds
  );
});
