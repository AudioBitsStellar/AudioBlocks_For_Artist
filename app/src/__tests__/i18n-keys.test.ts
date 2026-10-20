import { describe, it, expect } from "vitest";
import en, { type Translations } from "@/locales/en";
import es from "@/locales/es";

/**
 * I18n key consistency test (issue #429).
 *
 * Verifies that every translation key in en.ts exists in es.ts with the same
 * structure. Missing keys would cause runtime errors when the language switcher
 * is used, so this test catches them at build time.
 */

describe("I18n translation keys", () => {
  /**
   * Recursively checks that every key path in the source object exists in the
   * target object, building up a list of missing paths.
   */
  function findMissingKeys(
    source: any,
    target: any,
    path: string[] = []
  ): string[] {
    const missing: string[] = [];

    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

      const currentPath = [...path, key];
      const sourceValue = source[key];
      const targetValue = target?.[key];

      if (typeof sourceValue === "object" && sourceValue !== null) {
        // Recurse into nested objects
        if (typeof targetValue !== "object" || targetValue === null) {
          missing.push(currentPath.join("."));
        } else {
          missing.push(...findMissingKeys(sourceValue, targetValue, currentPath));
        }
      } else {
        // Leaf value: check that target has this key
        if (targetValue === undefined) {
          missing.push(currentPath.join("."));
        }
      }
    }

    return missing;
  }

  it("es.ts contains all keys from en.ts", () => {
    const missing = findMissingKeys(en, es);

    if (missing.length > 0) {
      throw new Error(
        `es.ts is missing the following keys from en.ts:\n  ${missing.join("\n  ")}`
      );
    }

    expect(missing).toEqual([]);
  });

  it("en.ts contains all keys from es.ts (no extra keys in Spanish)", () => {
    const extra = findMissingKeys(es, en);

    if (extra.length > 0) {
      throw new Error(
        `es.ts contains keys not found in en.ts (these should be removed or added to en.ts):\n  ${extra.join("\n  ")}`
      );
    }

    expect(extra).toEqual([]);
  });

  it("both locales export the same type structure", () => {
    // TypeScript enforces that es conforms to Translations, but we also check
    // runtime for extra safety
    const enKeys = Object.keys(en).sort();
    const esKeys = Object.keys(es).sort();

    expect(esKeys).toEqual(enKeys);
  });
});
