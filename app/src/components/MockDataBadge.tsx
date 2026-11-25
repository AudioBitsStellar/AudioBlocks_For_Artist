"use client";

/**
 * Marks a surface that is showing sample data instead of the artist's real
 * data (#52).
 *
 * Callers pass that surface's own flag from `featureFlags`, so the badge and
 * the data source can never disagree: when the flag is on, the badge is there
 * in every build, including a production build of a demo or staging deploy.
 * When the flag is off it renders nothing, and the flag (and this badge) can
 * be deleted without touching the surface's logic.
 */
export interface MockDataBadgeProps {
  /**
   * Which surface, for the tooltip, e.g. "Merch inventory". The visible text
   * stays a short "Sample data", because the badge often sits inside a
   * heading and becomes part of its accessible name.
   */
  label: string;
  /** The surface's `featureFlags.useMock*` value. */
  active: boolean;
}

export default function MockDataBadge({ label, active }: MockDataBadgeProps) {
  if (!active) return null;

  return (
    <span
      data-testid="mock-data-badge"
      title={`${label} is showing sample data, not your real data`}
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200 ml-2"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      Sample data
    </span>
  );
}

export { MockDataBadge };
