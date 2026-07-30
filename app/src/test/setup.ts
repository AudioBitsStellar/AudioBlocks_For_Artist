// Centralised Vitest setup globals.
// - `@testing-library/jest-dom` adds DOM matchers (toBeInTheDocument, etc.).
// - `vitest-axe/matchers` adds `toHaveNoViolations()` for accessibility audits
//   (used by app/src/__tests__/FormAccessibility.test.tsx from upstream #161/#177).
import "@testing-library/jest-dom";
import { expect } from "vitest";

try {
  // Use `require` (wrapped in try/catch) so a missing `vitest-axe/matchers`
  // module — or one whose `matchers` type entry-point resolves differently
  // across patch versions — does not hard-fail the entire Vitest setup and
  // therefore the entire test suite.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const axeMatchersModule = require("vitest-axe/matchers");
  // vitest-axe 0.4 exports the matcher object as ES `default`, while earlier
  // versions expose it as a namespace (the whole module IS the matcher map).
  // Pick whichever shape we got so this works across both minor versions.
  const axeMatchers =
    (axeMatchersModule as { default?: Record<string, unknown> }).default ?? axeMatchersModule;
  expect.extend(axeMatchers as Parameters<typeof expect.extend>[0]);
} catch (err) {
  // Skip a11y matcher registration gracefully. The accessibility tests
  // eslint-disable-next-line no-console
  console.warn(
    "[vitest setup] vitest-axe/matchers not available; accessibility matchers will not be registered.",
    err,
  );
  // The original comment block continues below for context.
  // Skip a11y matcher registration gracefully. The accessibility tests
  // (`FormAccessibility.test.tsx`, `DashboardAccessibility.test.tsx`) will
  // still work in environments where vitest-axe/matchers is installed
  // because they'll only use `toHaveNoViolations` if it's actually
  // registered; without it they'll fail loudly so the missing dependency
  // becomes visible instead of silently swallowed here.
}
