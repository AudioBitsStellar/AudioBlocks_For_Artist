// Critical journey: royalty splits (#745).
//
// The page is localStorage-backed for now (see docs/api-contract.md), so the
// spec covers the rules that matter before the on-chain hand-off: shares must
// total 100%, editing one share rebalances the rest, and a saved split
// survives a reload.

import { expect, test } from "@playwright/test";
import { signInAsArtist } from "./support/session";

test.describe("Royalty splits", () => {
  test("rebalances to 100%, saves, and reloads the saved split", async ({ page }) => {
    await signInAsArtist(page);
    await page.goto("/dashboard/collaborators/royalties");
    await expect(page.getByRole("heading", { name: "Split royalties" })).toBeVisible();

    // Defaults start at 0% each, so saving is blocked with a row error.
    await expect(page.getByText("Total: 0%")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Share must be greater than 0%");

    await page.getByRole("button", { name: "Split evenly" }).click();
    await expect(page.getByText("Total: 100%")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);

    await page.getByRole("button", { name: "Increase Jaden Cole share by 5%" }).click();
    const jadenRow = page.locator("tbody tr").nth(0);
    const maraRow = page.locator("tbody tr").nth(1);
    await expect(jadenRow.getByRole("textbox", { name: "Collaborator name" })).toHaveValue(
      "Jaden Cole"
    );
    await expect(maraRow.getByRole("textbox", { name: "Collaborator name" })).toHaveValue(
      "Mara Voss"
    );
    await expect(jadenRow).toContainText("55%");
    await expect(maraRow).toContainText("45%");
    await expect(page.getByText("Total: 100%")).toBeVisible();

    await page.getByRole("button", { name: /^Save split for/ }).click();
    await expect(page.getByText("Royalty split saved for this release.")).toBeVisible();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Split royalties" })).toBeVisible();
    await expect(page.getByText("Total: 100%")).toBeVisible();
    await expect(jadenRow).toContainText("55%");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  });

  test("blocks saving a collaborator without a Stellar address", async ({ page }) => {
    await signInAsArtist(page);
    await page.goto("/dashboard/collaborators/royalties");

    await page.getByRole("button", { name: "Split evenly" }).click();
    await page.getByLabel("Stellar address for Jaden Cole").fill("");
    await page.getByRole("button", { name: /^Save split for/ }).click();

    await expect(page.getByText("Fix the highlighted rows before saving.")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(
      "Enter the collaborator's Stellar address."
    );
  });
});
