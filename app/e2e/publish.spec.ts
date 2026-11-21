// Critical journey: publish an EP (#745).
//
// Covers the album/EP creation flow (#398): details -> tracks -> review ->
// POST /albums. The backend and cover/track uploads are mocked at the network
// boundary; this asserts the form wiring, track-count rule and multipart
// publish request.

import { expect, test } from "@playwright/test";
import { signInAsArtist, testFile } from "./support/session";

const COVER = {
  name: "ep-cover.png",
  mimeType: "image/png",
  buffer: testFile("ep-cover.png", "image/png", 1024),
};
const TRACKS = [
  { name: "intro.wav", mimeType: "audio/wav", buffer: testFile("intro.wav", "audio/wav", 2048) },
  {
    name: "anthem.wav",
    mimeType: "audio/wav",
    buffer: testFile("anthem.wav", "audio/wav", 2048),
  },
];

test.describe("Publish an EP", () => {
  test("creates an EP from two tracks and reviews the release before publishing", async ({
    page,
  }) => {
    await signInAsArtist(page);

    let publishBody = "";
    await page.route("**/api/backend/albums", async (route) => {
      expect(route.request().method()).toBe("POST");
      publishBody = route.request().postDataBuffer()?.toString("utf8") ?? "";
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Release created",
          data: { id: "album-e2e" },
        }),
      });
    });

    await page.goto("/dashboard/upload-music");
    await expect(page.getByRole("heading", { name: "Add Music" })).toBeVisible();

    await page.getByRole("tab", { name: "Add Album / EP" }).click();
    await page.getByRole("radio", { name: /^EP/ }).check();

    await page.getByPlaceholder("Enter EP title").fill("E2E Skyline");
    await page.getByLabel(/^Genre/).selectOption("Afrobeats");
    await page.getByLabel("Upload cover image").setInputFiles(COVER);
    await page.getByPlaceholder("0.00").fill("4.5");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Tracks (0/2–6)" })).toBeVisible();

    await page.getByLabel("Upload track audio files").setInputFiles(TRACKS);
    await expect(page.getByLabel("Track 1 title")).toHaveValue("intro");
    await expect(page.getByLabel("Track 2 title")).toHaveValue("anthem");
    await page.getByLabel("Track 1 title").fill("Intro");
    await page.getByLabel("Track 2 title").fill("Anthem");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Review your EP" })).toBeVisible();
    await expect(page.getByTestId("review-title")).toHaveText("E2E Skyline");
    await expect(page.getByRole("list", { name: "Final track order" })).toContainText("Intro");
    await expect(page.getByRole("list", { name: "Final track order" })).toContainText("Anthem");

    await page.getByRole("button", { name: "Publish EP" }).click();

    await expect(page.getByText("EP created")).toBeVisible();
    await expect(page.getByRole("heading", { name: "EP details" })).toBeVisible();
    expect(publishBody).toContain('name="releaseType"');
    expect(publishBody).toContain("ep");
    expect(publishBody).toContain('name="trackTitles"');
    expect(publishBody).toContain("Intro");
  });

  test("blocks publishing fewer tracks than the EP minimum", async ({ page }) => {
    await signInAsArtist(page);
    await page.goto("/dashboard/upload-music");

    await page.getByRole("tab", { name: "Add Album / EP" }).click();
    await page.getByRole("radio", { name: /^EP/ }).check();
    await page.getByPlaceholder("Enter EP title").fill("Too Small");
    await page.getByLabel(/^Genre/).selectOption("Afrobeats");
    await page.getByLabel("Upload cover image").setInputFiles(COVER);
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByLabel("Upload track audio files").setInputFiles([TRACKS[0]]);
    await page.getByRole("button", { name: "Next" }).click();

    // Still on Tracks: the 2-track minimum is enforced before Review.
    await expect(page.getByRole("heading", { name: "Tracks (1/2–6)" })).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("needs 2–6 tracks");
  });
});
