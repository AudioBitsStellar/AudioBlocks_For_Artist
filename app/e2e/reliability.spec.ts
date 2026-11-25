import { test, expect } from "@playwright/test";

test("shows the branded 404 page for an unknown route", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");

  await expect(page.getByRole("heading", { name: /went off the playlist/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
    "href",
    "/dashboard"
  );
  await expect(page.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
});

test("injects feature overrides from runtime configuration", async ({ page }) => {
  await page.goto("/");

  await expect
    .poll(() => page.evaluate(() => typeof window.__RUNTIME_CONFIG__?.featureFlags))
    .toBe("string");
});

test("shows the global API outage banner after a mocked service failure", async ({ page }) => {
  await page.route("**/api/backend/auth/login-email", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Service unavailable" }),
    });
  });

  await page.goto("/login");
  await page.fill("#login-email", "artist@example.com");
  await page.fill("#login-password", "correct-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByTestId("api-unavailable-banner")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
