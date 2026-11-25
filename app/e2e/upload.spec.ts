// Critical journey: upload a song (#745).
//
// Exercises the chunked song upload (#391/#458): form validation, cover and
// audio selection, chunk POST, cover POST, finalize POST, and the success
// toast. Backend routes are mocked at the same `/api/backend` boundary the
// app uses in the browser.

import { expect, test } from "@playwright/test";
import { signInAsArtist, testFile } from "./support/session";

const COVER = {
  name: "cover.png",
  mimeType: "image/png",
  buffer: testFile("cover.png", "image/png", 1024),
};
const AUDIO = {
  name: "e2e-track.wav",
  mimeType: "audio/wav",
  buffer: testFile("e2e-track.wav", "audio/wav", 4096),
};

test.describe("Upload a song", () => {
  test("uploads audio and cover, finalizes metadata, and confirms success", async ({ page }) => {
    await signInAsArtist(page);

    const seen = { chunks: 0, cover: false, finalize: null as Record<string, unknown> | null };

    await page.route("**/api/backend/song/upload/chunk", async (route) => {
      expect(route.request().method()).toBe("POST");
      seen.chunks += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Chunk uploaded successfully!" }),
      });
    });
    await page.route("**/api/backend/song/upload/cover", async (route) => {
      expect(route.request().method()).toBe("POST");
      seen.cover = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Cover uploaded successfully!",
          data: { cover: "uploads/covers/e2e.png", fileId: "e2e-file" },
        }),
      });
    });
    await page.route("**/api/backend/song/upload/finalize", async (route) => {
      expect(route.request().method()).toBe("POST");
      seen.finalize = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Song uploaded successfully!",
          data: { id: "song-e2e" },
        }),
      });
    });

    await page.goto("/dashboard/upload-music");
    await expect(page.getByRole("heading", { name: "Add Music", exact: true })).toBeVisible();

    await page.locator("#song-title").fill("E2E Midnight");
    await page.locator("#song-description").fill("A test track uploaded by the E2E suite.");
    await page.locator("#song-genre").selectOption("Afrobeats");
    await page.locator("#song-composer").fill("E2E Artist");
    await page.getByLabel("Upload cover image").setInputFiles(COVER);
    await page.getByLabel("Upload audio file").setInputFiles(AUDIO);

    await expect(page.getByText("e2e-track.wav")).toBeVisible();
    await page.getByRole("button", { name: "Add Music" }).click();

    await expect(page.getByText("Song uploaded successfully!").first()).toBeVisible();
    expect(seen.chunks).toBeGreaterThan(0);
    expect(seen.cover).toBe(true);
    expect(seen.finalize).toMatchObject({
      title: "E2E Midnight",
      description: "A test track uploaded by the E2E suite.",
      genre: "Afrobeats",
      composers: "E2E Artist",
      coverArtPath: "uploads/covers/e2e.png",
    });
  });

  test("rejects an unsupported audio file before uploading", async ({ page }) => {
    await signInAsArtist(page);
    await page.goto("/dashboard/upload-music");

    await page.getByLabel("Upload audio file").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not audio"),
    });

    await expect(
      page.getByRole("alert").filter({ hasText: "Unsupported file type" })
    ).toBeVisible();
  });
});
