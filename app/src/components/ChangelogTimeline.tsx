/**
 * Renders parsed CHANGELOG.md releases for the artist portal's release-notes
 * page (#468). Presentational only — the parsing and file read happen in the
 * server page, so this stays usable from either side of the boundary.
 */

import {
  ChangelogChangeType,
  ChangelogRelease,
  InlineSegment,
  isUnreleased,
  parseInlineSegments,
} from "@/lib/changelog";

/** Bullets are grouped under their heading in this order, matching the file. */
const CHANGE_TYPE_ORDER: readonly ChangelogChangeType[] = [
  "Added",
  "Changed",
  "Deprecated",
  "Removed",
  "Fixed",
];

const CHANGE_TYPE_STYLES: Record<ChangelogChangeType, string> = {
  Added: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
  Changed: "bg-sky-500/15 border-sky-500/40 text-sky-400",
  Deprecated: "bg-amber-500/15 border-amber-500/40 text-amber-400",
  Removed: "bg-orange-500/15 border-orange-500/40 text-orange-400",
  Fixed: "bg-pink-500/15 border-pink-500/40 text-pink-400",
};

function InlineText({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.emphasis === "strong") {
          return (
            <strong key={index} className="text-white font-semibold">
              {segment.text}
            </strong>
          );
        }
        if (segment.emphasis === "code") {
          return (
            <code
              key={index}
              className="rounded bg-[#2d3d2d] px-1 py-0.5 text-[13px] font-mono text-emerald-300"
            >
              {segment.text}
            </code>
          );
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </>
  );
}

function ReleaseCard({ release }: { release: ChangelogRelease }) {
  const upcoming = isUnreleased(release);

  return (
    <article
      className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6"
      aria-labelledby={`release-${release.version}`}
    >
      <header className="flex items-center gap-3 mb-5 flex-wrap">
        <h2 id={`release-${release.version}`} className="text-white text-lg font-bold">
          {upcoming ? "Unreleased" : `v${release.version}`}
        </h2>
        {upcoming ? (
          <span className="rounded-full bg-gray-500/20 border border-gray-500/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Shipping next
          </span>
        ) : (
          <span className="text-gray-400 text-sm">{release.date}</span>
        )}
      </header>

      <div className="space-y-6">
        {CHANGE_TYPE_ORDER.map((type) => {
          const changes = release.changes.filter((change) => change.type === type);
          if (changes.length === 0) return null;

          return (
            <section key={type} aria-label={`${type} in ${release.version}`}>
              <span
                className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide mb-3 ${CHANGE_TYPE_STYLES[type]}`}
              >
                {type}
              </span>
              <ul className="space-y-2">
                {changes.map((change, index) => (
                  <li key={index} className="text-gray-300 text-sm leading-relaxed flex gap-2">
                    <span className="text-gray-500 mt-[7px] h-1 w-1 rounded-full bg-current shrink-0" />
                    <InlineText segments={parseInlineSegments(change.text)} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}

export default function ChangelogTimeline({ releases }: { releases: ChangelogRelease[] }) {
  if (releases.length === 0) {
    return (
      <div className="bg-[#1f2622] border border-[#2d3d2d] rounded-lg p-6 text-gray-400">
        No release notes have been published yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {releases.map((release) => (
        <ReleaseCard key={`${release.version}-${release.date}`} release={release} />
      ))}
    </div>
  );
}
