"use client";

import Link from "next/link";
import { useAnalyticsConsent } from "@/hooks/useAnalyticsConsent";
import { isAnalyticsEnabled } from "@/lib/analytics";
import { setAnalyticsConsent } from "@/lib/analyticsConsent";

/**
 * First-visit analytics consent banner (#668).
 *
 * Non-blocking: a region pinned to the corner, not a modal, so the dashboard
 * stays usable and focus isn't stolen on load. It only renders when this
 * build has an analytics write key and the artist has no current choice, so
 * it disappears after Accept or Decline. The choice can be changed later in
 * Settings → Preferences.
 */
export default function AnalyticsConsentBanner() {
  const consent = useAnalyticsConsent();

  if (!isAnalyticsEnabled() || consent !== "unset") return null;

  return (
    <section
      aria-labelledby="analytics-consent-title"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-xl border border-[#2A2A2A] bg-[#161616] p-4 text-white shadow-2xl md:inset-x-auto md:right-6 md:bottom-6"
    >
      <h2 id="analytics-consent-title" className="text-sm font-semibold">
        Help us improve AudioBlocks
      </h2>
      <p className="mt-1 text-xs text-[#A3A3A3]">
        We&apos;d like to collect anonymous usage analytics (for example, when an upload or mint
        fails) to improve the artist dashboard. Nothing is loaded or sent until you accept.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAnalyticsConsent("accepted")}
          className="rounded-full bg-[#D2045B] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#B8043F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Accept analytics
        </button>
        <button
          type="button"
          onClick={() => setAnalyticsConsent("rejected")}
          className="rounded-full border border-[#2A2A2A] px-4 py-1.5 text-xs font-medium text-[#A3A3A3] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Decline
        </button>
        <Link
          href="/dashboard/settings/preferences#analytics"
          className="ml-auto text-xs text-[#A3A3A3] underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Privacy settings
        </Link>
      </div>
    </section>
  );
}
