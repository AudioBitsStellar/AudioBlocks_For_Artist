/**
 * The artist portal's release-notes page (#468).
 *
 * The copy comes from the repository's own CHANGELOG.md — this page renders it
 * rather than keeping a second list that drifts from the first. The file is
 * read once at build time, so the route stays static.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import ChangelogTimeline from "@/components/ChangelogTimeline";
import { parseChangelog } from "@/lib/changelog";

export const metadata = {
  title: "Release notes | AudioBlocks",
  description: "What changed in the AudioBlocks artist portal, most recent release first.",
};

/**
 * CHANGELOG.md lives at the repository root, one level above the Next.js
 * project directory (`app/`) that everything else is resolved from.
 */
const CHANGELOG_PATH = path.join(process.cwd(), "..", "CHANGELOG.md");

function readReleases() {
  try {
    return parseChangelog(readFileSync(CHANGELOG_PATH, "utf8"));
  } catch {
    // A deployment that ships only the built app has no source file to read.
    // The page says so instead of 500ing.
    return null;
  }
}

export default function ChangelogPage() {
  const releases = readReleases();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-white text-3xl font-bold mb-2">Release notes</h1>
        <p className="text-gray-400">Every change that reaches the artist portal, newest first.</p>
      </div>

      {releases === null ? (
        <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 text-gray-400">
          Release notes are not available for this deployment.
        </div>
      ) : (
        <ChangelogTimeline releases={releases} />
      )}
    </div>
  );
}
