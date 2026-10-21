/**
 * Readable equivalent of Segment's analytics.js loader snippet (#668).
 *
 * `installSegmentStub` puts a queueing `window.analytics` in place, the way
 * the official snippet does, so calls made before analytics.js has downloaded
 * are buffered and replayed by it. `<AnalyticsScript />` then loads
 * `getSegmentScriptUrl(key)` with next/script, which is exactly the script
 * the snippet's `analytics.load(key)` would inject.
 *
 * @see https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/quickstart/
 */

/** The methods Segment's snippet stubs out. */
export const SEGMENT_STUB_METHODS = [
  "trackSubmit",
  "trackClick",
  "trackLink",
  "trackForm",
  "pageview",
  "identify",
  "reset",
  "group",
  "track",
  "ready",
  "alias",
  "debug",
  "page",
  "screen",
  "once",
  "off",
  "on",
  "addSourceMiddleware",
  "addIntegrationMiddleware",
  "setAnonymousId",
  "addDestinationMiddleware",
  "register",
] as const;

type StubMethod = (typeof SEGMENT_STUB_METHODS)[number];

/** The queueing stub: an array of `[method, ...args]` calls plus a function per method. */
export type SegmentStub = Array<unknown[]> & {
  [K in StubMethod]: (...args: unknown[]) => SegmentStub;
} & {
  initialize?: boolean;
  invoked?: boolean;
  _writeKey?: string;
};

export function getSegmentScriptUrl(writeKey: string): string {
  return `https://cdn.segment.com/analytics.js/v1/${encodeURIComponent(writeKey)}/analytics.min.js`;
}

/**
 * Installs the stub on `window.analytics` unless analytics.js (or a stub) is
 * already there. Returns false when it left an existing instance in place.
 */
export function installSegmentStub(writeKey: string): boolean {
  if (typeof window === "undefined") return false;
  const win = window as Window & { analytics?: unknown };
  const existing = win.analytics as Partial<SegmentStub> | undefined;
  if (existing && (existing.initialize || existing.invoked)) return false;

  const stub = [] as unknown as SegmentStub;
  stub.invoked = true;
  for (const method of SEGMENT_STUB_METHODS) {
    stub[method] = (...args: unknown[]) => {
      stub.push([method, ...args]);
      return stub;
    };
  }
  stub._writeKey = writeKey;
  win.analytics = stub;
  return true;
}
