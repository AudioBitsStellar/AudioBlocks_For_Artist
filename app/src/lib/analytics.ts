/**
 * Thin analytics façade. Swap the implementation by replacing the `send`
 * function — the rest of the codebase calls the typed helpers below.
 *
 * Supported providers: anything reachable via window (Segment, PostHog, Mixpanel, etc.)
 * Set NEXT_PUBLIC_ANALYTICS_WRITE_KEY to enable. When unset all calls are no-ops
 * so the dev/test environment stays noise-free.
 */

type EventName =
  | "upload_started"
  | "upload_completed"
  | "upload_failed"
  | "mint_started"
  | "mint_succeeded"
  | "mint_failed"
  | "profile_saved";

type EventProperties = Record<string, string | number | boolean | undefined>;

/**
 * Segment Analytics API interface
 * @see https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/
 */
interface SegmentAnalytics {
  track: (event: string, properties?: Record<string, unknown>) => void;
  identify?: (userId: string, traits?: Record<string, unknown>) => void;
  page?: (category?: string, name?: string, properties?: Record<string, unknown>) => void;
  group?: (groupId: string, traits?: Record<string, unknown>) => void;
}

/**
 * Extended Window interface with Segment analytics
 */
interface WindowWithAnalytics extends Window {
  analytics?: SegmentAnalytics;
}

function send(event: EventName, props?: EventProperties): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_ANALYTICS_WRITE_KEY) return;

  // Segment-compatible analytics.track call — works with PostHog, Mixpanel, and
  // any window.analytics shim that follows the Segment spec.
  const win = window as WindowWithAnalytics;
  if (typeof win.analytics?.track === "function") {
    win.analytics.track(event, props ?? {});
  }
}

export const analytics = {
  uploadStarted(props: { fileId: string; fileName: string; fileSizeBytes: number }) {
    send("upload_started", props);
  },
  uploadCompleted(props: { fileId: string; songId: string; durationMs: number }) {
    send("upload_completed", props);
  },
  uploadFailed(props: { fileId: string; reason: string }) {
    send("upload_failed", props);
  },
  mintStarted(props: { songId: string; walletAddress: string }) {
    send("mint_started", props);
  },
  mintSucceeded(props: { songId: string; txHash: string; tokenId: string }) {
    send("mint_succeeded", props);
  },
  mintFailed(props: { songId: string; reason: string }) {
    send("mint_failed", props);
  },
  profileSaved(props: { hasImage: boolean; hasWebsite: boolean; hasTwitter: boolean }) {
    send("profile_saved", props);
  },
};
