import { describe, expect, it } from "vitest";
import {
  addTrack,
  buildReleaseFormData,
  emptyDraft,
  isDraftValid,
  moveTrack,
  removeTrack,
  suggestReleaseType,
  updateTrack,
  validateDetails,
  validateTracks,
  type ReleaseDraft,
} from "./releaseDraft";

const audio = (name: string) => new File(["x"], name, { type: "audio/mpeg" });
const cover = new File(["c"], "cover.png", { type: "image/png" });
const TODAY = new Date("2026-06-01T12:00:00");

function draftWith(n: number, type: ReleaseDraft["type"] = "ep"): ReleaseDraft {
  let tracks = emptyDraft().tracks;
  for (let i = 1; i <= n; i++) tracks = addTrack(tracks, i, audio(`Track ${i}.mp3`));
  return { ...emptyDraft(type), title: "Night Drive", genre: "Pop", cover, tracks };
}

describe("track list operations", () => {
  it("adds with a title from the file name, updates, removes", () => {
    let tracks = addTrack([], 1, audio("Intro.mp3"));
    expect(tracks[0].title).toBe("Intro");
    tracks = updateTrack(tracks, 1, { title: "Opening" });
    expect(tracks[0].title).toBe("Opening");
    expect(removeTrack(tracks, 1)).toEqual([]);
  });

  it("reorders and ignores moves past the edges", () => {
    const tracks = draftWith(3).tracks;
    expect(moveTrack(tracks, 3, -1).map((t) => t.id)).toEqual([1, 3, 2]);
    expect(moveTrack(tracks, 1, -1)).toBe(tracks);
    expect(moveTrack(tracks, 3, 1)).toBe(tracks);
  });
});

describe("validateDetails", () => {
  it("requires title, genre and cover", () => {
    const errors = validateDetails(emptyDraft("ep"), TODAY);
    expect(errors.title).toBe("EP title is required");
    expect(errors.genre).toBeDefined();
    expect(errors.cover).toBeDefined();
  });

  it("rejects negative prices and past release dates", () => {
    const d = { ...draftWith(2), purchasePrice: "-1", releaseDate: "2026-05-31" };
    const errors = validateDetails(d, TODAY);
    expect(errors.purchasePrice).toBeDefined();
    expect(errors.releaseDate).toBe("Release date can't be in the past");
    expect(validateDetails({ ...d, purchasePrice: "4.99", releaseDate: "2026-06-01" }, TODAY)).toEqual({});
  });
});

describe("validateTracks", () => {
  it("enforces EP and album track counts", () => {
    expect(validateTracks(draftWith(1, "ep")).list).toMatch(/EP needs 2–6 tracks/);
    expect(validateTracks(draftWith(2, "ep")).list).toBeUndefined();
    expect(validateTracks(draftWith(7, "ep")).list).toBeDefined();
    expect(validateTracks(draftWith(6, "album")).list).toMatch(/album needs 7–30 tracks/);
    expect(validateTracks(draftWith(7, "album")).list).toBeUndefined();
  });

  it("flags missing files, empty and duplicate titles", () => {
    let d = draftWith(3);
    d = { ...d, tracks: updateTrack(d.tracks, 2, { title: "  " }) };
    d = { ...d, tracks: updateTrack(d.tracks, 3, { title: "track 1" }) };
    d = { ...d, tracks: addTrack(d.tracks, 4) };
    const { tracks } = validateTracks(d);
    expect(tracks[2]).toBe("Track title is required");
    expect(tracks[3]).toBe("Duplicate track title");
    expect(tracks[4]).toBe("Choose an audio file");
  });
});

describe("isDraftValid / suggestReleaseType", () => {
  it("is valid only when details and tracks are valid", () => {
    expect(isDraftValid(draftWith(3), TODAY)).toBe(true);
    expect(isDraftValid(draftWith(1), TODAY)).toBe(false);
  });

  it("suggests EP up to 6 tracks, album above", () => {
    expect(suggestReleaseType(6)).toBe("ep");
    expect(suggestReleaseType(7)).toBe("album");
  });
});

describe("buildReleaseFormData", () => {
  it("keeps legacy fields and adds type, date and ordered track titles", () => {
    let d = { ...draftWith(3), purchasePrice: " 9.99 ", releaseDate: "2026-07-01" };
    d = { ...d, tracks: moveTrack(d.tracks, 3, -1) };
    const fd = buildReleaseFormData(d);
    expect(fd.get("releaseType")).toBe("ep");
    expect(fd.get("albumTitle")).toBe("Night Drive");
    expect(fd.get("songTitle")).toBe("Track 1");
    expect(fd.get("purchasePrice")).toBe("9.99");
    expect(fd.get("releaseDate")).toBe("2026-07-01");
    expect(fd.getAll("songs").map((f) => (f as File).name)).toEqual([
      "Track 1.mp3",
      "Track 3.mp3",
      "Track 2.mp3",
    ]);
    expect(JSON.parse(fd.get("trackTitles") as string)).toEqual(["Track 1", "Track 3", "Track 2"]);
  });

  it("requires a cover", () => {
    expect(() => buildReleaseFormData({ ...draftWith(2), cover: null })).toThrow(/Cover/);
  });
});
