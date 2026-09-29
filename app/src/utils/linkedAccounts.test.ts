import { describe, expect, it } from "vitest";
import {
  isHandleTaken,
  isStellarAddress,
  MAX_LINKED_ACCOUNTS,
  normaliseHandle,
  socialProfileUrl,
  validateHandle,
} from "./linkedAccounts";

const ADDRESS = "GAB2CDEFGHIJKLMNOPQRSTUVWXYZ34567AB2CDEFGHIJKLMNOPQRSTUV";

describe("isStellarAddress", () => {
  it("accepts a 56-character G address", () => {
    expect(isStellarAddress(ADDRESS)).toBe(true);
    expect(isStellarAddress(` ${ADDRESS} `)).toBe(true);
  });

  it("rejects wrong length, wrong prefix and invalid alphabet", () => {
    expect(isStellarAddress("GABC")).toBe(false);
    expect(isStellarAddress(`B${ADDRESS.slice(1)}`)).toBe(false);
    expect(isStellarAddress(`G${"0".repeat(55)}`)).toBe(false);
    expect(isStellarAddress("")).toBe(false);
  });
});

describe("normaliseHandle", () => {
  it("drops the leading @", () => {
    expect(normaliseHandle("@sandy")).toBe("sandy");
    expect(normaliseHandle("@sandy.drips")).toBe("sandy.drips");
  });

  it("unwrists pasted profile URLs", () => {
    expect(normaliseHandle("https://x.com/sandy")).toBe("sandy");
    expect(normaliseHandle("twitter.com/sandy")).toBe("sandy");
    expect(normaliseHandle("https://instagram.com/sandy/")).toBe("sandy");
    expect(normaliseHandle("https://tiktok.com/@sandy")).toBe("sandy");
    expect(normaliseHandle("youtube.com/@sandysound")).toBe("sandysound");
    expect(normaliseHandle("https://open.spotify.com/artist/1a2b3c4d5e6f7g8h9i0j")).toBe(
      "1a2b3c4d5e6f7g8h9i0j"
    );
  });
});

describe("validateHandle", () => {
  it("requires a value", () => {
    expect(validateHandle("x", "   ")).toEqual({
      ok: false,
      message: "Enter a handle to link this account.",
    });
  });

  it("enforces the X length limit", () => {
    expect(validateHandle("x", "sandy").ok).toBe(true);
    expect(validateHandle("x", "a".repeat(15)).ok).toBe(true);
    expect(validateHandle("x", "a".repeat(16)).ok).toBe(false);
  });

  it("rejects characters each platform does not allow", () => {
    expect(validateHandle("x", "sandy drips").ok).toBe(false);
    expect(validateHandle("instagram", "sandy-drips").ok).toBe(false);
    expect(validateHandle("spotify", "not-an-id").ok).toBe(false);
  });

  it("accepts a Spotify artist ID with or without the full URL", () => {
    const id = "1a2b3c4d5e6f7g8h9i0j";
    expect(validateHandle("spotify", id).ok).toBe(true);
    expect(validateHandle("spotify", `https://open.spotify.com/artist/${id}`).ok).toBe(true);
  });

  it("returns the cleaned handle on success", () => {
    expect(validateHandle("x", "@Sandy")).toEqual({ ok: true, handle: "Sandy" });
  });
});

describe("isHandleTaken", () => {
  const existing = [{ id: "link_1", platform: "x" as const, handle: "Sandy" }];

  it("matches case-insensitively on the same platform", () => {
    expect(isHandleTaken("x", "sandy", existing)).toBe(true);
    expect(isHandleTaken("instagram", "sandy", existing)).toBe(false);
  });

  it("can ignore the row being edited", () => {
    expect(isHandleTaken("x", "sandy", existing, "link_1")).toBe(false);
  });
});

describe("socialProfileUrl", () => {
  it("builds a platform URL from a messy handle", () => {
    expect(socialProfileUrl("x", "@sandy")).toBe("https://x.com/sandy");
    expect(socialProfileUrl("tiktok", "@sandy")).toBe("https://tiktok.com/@sandy");
  });
});

describe("MAX_LINKED_ACCOUNTS", () => {
  it("is a positive cap", () => {
    expect(MAX_LINKED_ACCOUNTS).toBeGreaterThan(0);
  });
});
