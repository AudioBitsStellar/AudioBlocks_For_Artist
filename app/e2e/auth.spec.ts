// Playwright E2E tests for the login and signup flows (#129).
//
// The auth API is mocked via page.route() rather than hitting a real
// backend — matching the actual request shape found in
// src/services/authService.ts and src/api/axios.ts:
//   - baseURL: http://localhost:3000/api/backend (same-origin proxy, #521)
//   - POST /auth/register-email  -> { user, token }
//   - POST /auth/login-email     -> { user, token }
// On success, both pages store the session in httpOnly cookies ("audioblocks_session").
// Signup continues into onboarding. The dashboard gate sends an unverified
// artist to the check-inbox step (#519), and login only goes straight to
// /dashboard when the backend reports the email as verified.
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
const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.fake-signature-for-e2e-tests";

test.describe("Signup flow", () => {
  test("fills the form, submits, and continues to onboarding", async ({ page }) => {
    await page.route("**/api/backend/auth/register-email", async (route) => {
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

    // Signup continues into onboarding. The verification link is in the artist's
    // inbox, and the dashboard gate holds them until it is used (#519).
    await page.waitForURL("**/onboarding");
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("shows an error message when signing up with an existing email", async ({ page }) => {
    await page.route("**/api/backend/auth/register-email", async (route) => {
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
    await page.route("**/api/backend/auth/login-email", async (route) => {
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

  test("sends an unverified account to the verification step instead", async ({ page }) => {
    await page.route("**/api/backend/auth/login-email", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { ...AUTH_USER, emailVerified: false },
          token: AUTH_TOKEN,
        }),
      });
    });

    await page.goto("/login");
    await page.fill("#login-email", "artist@example.com");
    await page.fill("#login-password", "correct-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.waitForURL("**/verify-email");
    await expect(page.getByRole("heading", { name: /check your inbox/i })).toBeVisible();
  });

  test("shows an error message for an invalid password and stays on the login page", async ({
    page,
  }) => {
    await page.route("**/api/backend/auth/login-email", async (route) => {
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

test.describe("Email verification gate (#519)", () => {
  test("holds an unverified artist off the dashboard until the emailed link is used", async ({
    page,
  }) => {
    // The backend is the only source of truth: the profile says whether the email is verified.
    let verified = false;
    await page.route("**/api/backend/auth/register-email", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: AUTH_USER, token: AUTH_TOKEN }),
      });
    });
    await page.route("**/api/backend/users/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { ...AUTH_USER, emailVerified: verified } }),
      });
    });
    await page.route("**/api/backend/auth/verify-email/**", async (route) => {
      verified = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Email verified successfully" }),
      });
    });

    await page.goto("/signup");
    await page.fill("#signup-name", "Gated Artist");
    await page.fill("#signup-username", "gatedartist");
    await page.fill("#signup-email", "gated@example.com");
    await page.fill("#signup-password", "supersecret123");
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.waitForURL("**/onboarding");

    // Typing the dashboard address, or following a bookmark, must not get past the gate.
    await page.goto("/dashboard/overview");
    await page.waitForURL("**/verify-email");
    await expect(page.getByRole("heading", { name: /check your inbox/i })).toBeVisible();

    // Opening the emailed link verifies the account, and the dashboard opens.
    await page.goto("/verify-email/test-token");
    await expect(page.getByRole("heading", { name: /your email is verified/i })).toBeVisible();

    await page.goto("/dashboard/overview");
    await expect(page).toHaveURL(/\/dashboard\/overview/);
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
