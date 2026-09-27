/**
 * Rollout flags for gradual artist feature rollout (#469).
 *
 * `FEATURE_FLAGS` is module-level mutable state, so each test resets the one
 * flag's rollout settings it touches — otherwise a test that widens the
 * percentage would leak into the next one.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  readFeatureFlagOverrides,
  setFeatureFlagOverride,
  subscribeToFeatureFlagChanges,
  type FeatureFlagOverrides,
} from "@/lib/featureFlags";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

const FLAG = "artistOnchainAnalytics";
const ARTIST = "GAZR3A7XTESTARTISTADDRESSABCDEFGHIJKLMNOPQRSTUVWXY";
const OVERRIDE_KEY = "audioblocks:feature-flags:v1";

function setRollout(rolloutPercentage: number, allowlist: readonly string[] = []) {
  FEATURE_FLAGS[FLAG] = { ...FEATURE_FLAGS[FLAG], rolloutPercentage, allowlist };
}

describe("feature flags", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    localStorage.clear();
    delete process.env.NEXT_PUBLIC_FEATURE_FLAGS;
    setRollout(0, []);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  describe("isFeatureEnabled", () => {
    it("keeps a 0% rollout off for everyone but allowlisted artists", () => {
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(false);

      setRollout(0, ["other-artist"]);
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(false);
      expect(isFeatureEnabled(FLAG, "other-artist")).toBe(true);
    });

    it("enables an allowlisted artist at any rollout percentage, case-insensitively", () => {
      setRollout(0, [ARTIST.toLowerCase()]);
      expect(isFeatureEnabled(FLAG, ARTIST.toUpperCase())).toBe(true);

      setRollout(100, ["someone-else"]);
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(true);
    });

    it("enables everyone at 100% and no one at 0%", () => {
      setRollout(100);
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(true);
      expect(isFeatureEnabled(FLAG, "GA NOBODY")).toBe(true);

      setRollout(0);
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(false);
    });

    it("assigns a partial rollout stably: the same artist gets the same answer", () => {
      setRollout(50);
      const first = isFeatureEnabled(FLAG, ARTIST);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        expect(isFeatureEnabled(FLAG, ARTIST)).toBe(first);
      }
    });

    it("splits a population across a partial rollout instead of enabling nobody or everybody", () => {
      setRollout(50);
      const enabled = Array.from({ length: 200 }, (_, index) => `artist-${index}`).filter(
        (subject) => isFeatureEnabled(FLAG, subject)
      );
      expect(enabled.length).toBeGreaterThan(0);
      expect(enabled.length).toBeLessThan(200);
    });

    it("enables nobody when there is no subject to enable", () => {
      setRollout(100);
      expect(isFeatureEnabled(FLAG)).toBe(false);
      expect(isFeatureEnabled(FLAG, null)).toBe(false);
      expect(isFeatureEnabled(FLAG, "   ")).toBe(false);
    });

    it("ignores surrounding whitespace on the subject", () => {
      setRollout(0, [ARTIST]);
      expect(isFeatureEnabled(FLAG, `  ${ARTIST}  `)).toBe(true);
    });

    it("lets a stored override beat the rollout", () => {
      setRollout(0);
      const overrides: FeatureFlagOverrides = { [FLAG]: true };
      expect(isFeatureEnabled(FLAG, ARTIST, overrides)).toBe(true);

      setRollout(100);
      expect(isFeatureEnabled(FLAG, ARTIST, { [FLAG]: false })).toBe(false);
    });
  });

  describe("NEXT_PUBLIC_FEATURE_FLAGS", () => {
    it("enables a flag for the whole deployment without an artist subject", () => {
      process.env.NEXT_PUBLIC_FEATURE_FLAGS = `${FLAG}=true`;
      expect(isFeatureEnabled(FLAG)).toBe(true);
    });

    it("lets an explicit false force a flag off inside an allowlist", () => {
      setRollout(100, [ARTIST]);
      process.env.NEXT_PUBLIC_FEATURE_FLAGS = `${FLAG}=false`;
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(false);
    });

    it('treats anything other than "true" as off, so a typo cannot widen a rollout', () => {
      process.env.NEXT_PUBLIC_FEATURE_FLAGS = `${FLAG}=1`;
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(false);
    });

    it("ignores unknown flag names and unparsable pairs", () => {
      process.env.NEXT_PUBLIC_FEATURE_FLAGS = "someOtherFlag=true,garbage,artistOnchainAnalytics=";
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(false);

      process.env.NEXT_PUBLIC_FEATURE_FLAGS = `garbage,${FLAG}=true`;
      expect(isFeatureEnabled(FLAG, ARTIST)).toBe(true);
    });

    it("lets the browser override win over the deployment default", () => {
      process.env.NEXT_PUBLIC_FEATURE_FLAGS = `${FLAG}=false`;
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ [FLAG]: true }));
      expect(isFeatureEnabled(FLAG, ARTIST, readFeatureFlagOverrides())).toBe(true);
    });
  });

  describe("browser overrides in localStorage", () => {
    it("round-trips a persisted override", () => {
      setFeatureFlagOverride(FLAG, true);
      expect(JSON.parse(localStorage.getItem(OVERRIDE_KEY) as string)).toEqual({ [FLAG]: true });
      expect(readFeatureFlagOverrides()).toEqual({ [FLAG]: true });
    });

    it("drops the key entirely when the last override is cleared", () => {
      setFeatureFlagOverride(FLAG, true);
      setFeatureFlagOverride(FLAG, undefined);
      expect(readFeatureFlagOverrides()).toEqual({});
      expect(localStorage.getItem(OVERRIDE_KEY)).toBeNull();
    });

    it("ignores unknown names, non-boolean values and unparsable JSON", () => {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ mysteryFlag: true, [FLAG]: "yes" }));
      expect(readFeatureFlagOverrides()).toEqual({});

      localStorage.setItem(OVERRIDE_KEY, "{not json");
      expect(readFeatureFlagOverrides()).toEqual({});

      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(["not", "an", "object"]));
      expect(readFeatureFlagOverrides()).toEqual({});
    });

    it("notifies subscribed consumers, and stops after unsubscribing", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToFeatureFlagChanges(listener);

      setFeatureFlagOverride(FLAG, true);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      setFeatureFlagOverride(FLAG, false);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("reads as no overrides when there is no window, so SSR never crashes", () => {
      vi.stubGlobal("window", undefined);
      expect(readFeatureFlagOverrides()).toEqual({});
      expect(() => setFeatureFlagOverride(FLAG, true)).not.toThrow();
    });
  });

  describe("useFeatureFlag", () => {
    it("applies a stored per-browser override once mounted", () => {
      setRollout(0);
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify({ [FLAG]: true }));

      const { result } = renderHook(() => useFeatureFlag(FLAG, ARTIST));
      // Storage is only read after mount, so the server render and the first
      // client render agree; the override lands on the following pass.
      expect(result.current).toBe(true);
    });

    it("follows an override changed elsewhere in the app", () => {
      setRollout(0);
      const { result } = renderHook(() => useFeatureFlag(FLAG, ARTIST));
      expect(result.current).toBe(false);

      act(() => {
        setFeatureFlagOverride(FLAG, true);
      });
      expect(result.current).toBe(true);

      act(() => {
        setFeatureFlagOverride(FLAG, undefined);
      });
      expect(result.current).toBe(false);
    });

    it("resolves the rollout for an artist with no overrides at all", () => {
      setRollout(100);
      const { result } = renderHook(() => useFeatureFlag(FLAG, ARTIST));
      expect(result.current).toBe(true);
    });
  });
});
