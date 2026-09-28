/**
 * The release-notes page's data path (#468): CHANGELOG.md parsing and the
 * timeline that renders it.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ChangelogTimeline from "@/components/ChangelogTimeline";
import { isUnreleased, parseChangelog, parseInlineSegments } from "@/lib/changelog";

const FIXTURE = `# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- **Preview deployments** (#472): same-repository pull requests get a Vercel URL.

### Fixed

- Corrected the \`est. gas\` hint.

## [0.1.0] - 2026-08-24

### Added

- Artist on-chain profile setup.
- Song minting via Soroban smart contracts.

### Fixed

- State cleanup on wallet disconnect.

## [0.0.9] - 2026-08-15

### Added

## [0.0.8] - 2026-08-01

### Changed

- Migrated to Next.js 16 with React 19.
`;

describe("lib/changelog", () => {
  describe("parseChangelog", () => {
    it("reads releases in file order, newest first", () => {
      const releases = parseChangelog(FIXTURE);
      expect(releases.map((release) => release.version)).toEqual(["Unreleased", "0.1.0", "0.0.8"]);
    });

    it("keeps the release date, and none for Unreleased", () => {
      const [, second] = parseChangelog(FIXTURE);
      expect(parseChangelog(FIXTURE)[0].date).toBeNull();
      expect(second.date).toBe("2026-08-24");
    });

    it("carries each bullet under its change type", () => {
      const releases = parseChangelog(FIXTURE);
      expect(releases[1].changes).toEqual([
        { type: "Added", text: "Artist on-chain profile setup." },
        { type: "Added", text: "Song minting via Soroban smart contracts." },
        { type: "Fixed", text: "State cleanup on wallet disconnect." },
      ]);
    });

    it("skips a release that has no entries", () => {
      const versions = parseChangelog(FIXTURE).map((release) => release.version);
      expect(versions).not.toContain("0.0.9");
    });

    it("ignores prose, non-release headings and bullets outside a release", () => {
      const releases = parseChangelog(`
- An orphan bullet above the first heading.

## Contributing

### Added

- Not a release section.

## [1.0.0] - 2026-09-01

### Added

- The first real entry.
`);
      expect(releases).toHaveLength(1);
      expect(releases[0].changes).toEqual([{ type: "Added", text: "The first real entry." }]);
    });

    it("drops an unrecognised section heading but keeps reading the rest", () => {
      const [release] = parseChangelog(`
## [2.0.0] - 2026-10-01

### Performance

- Tuned the dashboard query.

### Added

- Still parsed.
`);
      // The unknown heading resets nothing: the bullet after it has no known
      // type, so only the recognised section survives.
      expect(release.changes).toEqual([{ type: "Added", text: "Still parsed." }]);
    });

    it("returns nothing for a document with no releases", () => {
      expect(parseChangelog("# Changelog\n\nNothing shipped yet.\n")).toEqual([]);
    });

    it("parses the repository's own CHANGELOG.md, so the page is never empty", () => {
      const changelogPath = path.join(process.cwd(), "..", "CHANGELOG.md");
      if (!existsSync(changelogPath)) return;

      const releases = parseChangelog(readFileSync(changelogPath, "utf8"));
      expect(releases.length).toBeGreaterThan(0);
      expect(releases[0].changes.length).toBeGreaterThan(0);
      expect(isUnreleased(releases[0])).toBe(true);
    });
  });

  describe("parseInlineSegments", () => {
    it("splits bold and code runs out of plain text", () => {
      expect(parseInlineSegments("**Feature** (#12): touches `lib/x.ts` here.")).toEqual([
        { text: "Feature", emphasis: "strong" },
        { text: " (#12): touches ", emphasis: "none" },
        { text: "lib/x.ts", emphasis: "code" },
        { text: " here.", emphasis: "none" },
      ]);
    });

    it("leaves text with no markup as a single run", () => {
      expect(parseInlineSegments("Plain entry.")).toEqual([
        { text: "Plain entry.", emphasis: "none" },
      ]);
    });

    it("renders the first bold run of a changelog bullet without literal asterisks", () => {
      const [release] = parseChangelog(FIXTURE);
      render(<ChangelogTimeline releases={[release]} />);

      expect(screen.getByText("Preview deployments")).toBeInTheDocument();
      expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
      expect(screen.queryByText(/`/)).not.toBeInTheDocument();
    });
  });
});

describe("ChangelogTimeline", () => {
  const releases = parseChangelog(FIXTURE);

  it("labels the in-progress section as upcoming instead of a version", () => {
    render(<ChangelogTimeline releases={releases} />);

    expect(screen.getByText("Unreleased")).toBeInTheDocument();
    expect(screen.getByText("Shipping next")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("2026-08-24")).toBeInTheDocument();
  });

  it("groups entries under their change type", () => {
    render(<ChangelogTimeline releases={releases} />);

    const fixedHeadings = screen.getAllByText("Fixed");
    expect(fixedHeadings).toHaveLength(2);
    expect(screen.getByText("State cleanup on wallet disconnect.")).toBeInTheDocument();
  });

  it("renders a code span for entries that name a file or symbol", () => {
    render(<ChangelogTimeline releases={releases} />);

    const code = screen.getByText("est. gas");
    expect(code.tagName).toBe("CODE");
  });

  it("says so when nothing has been released", () => {
    render(<ChangelogTimeline releases={[]} />);
    expect(screen.getByText(/No release notes have been published/)).toBeInTheDocument();
  });

  it("gives each release a labelled region for assistive technology", () => {
    const { container } = render(<ChangelogTimeline releases={releases} />);
    const articles = container.querySelectorAll("article");
    expect(articles).toHaveLength(releases.length);

    const headings = container.querySelectorAll("h2");
    headings.forEach((heading) => {
      expect(heading.textContent).toBeTruthy();
      expect(document.getElementById(heading.id)).toBe(heading);
    });
  });
});

describe("dashboard/changelog page", () => {
  it("resolves the repository CHANGELOG.md into release cards", async () => {
    const { default: ChangelogPage } = await import("@/app/dashboard/changelog/page");

    const { container } = render(<ChangelogPage />);

    expect(screen.getByRole("heading", { name: "Release notes", level: 1 })).toBeInTheDocument();
    // CHANGELOG.md sits one level above the Next.js project root; if that path
    // is wrong the page degrades quietly, so assert the real content arrived.
    expect(screen.getByText("Shipping next")).toBeInTheDocument();
    expect(container.querySelectorAll("article").length).toBeGreaterThan(1);
  });
});
