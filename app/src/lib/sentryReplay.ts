/**
 * Session-replay privacy policy (#765, ADR-0006).
 *
 * Replay is recorded by Sentry only when a DSN is configured. The artist
 * dashboard shows earnings, wallet addresses, fan messages and email addresses,
 * so everything is masked/blocked by default; nothing is opted in.
 * `instrumentation-client.ts` consumes these constants, and
 * `src/__tests__/sentryReplay.test.ts` pins them so loosening the policy is a
 * deliberate, reviewed change rather than a drive-by edit.
 */

/** Options passed to `Sentry.replayIntegration`. Every flag is the strictest setting. */
export const REPLAY_PRIVACY_OPTIONS = {
  /** Replace all text content with `*`. */
  maskAllText: true,
  /** Mask every form input value (Sentry's default, pinned explicitly). */
  maskAllInputs: true,
  /** Do not record images, video or canvas. */
  blockAllMedia: true,
} as const;

/** Sample 10% of ordinary sessions and every session that hits an error. */
export const REPLAY_SESSION_SAMPLE_RATE = 0.1;
export const REPLAY_ON_ERROR_SAMPLE_RATE = 1.0;
