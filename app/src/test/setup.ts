// Centralised Vitest setup globals.
// - `@testing-library/jest-dom` adds DOM matchers (toBeInTheDocument, etc.).
// - `vitest-axe/matchers` adds `toHaveNoViolations()` for accessibility audits
//   (used by app/src/__tests__/FormAccessibility.test.tsx from upstream #161/#177).
import "@testing-library/jest-dom";
import { expect } from "vitest";
import * as axeMatchersModule from "vitest-axe/matchers";

// Register axe-core matchers (`toHaveNoViolations`) globally.
// vitest-axe 0.4 exports the matcher object as ES `default`, while earlier
// versions expose it as a namespace (the whole module IS the matcher map).
// Pick whichever shape we got so this works across both minor versions.
const axeMatchers =
  (axeMatchersModule as { default?: Record<string, unknown> }).default ?? axeMatchersModule;

expect.extend(axeMatchers as Parameters<typeof expect.extend>[0]);
