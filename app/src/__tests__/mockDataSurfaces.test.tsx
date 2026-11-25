// One mechanism for sample data across the dashboard (#52).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import fs from "fs";
import path from "path";
import MockDataBadge from "@/components/MockDataBadge";
import MockDataNotice from "@/components/MockDataNotice";
import { activeMockSurfaces, featureFlags, MOCK_DATA_SURFACES } from "@/lib/featureFlags";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("MockDataBadge", () => {
  it("renders nothing for a surface on real data", () => {
    const { container } = render(<MockDataBadge label="Merch" active={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says it is sample data and names the surface in its tooltip", () => {
    render(<MockDataBadge label="Merch inventory" active />);
    const badge = screen.getByTestId("mock-data-badge");
    expect(badge).toHaveTextContent(/^Sample data$/);
    expect(badge).toHaveAttribute(
      "title",
      "Merch inventory is showing sample data, not your real data"
    );
  });

  it("still shows in a production build when the surface is on sample data", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<MockDataBadge label="Events" active />);
    expect(screen.getByTestId("mock-data-badge")).toBeInTheDocument();
  });
});

describe("feature flags drive the sample-data surfaces", () => {
  it("follows NEXT_PUBLIC_USE_MOCK_DATA at read time", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "true");
    expect(featureFlags.useMockEvents).toBe(true);
    expect(featureFlags.useMockMerches).toBe(true);
    expect(featureFlags.useMockOverviewCards).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "false");
    expect(featureFlags.useMockEvents).toBe(false);
    expect(featureFlags.useMockListenerAnalytics).toBe(false);
  });

  it("lists nothing when every surface is on real data", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "false");
    expect(activeMockSurfaces()).toEqual([]);
  });

  it("names every surface on sample data when mock mode is on", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_DATA", "true");
    const surfaces = activeMockSurfaces();
    expect(surfaces).toEqual(expect.arrayContaining(["Overview statistics", "Events", "Merch"]));
    // Earnings are always real (#47), so they are never listed.
    expect(surfaces).not.toContain("Earnings & royalties");
  });

  it("lists exactly the flags that are on", () => {
    expect(activeMockSurfaces({ useMockEvents: true, useMockMerches: false })).toEqual(["Events"]);
  });

  it("has a display name for every data-source flag", () => {
    const dataFlags = Object.keys(featureFlags).filter(
      (key) => key.startsWith("useMock") && key !== "useMockEmailVerification"
    );
    expect(Object.keys(MOCK_DATA_SURFACES).sort()).toEqual(dataFlags.sort());
  });
});

describe("MockDataNotice", () => {
  it("renders nothing when no surface is on sample data", () => {
    const { container } = render(<MockDataNotice surfaces={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the surfaces on sample data", () => {
    render(<MockDataNotice surfaces={["Events", "Merch"]} />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Sample data: Events, Merch are not showing your real data yet."
    );
  });

  it("uses the singular for one surface", () => {
    render(<MockDataNotice surfaces={["Events"]} />);
    expect(screen.getByRole("note")).toHaveTextContent("Events is not showing your real data yet.");
  });
});

describe("no ad hoc mock-data switches outside featureFlags", () => {
  const SRC = path.resolve(__dirname, "..");
  const ALLOWED = new Set([
    path.join("lib", "featureFlags.ts"),
    path.join("lib", "env.ts"),
    path.join("lib", "runtimeConfig.ts"),
  ]);

  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "__tests__" || entry.name === "__mocks__" ? [] : sourceFiles(full);
      }
      return /\.(ts|tsx)$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name)
        ? [full]
        : [];
    });
  }

  it("reads NEXT_PUBLIC_USE_MOCK_DATA only through featureFlags", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !ALLOWED.has(path.relative(SRC, file)))
      .filter((file) =>
        /process\.env\.NEXT_PUBLIC_USE_MOCK_DATA/.test(fs.readFileSync(file, "utf8"))
      )
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });

  it("passes every MockDataBadge its surface flag", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) =>
        /<MockDataBadge(?![^>]*\bactive=)[^>]*\/>/.test(fs.readFileSync(file, "utf8"))
      )
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});
