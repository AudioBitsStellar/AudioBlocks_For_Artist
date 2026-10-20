import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/axios", () => ({ createApiClient: vi.fn() }));
vi.mock("@/hooks/useToastHandler", () => ({
  useHandleSuccess: () => vi.fn(),
  useHandleError: () => vi.fn(),
}));

import { mapBackendAlbum, moveTrack, songsAddableToAlbum } from "@/services/albumService";
import { ALBUM_ENDPOINTS } from "@/api/api-endpoint";

describe("album backend mapping (#528)", () => {
  it("uses the backend /albums resource", () => {
    expect(ALBUM_ENDPOINTS.LIST).toBe("/albums");
    expect(ALBUM_ENDPOINTS.LIST_FOR_ARTIST("a 1")).toBe("/albums?artistId=a%201");
    expect(ALBUM_ENDPOINTS.UPDATE("7")).toBe("/albums/7");
    expect(ALBUM_ENDPOINTS.DELETE("7")).toBe("/albums/7");
  });

  it("maps a backend album keeping track order", () => {
    const album = mapBackendAlbum({
      id: "1",
      title: "LP",
      coverImage: "c.jpg",
      tracks: [
        { id: "b", position: 2 },
        { id: "a", position: 1 },
        { id: "c", position: 3 },
      ],
    });
    expect(album).toEqual({
      id: "1",
      title: "LP",
      coverArtUrl: "c.jpg",
      releaseDate: undefined,
      songCount: 3,
      trackIds: ["a", "b", "c"],
    });
  });

  it("reorders tracks and ignores out-of-range moves", () => {
    expect(moveTrack(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveTrack(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });

  it("only offers the artist's own ready songs", () => {
    const songs = [
      { id: 1, artistId: "me", status: "ready" },
      { id: 2, artistId: "me", status: "processing" },
      { id: 3, artistId: "other", status: "ready" },
    ];
    expect(songsAddableToAlbum(songs, "me").map((s) => s.id)).toEqual([1]);
  });
});
