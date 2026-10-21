import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicArtistProfile } from "@/lib/publicArtistProfile";
const id = "12345678-1234-1234-1234-123456789abc";
const response = (data: unknown, status = 200) =>
  ({ ok: status === 200, status, json: async () => ({ data }) }) as Response;
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://backend.test/api/"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("public artist backend contract", () => {
  it("checks privacy then parses metadata and caches the metadata read", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ id }))
      .mockResolvedValueOnce(
        response({
          profile: { id, username: "artist", twitterUsername: "artistX" },
          openGraph: {
            title: "Artist Name",
            description: "Real bio",
            image: "https://images.test/artist.png",
          },
        })
      );
    expect(await fetchPublicArtistProfile(id)).toEqual({
      status: "ok",
      profile: {
        id,
        handle: "artist",
        name: "Artist Name",
        bio: "Real bio",
        profileImage: "https://images.test/artist.png",
        twitter: "artistX",
        website: undefined,
      },
    });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `https://backend.test/api/users/${id}/public`,
      expect.objectContaining({ cache: "no-store" })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `https://backend.test/api/artist/${id}/metadata`,
      expect.objectContaining({ next: { revalidate: 300 } })
    );
  });
  it("never fetches SEO metadata for a private profile", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ private: true }));
    expect(await fetchPublicArtistProfile(id)).toEqual({ status: "private" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("returns not-found for unknown IDs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({}, 404));
    expect(await fetchPublicArtistProfile(id)).toEqual({ status: "not-found" });
  });
  it("rejects handles locally until username lookup is supported", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    expect(await fetchPublicArtistProfile("unknown_artist")).toEqual({ status: "not-found" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports an outage without inventing a profile", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline"));
    expect(await fetchPublicArtistProfile(id)).toEqual({ status: "unavailable" });
  });
  it("fails closed for malformed privacy responses", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({}));
    expect(await fetchPublicArtistProfile(id)).toEqual({ status: "unavailable" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
