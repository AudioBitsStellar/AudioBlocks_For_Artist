// Critical journey: payout view (#745).
//
// Payout records are sample data for now (the backend payouts endpoint is not
// implemented), but the history table, completed total, status filter, CSV
// export and wallet panel are the real UI artists use. Horizon is mocked so
// the balance fetch never depends on the public testnet.

import { expect, test } from "@playwright/test";
import { signInAsArtist } from "./support/session";

test.describe("Payout view", () => {
  test("shows the completed total, filters by status, exports CSV, and loads the wallet", async ({
    page,
  }) => {
    await signInAsArtist(page);
    await page.route("**/horizon-testnet.stellar.org/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          balances: [{ asset_type: "native", balance: "250.5" }],
        }),
      });
    });

    await page.goto("/dashboard/payouts");
    await expect(page.getByRole("heading", { name: "Royalties & Payouts" })).toBeVisible();
    await expect(page.getByText("Total paid out:")).toBeVisible();
    await expect(page.getByText("224.15 XLM")).toBeVisible();

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(4);

    await page.getByLabel("Status").selectOption("completed");
    await expect(rows).toHaveCount(2);
    const table = page.locator("table");
    await expect(table.getByRole("link", { name: "View", exact: true })).toHaveCount(2);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^payouts_\d{4}-\d{2}\.csv$/);

    await page.getByLabel("Status").selectOption("all");
    await expect(rows).toHaveCount(4);

    await expect(page.getByRole("heading", { name: "Your payout wallet" })).toBeVisible();
    await expect(page.getByText("GAAZI4...CCWN")).toBeVisible();
  });

  test("filters failed payouts and keeps the completed total unchanged", async ({ page }) => {
    await signInAsArtist(page);
    await page.route("**/horizon-testnet.stellar.org/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ balances: [] }),
      });
    });

    await page.goto("/dashboard/payouts");
    await page.getByLabel("Status").selectOption("failed");

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("42.1234567 XLM");
    await expect(page.getByText("224.15 XLM")).toBeVisible();
  });
});
