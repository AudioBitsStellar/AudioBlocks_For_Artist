"use client";

/**
 * Shared loading-skeleton primitives (issue #424).
 *
 * Dashboard panels used to show either nothing, a bare `Loading…` string or a
 * spinner, all of which cause a layout jump once real content arrives. These
 * primitives reserve the same space as the content they stand in for, so the
 * page doesn't reflow when data lands.
 *
 * Accessibility: skeletons are decorative, so each one is `aria-hidden`. The
 * loading state is announced once by the surrounding `role="status"` /
 * `aria-live` region instead of by every placeholder.
 */

const SKELETON_CSS = `
.skeleton-shimmer {
  background-image: linear-gradient(
    90deg,
    var(--color-surface-sunken) 0%,
    var(--color-surface-raised) 50%,
    var(--color-surface-sunken) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.6s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none;
    background-position: 0 0;
  }
}
`;

interface SkeletonProps {
  /** Tailwind size/position classes, e.g. `"h-4 w-32 rounded"`. */
  className?: string;
}

/** A single shimmering placeholder block. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <>
      <div aria-hidden="true" className={`skeleton-shimmer bg-surface-sunken ${className}`} />
      {/* The animation lives here rather than in `SkeletonList` so a lone
          `Skeleton` still shimmers — styled-jsx only injects a block when the
          component owning it renders. */}
      <style jsx global>
        {SKELETON_CSS}
      </style>
    </>
  );
}

interface SkeletonListProps extends SkeletonProps {
  /** How many placeholder rows to render. */
  items?: number;
  /** Accessible name of the busy region, e.g. `"Loading artists"`. */
  ariaLabel: string;
}

/**
 * A stack of placeholder rows wrapped in a `role="status"` live region so
 * assistive tech hears that content is loading.
 */
export function SkeletonList({ items = 3, ariaLabel, className = "" }: SkeletonListProps) {
  return (
    <div role="status" aria-busy="true" aria-label={ariaLabel} className={className}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4" data-testid="skeleton-row">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
