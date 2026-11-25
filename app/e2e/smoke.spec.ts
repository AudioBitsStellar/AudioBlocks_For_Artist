// Post-deploy staging smoke test (#746).
//
// Runs with `PLAYWRIGHT_BASE_URL` pointing at the freshly deployed staging
// environment. Keep this suite small and backend-independent: it is the gate
// that decides whether a staging deployment may be promoted.

import { expect, test } from "@playwright/test";

test.describe("Staging smoke @smoke", () => {
  test("the home page renders", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/AudioBlocks/i);
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(page.getByText("Application error")).toHaveCount(0);
  });

  test("the login page renders its form", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
  });

  test("an unauthenticated dashboard visit redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login?returnTo=**");
    await expect(page).toHaveURL(/\/login\?returnTo=/);
  });
});
