"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  /** Headline, e.g. "Unable to load your albums". */
  title: string;
  /** What failed and what the artist can do about it. */
  description: string;
  /** Label for the recovery action. Needs `onRetry` or `retryHref` to render. */
  retryLabel?: string;
  /** Retry handler, e.g. a React Query `refetch`. */
  onRetry?: () => void;
  /**
   * Recovery as a navigation instead of a handler. Surfaces that may render
   * outside a router context (a dynamically imported section, a server-rendered
   * route) can't pass `onRetry` across the client boundary, so they link.
   */
  retryHref?: string;
  className?: string;
}

const ACTION_CLASS =
  "rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

/**
 * Inline error state for a section whose data failed to load (issue #426).
 *
 * `ErrorBoundary` covers a render crash; this covers the far more common case —
 * the request behind a section rejected. It is announced with `role="alert"`
 * rather than the `role="status"` used by `EmptyState`, because a failure is
 * unexpected and should interrupt a screen reader mid-sentence, and it always
 * offers a way forward: retry the request, or navigate somewhere useful.
 */
export default function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  retryHref,
  className = "",
}: ErrorStateProps) {
  const hasAction = Boolean(retryLabel && (onRetry || retryHref));

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-2xl border border-error/30 bg-surface px-4 py-10 text-center ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-text-muted">{description}</p>
      {hasAction && retryHref && (
        <Link href={retryHref} className={ACTION_CLASS}>
          {retryLabel}
        </Link>
      )}
      {hasAction && !retryHref && (
        <button type="button" onClick={onRetry} className={ACTION_CLASS}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export { ErrorState };
