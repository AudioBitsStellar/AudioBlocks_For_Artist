import { describe, it, expect, beforeEach } from "vitest";
import {
  clearTrackVisibility,
  describeVisibility,
  filterCatalog,
  getStoredVisibility,
  getTrackVisibility,
  isTrackVisibility,
  LEGACY_DEFAULT_VISIBILITY,
  listVisibilityOverrides,
  NEW_TRACK_DEFAULT_VISIBILITY,
  resolveTrackVisibility,
  setTrackVisibility,
  TRACK_VISIBILITIES,
  TRACK_VISIBILITY_OPTIONS,
  type TrackVisibility,
  visibilityLabel,
  visibilityPermissions,
} from "@/services/trackVisibilityService";

const STORAGE_KEY = "audioblocks:track-visibility:v1";

describe("trackVisibilityService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("the three modes", () => {
    it("offers exactly public, unlisted and private to every picker", () => {
      expect(TRACK_VISIBILITIES).toEqual(["public", "unlisted", "private"]);
      // A fourth mode added to the union without an option would silently
      // disappear from both selects, so the two lists are pinned together.
      expect(TRACK_VISIBILITY_OPTIONS.map((option) => option.value)).toEqual([
        ...TRACK_VISIBILITIES,
      ]);
    });

    it("recognises only its own values", () => {
      expect(isTrackVisibility("public")).toBe(true);
      expect(isTrackVisibility("unlisted")).toBe(true);
      expect(isTrackVisibility("private")).toBe(true);
      expect(isTrackVisibility("Protected")).toBe(false);
      expect(isTrackVisibility("")).toBe(false);
      expect(isTrackVisibility(undefined)).toBe(false);
      expect(isTrackVisibility(null)).toBe(false);
      expect(isTrackVisibility(1)).toBe(false);
    });

    it("labels and explains every mode, and says so for an unknown one", () => {
      for (const visibility of TRACK_VISIBILITIES) {
        expect(visibilityLabel(visibility)).toBeTruthy();
        expect(describeVisibility(visibility)).toMatch(/\.$/);
      }
      expect(describeVisibility("secret" as TrackVisibility)).toBe("Unknown visibility.");
    });
  });

  describe("the two defaults", () => {
    it("treats a record from before the feature as public, as it behaved", () => {
      expect(LEGACY_DEFAULT_VISIBILITY).toBe("public");
      expect(getTrackVisibility({ id: 7 })).toBe("public");
    });

    it("starts a freshly uploaded track private", () => {
      expect(NEW_TRACK_DEFAULT_VISIBILITY).toBe("private");
    });

    it("coerces anything unrecognised, with an overridable fallback", () => {
      expect(resolveTrackVisibility("nope")).toBe("public");
      expect(resolveTrackVisibility(undefined, "unlisted")).toBe("unlisted");
      expect(resolveTrackVisibility("private", "public")).toBe("private");
    });
  });

  describe("resolving a track's visibility", () => {
    it("lets a visibility that travels with the record win over the local choice", () => {
      setTrackVisibility(1, "private");
      expect(getTrackVisibility({ id: 1, visibility: "unlisted" })).toBe("unlisted");
    });

    it("falls back to the locally stored choice when the record has none", () => {
      setTrackVisibility(2, "unlisted");
      expect(getTrackVisibility({ id: 2 })).toBe("unlisted");
      expect(getTrackVisibility({ id: 2, visibility: undefined })).toBe("unlisted");
    });

    it("ignores a record value it does not recognise instead of trusting it", () => {
      setTrackVisibility(3, "private");
      expect(getTrackVisibility({ id: 3, visibility: "everyone" })).toBe("private");
    });

    it("keys overrides by the string form of the id, so number and string ids agree", () => {
      setTrackVisibility(4, "unlisted");
      expect(getTrackVisibility({ id: "4" })).toBe("unlisted");
    });
  });

  describe("persisting the artist's choice", () => {
    it("writes to storage and reads back", () => {
      expect(setTrackVisibility(5, "public")).toBe(true);
      expect(getStoredVisibility(5)).toBe("public");
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).toMatchObject({
        "5": { visibility: "public" },
      });
    });

    it("stamps the change with a time, and records only the visibility", () => {
      setTrackVisibility(6, "private");
      const entry = JSON.parse(localStorage.getItem(STORAGE_KEY) as string)["6"];
      expect(Number.isNaN(Date.parse(entry.updatedAt))).toBe(false);
      expect(Object.keys(entry).sort()).toEqual(["updatedAt", "visibility"]);
    });

    it("refuses a value that is not a visibility and changes nothing", () => {
      expect(setTrackVisibility(7, "leaked" as TrackVisibility)).toBe(false);
      expect(getStoredVisibility(7)).toBeUndefined();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("replaces an earlier choice for the same track rather than adding one", () => {
      setTrackVisibility(8, "public");
      setTrackVisibility(8, "private");
      expect(listVisibilityOverrides()).toEqual({ "8": "private" });
    });

    it("keeps other tracks' choices when one is cleared", () => {
      setTrackVisibility(9, "unlisted");
      setTrackVisibility(10, "private");
      expect(clearTrackVisibility(9)).toBe(true);
      expect(getStoredVisibility(9)).toBeUndefined();
      expect(getStoredVisibility(10)).toBe("private");
    });

    it("reports clearing a track that never had a choice", () => {
      expect(clearTrackVisibility(11)).toBe(false);
    });

    it("reads corrupted storage as no choices at all", () => {
      localStorage.setItem(STORAGE_KEY, "not-json");
      expect(listVisibilityOverrides()).toEqual({});
      expect(getStoredVisibility(1)).toBeUndefined();
      expect(getTrackVisibility({ id: 1 })).toBe("public");
    });

    it("drops the unusable entries of a partly valid record and keeps the rest", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          "1": { visibility: "unlisted", updatedAt: "2026-01-01T00:00:00.000Z" },
          "2": { visibility: "wat", updatedAt: "2026-01-01T00:00:00.000Z" },
          "3": null,
          "4": "private",
        })
      );
      expect(listVisibilityOverrides()).toEqual({ "1": "unlisted" });
    });

    it("treats a JSON array in storage as no choices", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(["public"]));
      expect(listVisibilityOverrides()).toEqual({});
    });
  });

  describe("what each mode grants whom", () => {
    it("lets a public track be found, played and shared", () => {
      expect(visibilityPermissions("public", "visitor")).toEqual({
        discoverable: true,
        playable: true,
        shareable: true,
      });
    });

    it("keeps an unlisted track out of catalogs while staying playable by link", () => {
      expect(visibilityPermissions("unlisted", "visitor")).toEqual({
        discoverable: false,
        playable: true,
        shareable: true,
      });
    });

    it("grants a private track to nobody but the owner", () => {
      expect(visibilityPermissions("private", "visitor")).toEqual({
        discoverable: false,
        playable: false,
        shareable: false,
      });
    });

    it("does not let holding a link unlock a private track", () => {
      expect(visibilityPermissions("private", "link")).toEqual(
        visibilityPermissions("private", "visitor")
      );
    });

    it("shows the owner everything they own, in every mode", () => {
      for (const visibility of TRACK_VISIBILITIES) {
        expect(visibilityPermissions(visibility, "owner")).toEqual({
          discoverable: true,
          playable: true,
          shareable: true,
        });
      }
    });
  });

  describe("filterCatalog", () => {
    const tracks = [
      { id: 1, title: "Open" },
      { id: 2, title: "Link only" },
      { id: 3, title: "Hidden" },
    ];

    it("gives a visitor only the public tracks, in the order they came", () => {
      setTrackVisibility(1, "public");
      setTrackVisibility(2, "unlisted");
      setTrackVisibility(3, "private");
      expect(filterCatalog(tracks, "visitor").map((track) => track.title)).toEqual(["Open"]);
    });

    it("gives the owner the whole list untouched", () => {
      setTrackVisibility(1, "public");
      setTrackVisibility(2, "unlisted");
      setTrackVisibility(3, "private");
      expect(filterCatalog(tracks, "owner")).toEqual(tracks);
    });

    it("keeps a track with no choice at all visible, matching its legacy behaviour", () => {
      expect(filterCatalog(tracks, "visitor").map((track) => track.title)).toEqual([
        "Open",
        "Link only",
        "Hidden",
      ]);
    });

    it("does not mutate or reorder the list it was given", () => {
      setTrackVisibility(2, "public");
      const before = [...tracks];
      filterCatalog(tracks, "visitor");
      expect(tracks).toEqual(before);
    });
  });
});
