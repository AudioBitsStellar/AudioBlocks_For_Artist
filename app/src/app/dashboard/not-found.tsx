import Link from "next/link";
import { FileQuestion } from "lucide-react";

/**
 * Dashboard 404 page (issue #427).
 *
 * Shown when `notFound()` is called from a dynamic dashboard route (track, album,
 * or event detail) or when the user navigates to a non-existent dashboard path.
 * Keeps the sidebar and header visible so the artist can navigate away without
 * going back to the browser.
 */
export default function DashboardNotFound() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-10 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--text-muted)]">
        <FileQuestion className="h-8 w-8" aria-hidden="true" />
      </div>

      <h2 className="mb-3 text-2xl font-bold text-[var(--text)]">Page not found</h2>

      <p className="mb-8 max-w-md text-sm text-[var(--text-muted)]">
        The page you're looking for doesn't exist or may have been moved. Head back to your music
        library or dashboard overview.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard/my-music"
          className="rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          Go to My Music
        </Link>

        <Link
          href="/dashboard/overview"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          Go to Overview
        </Link>
      </div>
    </div>
  );
}
