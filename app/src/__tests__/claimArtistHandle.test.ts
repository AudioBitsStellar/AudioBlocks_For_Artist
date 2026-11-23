import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchArtistHandleProfile } from "@/lib/claimArtistHandle";

describe("claim availability lookup", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_ARTIST_HANDLE_LOOKUP_ENABLED", "true"));
  it.each([undefined, "false"])(
    "fails closed when handle lookup is not enabled (%s)",
    async (enabled) => {
      vi.stubEnv("NEXT_PUBLIC_ARTIST_HANDLE_LOOKUP_ENABLED", enabled);
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.audioblocks.test/api");
      const fetch = vi.spyOn(globalThis, "fetch");
      expect(await fetchArtistHandleProfile("available-looking-name")).toEqual({
        status: "unavailable",
      });
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("recognizes an existing handle as taken", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.audioblocks.test/api");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ data: { id: "artist-id", handle: "Solo.Sound", name: "Solo Sound" } }),
    } as Response);
    expect(await fetchArtistHandleProfile("Solo.Sound")).toMatchObject({
      status: "ok",
      profile: { id: "artist-id", handle: "Solo.Sound" },
    });
  });

  it("normalizes and encodes the handle without caching a missing profile", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.audioblocks.test/api/");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue({ status: 404 } as Response);
    const signal = new AbortController().signal;
    expect(await fetchArtistHandleProfile(" @Solo & Sound ", signal)).toEqual({
      status: "not-found",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.audioblocks.test/api/artist/public/Solo%20%26%20Sound",
      {
        cache: "no-store",
        signal,
        headers: { Accept: "application/json" },
      }
    );
  });

  it.each([401, 403, 429, 500])("does not treat HTTP %i as an available handle", async (status) => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.audioblocks.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ status, ok: false } as Response);
    expect(await fetchArtistHandleProfile("handle")).toEqual({ status: "unavailable" });
  });

  it("treats malformed success and network failures as unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.audioblocks.test");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({}) } as Response)
      .mockRejectedValueOnce(new Error("network"));
    expect(await fetchArtistHandleProfile("handle")).toEqual({ status: "unavailable" });
    expect(await fetchArtistHandleProfile("handle")).toEqual({ status: "unavailable" });
  });
});
