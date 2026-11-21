// Critical journey: artist onboarding (#745).
//
// Sign-up -> Basic Info -> Verification -> Payout wallet. The wallet step
// needs the Freighter browser extension, which Playwright cannot install, so
// this spec verifies the step is reached and its completion gate is enforced
// (Complete Setup stays disabled until a wallet is connected and the terms
// are accepted) instead of faking a wallet signature.

import { expect, test } from "@playwright/test";
import { signInAsArtist } from "./support/session";

const PROFILE_UPDATE = "**/api/backend/artist/update-profile";
const LONG_BIO =
  "Independent producer and mixer from Lagos, releasing afro-fusion records and collaborating with artists across West Africa.";

async function mockProfileUpdate(page: import("@playwright/test").Page) {
  await page.route(PROFILE_UPDATE, async (route) => {
    expect(route.request().method()).toBe("PUT");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "Profile updated successfully!" }),
    });
  });
}

async function completeBasicInfo(page: import("@playwright/test").Page) {
  await page.locator("#artistName").fill("E2E Artist");
  await page.locator("#bio").fill(LONG_BIO);
  await page.getByRole("checkbox", { name: "Pop" }).check();
  await page.locator("#website").fill("https://example.com/e2e-artist");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Verification & KYC" })).toBeVisible();
}

test.describe("Artist onboarding", () => {
  test("sends a visitor without a session to login", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("saves basic info, skips verification, and gates payout setup on a wallet", async ({
    page,
  }) => {
    await signInAsArtist(page);
    await mockProfileUpdate(page);

    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: "Welcome to AudioBlocks" })).toBeVisible();

    // Required fields keep Continue disabled until the form is valid.
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await page.locator("#artistName").fill("E2E Artist");
    await page.locator("#bio").fill("Too short");
    await page.getByRole("checkbox", { name: "Pop" }).check();
    await expect(page.getByText("Bio must be at least 50 characters")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    await page.locator("#bio").fill(LONG_BIO);
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Verification & KYC" })).toBeVisible();
    await expect(page.getByText("Basic information saved!")).toBeVisible();

    await page.getByRole("button", { name: "Skip for Now" }).click();
    await expect(page.getByRole("heading", { name: "Payout Wallet Setup" })).toBeVisible();

    // Without the Freighter extension the wallet field stays empty, so the
    // last step cannot be completed.
    await expect(page.getByRole("button", { name: "Connect Freighter Wallet" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete Setup" })).toBeDisabled();
  });

  test("can step back from verification and payout setup", async ({ page }) => {
    await signInAsArtist(page);
    await mockProfileUpdate(page);

    await page.goto("/onboarding");
    await completeBasicInfo(page);
    await page.getByRole("button", { name: "Skip for Now" }).click();
    await expect(page.getByRole("heading", { name: "Payout Wallet Setup" })).toBeVisible();

    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verification & KYC" })).toBeVisible();

    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Basic Information" })).toBeVisible();
  });
});
