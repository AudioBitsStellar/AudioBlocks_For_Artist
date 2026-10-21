"use client";

import { useAnalyticsConsent } from "@/hooks/useAnalyticsConsent";
import { isAnalyticsEnabled } from "@/lib/analytics";
import { isGlobalPrivacyControlEnabled, setAnalyticsConsent } from "@/lib/analyticsConsent";

/**
 * Settings → Preferences control for changing the analytics choice made in
 * `AnalyticsConsentBanner` (#668). Saves immediately; no Save button needed.
 */
export default function AnalyticsConsentSettings() {
  const consent = useAnalyticsConsent();
  const enabled = isAnalyticsEnabled();
  const accepted = consent === "accepted";

  const statusText = !enabled
    ? "Analytics are turned off for this deployment."
    : consent === "pending"
      ? ""
      : accepted
        ? "Analytics are on. Thanks for helping us improve AudioBlocks."
        : consent === "unset"
          ? "You haven't chosen yet, so nothing is tracked."
          : isGlobalPrivacyControlEnabled()
            ? "Analytics are off. Your browser's Global Privacy Control signal is respected."
            : "Analytics are off.";

  return (
    <section
      id="analytics"
      aria-labelledby="analytics-settings-title"
      className="space-y-3 max-w-md bg-surface p-6 rounded-xl border border-border"
    >
      <h3 id="analytics-settings-title" className="text-base font-semibold">
        Usage analytics
      </h3>
      <div className="flex items-start justify-between gap-4">
        <label htmlFor="analytics-consent-toggle" className="text-sm text-text-muted">
          Share anonymous usage analytics (e.g. upload and mint outcomes) to help improve the
          dashboard. The analytics script only loads while this is on.
        </label>
        <input
          id="analytics-consent-toggle"
          type="checkbox"
          role="switch"
          checked={accepted}
          disabled={!enabled || consent === "pending"}
          aria-describedby="analytics-consent-status"
          onChange={(e) => setAnalyticsConsent(e.target.checked ? "accepted" : "rejected")}
          className="mt-1 h-5 w-5 shrink-0 accent-[#D2045B] disabled:opacity-50"
        />
      </div>
      <p id="analytics-consent-status" role="status" className="text-xs text-text-muted">
        {statusText}
      </p>
    </section>
  );
}
