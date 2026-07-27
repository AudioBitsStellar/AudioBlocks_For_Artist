import "@testing-library/jest-dom";
import { expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

// Register axe-core matchers (`toHaveNoViolations`) globally.
// vitest-axe/extend-expect is unreliable in some toolchains, so we extend
// directly from the matchers module, which is the documented escape hatch.
expect.extend(axeMatchers);

