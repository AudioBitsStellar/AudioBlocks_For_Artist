// Playwright E2E tests for the login and signup flows (#129).
//
// The auth API is mocked via page.route() rather than hitting a real
// backend — matching the actual request shape found in
// src/services/authService.ts and src/api/axios.ts:
//   - baseURL: http://localhost:3000/api (NEXT_PUBLIC_API_BASE_URL override)
//   - POST /auth/register-email  -> { user, token }
//   - POST /auth/login-email     -> { user, token }
// On success, both pages store the JWT via js-cookie ("audioblocks_jwt")
// and redirect to /dashboard.
//
// Prerequisites:
//   npx playwright install chromium
//
// Run:
//   npm run test:e2e

import { test, expect } from "@playwright/test";

const AUTH_USER = {
  id: "user-1",
  email: "artist@example.com",
  name: "Test Artist",
  role: "artist",
};
const AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.fake-signature-for-e2e-tests";

test.describe("Signup flow", () => {
  test("fills the form, submits, and redirects to the dashboard", async ({ page }) => {
    await page.route("**/api/auth/register-email", async (route) => {
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        email: "newartist@example.com",
        password: "supersecret123",
        role: "artist",
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: AUTH_USER, token: AUTH_TOKEN }),
      });
    });

    await page.goto("/signup");
    await page.fill("#signup-name", "New Artist");
    await page.fill("#signup-username", "newartist");
    await page.fill("#signup-email", "newartist@example.com");
    await page.fill("#signup-password", "supersecret123");
    await page.getByRole("button", { name: "Sign up" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("shows an error message when signing up with an existing email", async ({ page }) => {
    await page.route("**/api/auth/register-email", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "An account with this email already exists." }),
      });
    });

    await page.goto("/signup");
    await page.fill("#signup-email", "existing@example.com");
    await page.fill("#signup-password", "supersecret123");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });
});

test.describe("Login flow", () => {
  test("enters credentials, submits, and reaches the dashboard", async ({ page }) => {
    await page.route("**/api/auth/login-email", async (route) => {
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        email: "artist@example.com",
        password: "correct-password",
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: AUTH_USER, token: AUTH_TOKEN }),
      });
    });

    await page.goto("/login");
    await page.fill("#login-email", "artist@example.com");
    await page.fill("#login-password", "correct-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("shows an error message for an invalid password and stays on the login page", async ({ page }) => {
    await page.route("**/api/auth/login-email", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid email or password." }),
      });
    });

    await page.goto("/login");
    await page.fill("#login-email", "artist@example.com");
    await page.fill("#login-password", "wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

// #129's acceptance criteria also ask for a logout test ("click logout,
// verify redirect to login page"). There is no standalone "Log out" button
// anywhere in the primary navigation (TopHeader/Sidebar) in this codebase —
// the only "Log Out" affordance found is inside SessionWarningModal
// (src/components/shared/SessionWarningModal.tsx), which only renders when
// a session is close to expiring. Reliably triggering that in an E2E test
// would mean fast-forwarding real session-expiry timers, which is a
// different and much larger test than what this issue describes. Rather
// than fabricate a "click logout" flow the app doesn't actually expose,
// this is flagged here (and in the PR description) as a real gap: logout
// E2E coverage needs either a dedicated logout control added to the nav
// first, or a follow-up test built around SessionWarningModal specifically.
