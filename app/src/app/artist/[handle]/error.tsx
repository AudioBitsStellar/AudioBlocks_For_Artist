"use client";

/**
 * Route-level error boundary for public artist profiles (issue #426).
 *
 * `not-found.tsx`-style handling already covers "this artist does not exist";
 * this covers the cases where rendering the profile itself fails (an unexpected
 * payload shape, a throw inside a child). `reset` re-renders the segment without
 * a full page reload, which is enough to recover from a transient failure — and
 * is the same affordance the shared `ErrorBoundary` offers in the dashboard.
 */

import ErrorState from "@/components/shared/ErrorState";

interface ArtistProfileErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ArtistProfileError({ error, reset }: ArtistProfileErrorProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 focus:outline-none sm:px-6"
    >
      <ErrorState
        title="We couldn't load this artist profile"
        description="Something went wrong while loading the page. Try again — if it keeps happening, the artist may have just changed their profile."
        retryLabel="Try again"
        onRetry={reset}
      />
      {error.digest && (
        <p className="text-center text-xs text-[#6F6F6F]">Reference: {error.digest}</p>
      )}
    </main>
  );
}
