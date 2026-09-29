import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchPublicArtistProfile, displayNameFromHandle } from "@/lib/publicArtistProfile";

describe("publicArtistProfile service (#384)", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.audioblocks.test";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it("fetches and parses a public artist profile successfully", async () => {
    const mockPayload = {
      data: {
        id: "art_123",
        handle: "solosound",
        name: "Solo Sound",
        bio: "Indie electronic music producer.",
        website: "https://solosound.test",
        twitter: "@solosound",
        genres: ["Electronic", "Ambient"],
        songCount: 12,
        albumCount: 2,
        listenersCount: 45000,
        followersCount: 1200,
        status: "verified",
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPayload,
    } as Response);

    const result = await fetchPublicArtistProfile("solosound");
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.profile.handle).toBe("solosound");
      expect(result.profile.name).toBe("Solo Sound");
      expect(result.profile.genres).toEqual(["Electronic", "Ambient"]);
      expect(result.profile.status).toBe("verified");
    }
  });

  it("returns not-found when the API returns 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const result = await fetchPublicArtistProfile("unknown_artist");
    expect(result.status).toBe("not-found");
  });

  it("returns unavailable when API base URL is missing or network fails", async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const result = await fetchPublicArtistProfile("solosound");
    expect(result.status).toBe("unavailable");
  });

  it("formats display name from handle correctly", () => {
    expect(displayNameFromHandle("@music_maker")).toBe("music maker");
    expect(displayNameFromHandle("cool-band-name")).toBe("cool band name");
  });
});
