// Centralised Vitest setup globals.
// - `@testing-library/jest-dom` adds DOM matchers (toBeInTheDocument, etc.).
// - `vitest-axe/matchers` adds `toHaveNoViolations()` for accessibility audits
//   (used by app/src/__tests__/FormAccessibility.test.tsx from upstream #161/#177).
import "@testing-library/jest-dom";
import "vitest-axe/matchers";
