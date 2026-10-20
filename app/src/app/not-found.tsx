import Link from "next/link";
import Image from "next/image";
import { FileQuestion } from "lucide-react";

/**
 * Global 404 page for the public site (issue #427).
 *
 * Shown when a user navigates to a non-existent public route. Includes branding
 * and navigation back to the homepage or artist hub.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <Image src="/logo.png" alt="AudioBlocks" width={120} height={120} priority />
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--text-muted)]">
            <FileQuestion className="h-10 w-10" aria-hidden="true" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-[var(--text)]">Page not found</h1>
          <p className="text-sm text-[var(--text-muted)]">
            The page you're looking for doesn't exist. It may have been moved or deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-contrast)] transition-colors hover:bg-[var(--primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            Go to Homepage
          </Link>

          <Link
            href="/dashboard/overview"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            Artist Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
