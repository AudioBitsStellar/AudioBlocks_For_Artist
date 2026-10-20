"use client";

/**
 * Route-level error boundary for dashboard pages (issue #427).
 *
 * An uncaught render error in any dashboard page now shows this friendly message
 * instead of Next's default error screen, keeping the sidebar and header visible
 * so the artist can navigate away. The `reset()` function re-renders the segment
 * without a full reload — enough to recover from transient failures.
 *
 * For error reporting integration, see the ErrorBoundary/Sentry issue.
 */

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-error/30 bg-surface px-4 py-10 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      
      <h2 className="mb-3 text-2xl font-bold text-text">Something went wrong</h2>
      
      <p className="mb-8 max-w-md text-sm text-text-muted">
        We couldn't load this page. Try again — if it keeps happening, navigate to another section
        or contact support.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Try again
        </button>
        
        <Link
          href="/dashboard/overview"
          className="rounded-lg border border-border bg-surface px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Go to Overview
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-text-muted">
          Reference: <code className="rounded bg-surface-sunken px-1.5 py-0.5">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
