import { expect, test } from "@playwright/test";
import { signInAsArtist } from "./support/session";
import { FREIGHTER_ADDRESS, mockFreighter } from "./support/freighter";

const CONNECT_WALLET = "**/api/backend/artist/onchain/connect-wallet";

test.describe("Freighter wallet flows", () => {
  test("connects, persists the address to the backend, loads the balance, and disconnects", async ({
    page,
  }) => {
    await mockFreighter(page);
    await signInAsArtist(page);
    let persistedAddress: string | undefined;
    await page.route(CONNECT_WALLET, async (route) => {
      persistedAddress = route.request().postDataJSON().stellarPublicKey;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { stellarPublicKey: persistedAddress } }),
      });
    });
    await page.route("**/horizon-testnet.stellar.org/accounts/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          balances: [{ asset_type: "native", balance: "11984.5000000" }],
        }),
      });
    });

    await page.goto("/dashboard/settings/wallet");
    await expect(page.getByRole("heading", { name: "Stellar Wallet" })).toBeVisible();
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("Wallet Connected", { exact: true })).toBeVisible();
    await expect(page.getByText("GBQXKZDJ...GAYDAOCF", { exact: true })).toBeVisible();
    await expect(page.getByText("11984.5000 XLM", { exact: true })).toBeVisible();
    expect(persistedAddress).toBe(FREIGHTER_ADDRESS);

    await page.getByRole("button", { name: "Disconnect" }).click();
    await expect(page.getByText("No Wallet Connected", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Wallet" })).toBeVisible();
  });

  test("shows a rejected access request and never persists a wallet", async ({ page }) => {
    await mockFreighter(page, { rejectAccess: true });
    await signInAsArtist(page);
    let connectRequests = 0;
    await page.route(CONNECT_WALLET, async (route) => {
      connectRequests += 1;
      await route.abort();
    });

    await page.goto("/dashboard/settings/wallet");
    await page.getByRole("button", { name: "Connect Wallet" }).click();

    await expect(page.getByText("The user rejected this request.")).toBeVisible();
    await expect(page.getByText("No Wallet Connected", { exact: true })).toBeVisible();
    expect(connectRequests).toBe(0);
  });

  test("warns about a wrong Freighter network and clears the warning after switching", async ({
    page,
  }) => {
    await mockFreighter(page, { network: "PUBLIC" });
    await signInAsArtist(page);

    await page.goto("/dashboard/settings/network");
    await expect(page.getByRole("heading", { name: "Stellar network" })).toBeVisible();
    const networkWarning = page.getByRole("alert").filter({ hasText: "different network" });
    await expect(networkWarning).toBeVisible();

    await page.getByRole("radio", { name: "Mainnet" }).click();
    await expect(page.getByRole("radio", { name: "Mainnet" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(networkWarning).toHaveCount(0);
  });
});
