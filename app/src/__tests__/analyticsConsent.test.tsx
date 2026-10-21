/**
 * Analytics consent (#668): the consent store, the façade's gating/queueing,
 * the Segment stub, and the banner / script / settings components.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_VERSION,
  getAnalyticsConsent,
  getAnalyticsConsentRecord,
  hasAnalyticsConsent,
  resetAnalyticsConsentMemory,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from "@/lib/analyticsConsent";
import {
  analytics,
  clearQueuedAnalytics,
  flushQueuedAnalytics,
  getQueuedAnalyticsCount,
} from "@/lib/analytics";
import {
  SEGMENT_STUB_METHODS,
  getSegmentScriptUrl,
  installSegmentStub,
  type SegmentStub,
} from "@/lib/segmentSnippet";
import AnalyticsConsentBanner from "@/components/AnalyticsConsentBanner";
import AnalyticsScript from "@/components/AnalyticsScript";
import AnalyticsConsentSettings from "@/components/AnalyticsConsentSettings";

vi.mock("next/script", () => ({
  __esModule: true,
  default: (props: { id: string; src: string; strategy: string }) => (
    // eslint-disable-next-line @next/next/no-sync-scripts -- stand-in for next/script
    <script data-testid={props.id} src={props.src} data-strategy={props.strategy} />
  ),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

type Win = Window & { analytics?: unknown };
const WRITE_KEY = "write-key-under-test";

function setGpc(value: boolean | undefined) {
  Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value });
}

beforeEach(() => {
  localStorage.clear();
  resetAnalyticsConsentMemory();
  clearQueuedAnalytics();
  setGpc(undefined);
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", WRITE_KEY);
  delete (window as Win).analytics;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  delete (window as Win).analytics;
});

describe("consent store", () => {
  it("starts unset and persists the choice under audioblocks_analytics_consent", () => {
    expect(getAnalyticsConsent()).toBe("unset");
    expect(hasAnalyticsConsent()).toBe(false);

    setAnalyticsConsent("accepted");

    const stored = JSON.parse(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)!);
    expect(stored).toMatchObject({ version: ANALYTICS_CONSENT_VERSION, status: "accepted" });
    expect(getAnalyticsConsent()).toBe("accepted");

    // Survives a "reload" (memory cleared, storage kept).
    resetAnalyticsConsentMemory();
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("ignores records from an older consent version and corrupt JSON", () => {
    localStorage.setItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify({ version: ANALYTICS_CONSENT_VERSION - 1, status: "accepted" })
    );
    expect(getAnalyticsConsent()).toBe("unset");

    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "{not json");
    expect(getAnalyticsConsentRecord()).toBeNull();
  });

  it("defaults to rejected under Global Privacy Control, but an explicit choice wins", () => {
    setGpc(true);
    expect(getAnalyticsConsent()).toBe("rejected");
    setAnalyticsConsent("accepted");
    expect(getAnalyticsConsent()).toBe("accepted");
  });

  it("keeps the choice in memory when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setAnalyticsConsent("accepted");
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("resets a loaded provider on decline and notifies subscribers", () => {
    const reset = vi.fn();
    (window as Win).analytics = { reset, track: vi.fn() };
    const onChange = vi.fn();
    const unsubscribe = subscribeToAnalyticsConsent(onChange);

    setAnalyticsConsent("rejected");
    expect(reset).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent("storage"));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    setAnalyticsConsent("accepted");
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe("analytics façade gating and queue", () => {
  it("drops events before consent instead of queueing them", () => {
    const track = vi.fn();
    (window as Win).analytics = { track };

    analytics.uploadModeSelected({ mode: "song" });
    expect(track).not.toHaveBeenCalled();
    expect(getQueuedAnalyticsCount()).toBe(0);

    setAnalyticsConsent("rejected");
    analytics.uploadModeSelected({ mode: "song" });
    expect(track).not.toHaveBeenCalled();
  });

  it("queues events after consent until window.analytics exists, then flushes in order", () => {
    setAnalyticsConsent("accepted");
    analytics.uploadModeSelected({ mode: "album" });
    analytics.mintStarted({ songId: "s1", walletAddress: "G1" });
    expect(getQueuedAnalyticsCount()).toBe(2);

    flushQueuedAnalytics(); // no tracker yet: keeps the queue
    expect(getQueuedAnalyticsCount()).toBe(2);

    const track = vi.fn();
    (window as Win).analytics = { track };
    flushQueuedAnalytics();
    expect(track.mock.calls).toEqual([
      ["upload_mode_selected", { mode: "album" }],
      ["mint_started", { songId: "s1", walletAddress: "G1" }],
    ]);
    expect(getQueuedAnalyticsCount()).toBe(0);
  });

  it("caps the queue", () => {
    setAnalyticsConsent("accepted");
    for (let i = 0; i < 80; i++) analytics.uploadModeSelected({ mode: "song" });
    expect(getQueuedAnalyticsCount()).toBe(50);
  });

  it("drops the queue if consent is withdrawn before the provider loads", () => {
    setAnalyticsConsent("accepted");
    analytics.uploadModeSelected({ mode: "song" });
    setAnalyticsConsent("rejected");

    const track = vi.fn();
    (window as Win).analytics = { track };
    flushQueuedAnalytics();
    expect(track).not.toHaveBeenCalled();
    expect(getQueuedAnalyticsCount()).toBe(0);
  });

  it("does nothing without a write key, even with consent", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "");
    setAnalyticsConsent("accepted");
    analytics.uploadModeSelected({ mode: "song" });
    expect(getQueuedAnalyticsCount()).toBe(0);
  });
});

describe("Segment stub", () => {
  it("installs a queueing stub with every snippet method", () => {
    expect(installSegmentStub(WRITE_KEY)).toBe(true);
    const stub = (window as Win).analytics as SegmentStub;

    for (const method of SEGMENT_STUB_METHODS) expect(typeof stub[method]).toBe("function");
    stub.track("mint_failed", { reason: "x" });
    expect(Array.from(stub)).toEqual([["track", "mint_failed", { reason: "x" }]]);
    expect(stub._writeKey).toBe(WRITE_KEY);
  });

  it("leaves an existing analytics.js or stub in place", () => {
    const loaded = { initialize: true, track: vi.fn() };
    (window as Win).analytics = loaded;
    expect(installSegmentStub(WRITE_KEY)).toBe(false);
    expect((window as Win).analytics).toBe(loaded);
  });

  it("builds the CDN URL for the write key", () => {
    expect(getSegmentScriptUrl("a/b")).toBe(
      "https://cdn.segment.com/analytics.js/v1/a%2Fb/analytics.min.js"
    );
  });
});

describe("AnalyticsScript", () => {
  it("loads nothing without consent", () => {
    render(<AnalyticsScript />);
    expect(screen.queryByTestId("segment-analytics")).toBeNull();
    expect((window as Win).analytics).toBeUndefined();
  });

  it("loads nothing without a write key", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "");
    setAnalyticsConsent("accepted");
    render(<AnalyticsScript />);
    expect(screen.queryByTestId("segment-analytics")).toBeNull();
  });

  it("loads the provider with next/script, sends a page view and flushes the queue", () => {
    setAnalyticsConsent("accepted");
    analytics.profileSaved({ hasImage: true, hasWebsite: false, hasTwitter: false });

    render(<AnalyticsScript />);

    const script = screen.getByTestId("segment-analytics");
    expect(script).toHaveAttribute("src", getSegmentScriptUrl(WRITE_KEY));
    expect(script).toHaveAttribute("data-strategy", "afterInteractive");

    const stub = Array.from((window as Win).analytics as SegmentStub);
    expect(stub).toEqual([
      ["page"],
      ["track", "profile_saved", { hasImage: true, hasWebsite: false, hasTwitter: false }],
    ]);
    expect(getQueuedAnalyticsCount()).toBe(0);
  });

  it("appears when the artist accepts from the banner", async () => {
    render(
      <>
        <AnalyticsConsentBanner />
        <AnalyticsScript />
      </>
    );
    expect(screen.queryByTestId("segment-analytics")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /accept analytics/i }));

    expect(screen.getByTestId("segment-analytics")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /help us improve/i })).toBeNull();
  });
});

describe("AnalyticsConsentBanner", () => {
  it("asks first-time artists and stores a decline", async () => {
    render(<AnalyticsConsentBanner />);
    expect(screen.getByRole("region", { name: /help us improve audioblocks/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /privacy settings/i })).toHaveAttribute(
      "href",
      "/dashboard/settings/preferences#analytics"
    );

    await userEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(screen.queryByRole("region")).toBeNull();
    expect(getAnalyticsConsent()).toBe("rejected");
  });

  it("stays hidden once a choice exists, under GPC, or without a write key", () => {
    setAnalyticsConsent("accepted");
    const { unmount } = render(<AnalyticsConsentBanner />);
    expect(screen.queryByRole("region")).toBeNull();
    unmount();

    localStorage.clear();
    resetAnalyticsConsentMemory();
    setGpc(true);
    const second = render(<AnalyticsConsentBanner />);
    expect(screen.queryByRole("region")).toBeNull();
    second.unmount();

    setGpc(undefined);
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "");
    render(<AnalyticsConsentBanner />);
    expect(screen.queryByRole("region")).toBeNull();
  });
});

describe("AnalyticsConsentSettings", () => {
  it("lets the artist change their choice later", async () => {
    render(<AnalyticsConsentSettings />);
    const toggle = screen.getByRole("switch", { name: /share anonymous usage analytics/i });
    expect(toggle).not.toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(/haven't chosen yet/i);

    await userEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(getAnalyticsConsent()).toBe("accepted");
    expect(screen.getByRole("status")).toHaveTextContent(/analytics are on/i);

    await userEvent.click(toggle);
    expect(getAnalyticsConsent()).toBe("rejected");
    expect(screen.getByRole("status")).toHaveTextContent(/^Analytics are off\.$/);
  });

  it("explains a GPC default and a disabled deployment", () => {
    setGpc(true);
    const { unmount } = render(<AnalyticsConsentSettings />);
    expect(screen.getByRole("status")).toHaveTextContent(/global privacy control/i);
    unmount();

    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "");
    render(<AnalyticsConsentSettings />);
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/turned off for this deployment/i);
  });

  it("reacts to a choice made in another tab", () => {
    render(<AnalyticsConsentSettings />);
    act(() => {
      localStorage.setItem(
        ANALYTICS_CONSENT_STORAGE_KEY,
        JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, status: "accepted", updatedAt: "" })
      );
      window.dispatchEvent(new StorageEvent("storage"));
    });
    expect(screen.getByRole("switch")).toBeChecked();
  });
});
