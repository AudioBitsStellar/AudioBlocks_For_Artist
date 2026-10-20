/**
 * Tests for linkedAccountsService (#623).
 *
 * NOTE: This service is now deprecated in favor of Privy's built-in
 * account linking (linkGoogle, linkTwitter, linkWallet, etc.).
 * These tests are kept for backwards compatibility during migration.
 *
 * New code should use usePrivy().user.linkedAccounts directly.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  isStellarAddress,
  normaliseHandle,
  validateHandle,
} from "@/utils/linkedAccounts";

beforeEach(() => {
  localStorage.clear();
});

describe("linkedAccounts utilities", () => {
  describe("normaliseHandle", () => {
    it("strips leading @ symbols", () => {
      expect(normaliseHandle("@sandy")).toBe("sandy");
      expect(normaliseHandle("@@username")).toBe("username");
    });

    it("extracts handle from full URLs", () => {
      expect(normaliseHandle("https://x.com/sandy")).toBe("sandy");
      expect(normaliseHandle("https://instagram.com/sandy.drips/")).toBe("sandy.drips");
    });

    it("keeps bare handles unchanged", () => {
      expect(normaliseHandle("sandy")).toBe("sandy");
      expect(normaliseHandle("sandy.drips")).toBe("sandy.drips");
    });

    it("handles empty input", () => {
      expect(normaliseHandle("")).toBe("");
      expect(normaliseHandle("   ")).toBe("");
    });
  });

  describe("validateHandle", () => {
    it("validates X handles", () => {
      expect(validateHandle("x", "sandy").ok).toBe(true);
      expect(validateHandle("x", "sandy_123").ok).toBe(true);
      expect(validateHandle("x", "a").ok).toBe(true);
    });

    it("rejects invalid X handles", () => {
      const result = validateHandle("x", "a-b");
      expect(result.ok).toBe(false);
      expect(result.message).toContain("1-15");
    });

    it("rejects empty handles", () => {
      const result = validateHandle("x", "   ");
      expect(result.ok).toBe(false);
      expect(result.message).toContain("Enter a handle");
    });

    it("validates Instagram handles", () => {
      expect(validateHandle("instagram", "sandy.drips").ok).toBe(true);
      expect(validateHandle("instagram", "user_name").ok).toBe(true);
    });

    it("validates YouTube handles", () => {
      expect(validateHandle("youtube", "mychannel").ok).toBe(true);
      expect(validateHandle("youtube", "my-channel").ok).toBe(true);
    });

    it("validates Spotify artist URLs", () => {
      expect(validateHandle("spotify", "1234567890abcdefghijkl").ok).toBe(true);
      expect(validateHandle("spotify", "https://open.spotify.com/artist/1234567890abcdefghijkl").ok).toBe(true);
    });
  });

  describe("isStellarAddress", () => {
    it("accepts valid Stellar addresses", () => {
      const valid = "GAB2CDEFGHIJKLMNOPQRSTUVWXYZ34567AB2CDEFGHIJKLMNOPQRSTUV";
      expect(isStellarAddress(valid)).toBe(true);
    });

    it("rejects addresses that don't start with G", () => {
      expect(isStellarAddress("AAB2CDEFGHIJKLMNOPQRSTUVWXYZ34567AB2CDEFGHIJKLMNOPQRSTUV")).toBe(false);
    });

    it("rejects short addresses", () => {
      expect(isStellarAddress("GABC")).toBe(false);
    });

    it("rejects empty input", () => {
      expect(isStellarAddress("")).toBe(false);
      expect(isStellarAddress("   ")).toBe(false);
    });
  });
});
