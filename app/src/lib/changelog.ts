/**
 * Parser for the repository's Keep a Changelog file, so the artist portal's
 * release-notes page (#468) renders the same history the repo keeps instead of
 * a second list that has to be maintained by hand.
 *
 * Deliberately forgiving: an entry that doesn't match the documented format is
 * skipped rather than throwing, because a changelog typo must never blank the
 * page artists read.
 */

/** The four Keep a Changelog section headings. */
export type ChangelogChangeType = "Added" | "Changed" | "Deprecated" | "Removed" | "Fixed";

export interface ChangelogChange {
  type: ChangelogChangeType;
  text: string;
}

export interface ChangelogRelease {
  /** e.g. `0.1.0`; the literal `Unreleased` for the in-progress section. */
  version: string;
  /** ISO date as written in the file, or `null` for `Unreleased`. */
  date: string | null;
  changes: ChangelogChange[];
}

const CHANGE_TYPES: readonly ChangelogChangeType[] = [
  "Added",
  "Changed",
  "Deprecated",
  "Removed",
  "Fixed",
];

/** `## [0.1.0] - 2026-08-24` / `## [Unreleased]` */
const RELEASE_HEADING = /^##\s+\[([^\]]+)\](?:\s*-\s*(\S+))?/;
/** `### Added` */
const CHANGE_TYPE_HEADING = /^###\s+(.*)$/;
/** `- **Title** (#123): description` or a plain `- item` */
const BULLET = /^\s*[-*]\s+(.*)$/;

function matchChangeType(heading: string): ChangelogChangeType | null {
  const normalized = heading.trim().toLowerCase();
  return CHANGE_TYPES.find((type) => type.toLowerCase() === normalized) ?? null;
}

function parseBullet(line: string): string | null {
  const matched = BULLET.exec(line);
  if (!matched) return null;
  const text = matched[1].trim();
  return text.length > 0 ? text : null;
}

/**
 * Splits a Keep a Changelog document into releases, newest first (the file's
 * own order). Releases with no bullets are dropped: an empty heading carries no
 * information for the reader.
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let current: ChangelogRelease | null = null;
  let currentType: ChangelogChangeType | null = null;

  const flush = () => {
    if (current !== null && current.changes.length > 0) releases.push(current);
  };

  for (const line of markdown.split(/\r?\n/)) {
    const releaseHeading = RELEASE_HEADING.exec(line);
    if (releaseHeading) {
      flush();
      current = {
        version: releaseHeading[1].trim(),
        date: releaseHeading[2]?.trim() ?? null,
        changes: [],
      };
      currentType = null;
      continue;
    }
    if (current === null) continue;
    // Local alias: `current` is reassigned inside this loop, so the compiler
    // narrows it back to `null` by the time it's used below.
    const release = current;

    const typeHeading = CHANGE_TYPE_HEADING.exec(line);
    if (typeHeading) {
      currentType = matchChangeType(typeHeading[1]);
      continue;
    }

    const bullet = parseBullet(line);
    if (!bullet || currentType === null) continue;

    release.changes.push({ type: currentType, text: bullet });
  }

  flush();

  return releases;
}

/** `true` for the `## [Unreleased]` section, which has no version to ship. */
export function isUnreleased(release: ChangelogRelease): boolean {
  return release.version.toLowerCase() === "unreleased";
}

/** A run of plain text, or one emphasised by `**bold**` or `` `code` ``. */
export interface InlineSegment {
  text: string;
  emphasis: "none" | "strong" | "code";
}

const INLINE_MARKUP = /(\*\*[^*]+\*\*|`[^`]+`)/;

/**
 * Splits a bullet's markdown into renderable runs. Changelog prose uses bold
 * for the feature name and backticks for the file or symbol it touches, and
 * those markers would otherwise show up literally on the page.
 */
export function parseInlineSegments(text: string): InlineSegment[] {
  return text.split(INLINE_MARKUP).reduce<InlineSegment[]>((segments, part) => {
    if (!part) return segments;
    if (part.startsWith("**") && part.endsWith("**")) {
      segments.push({ text: part.slice(2, -2), emphasis: "strong" });
    } else if (part.startsWith("`") && part.endsWith("`")) {
      segments.push({ text: part.slice(1, -1), emphasis: "code" });
    } else {
      segments.push({ text: part, emphasis: "none" });
    }
    return segments;
  }, []);
}
