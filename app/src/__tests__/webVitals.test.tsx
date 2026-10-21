import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { Metric } from "web-vitals";
import { buildWebVitalsPayload, reportWebVitals } from "@/lib/webVitals";
import WebVitalsReporter from "@/components/WebVitalsReporter";

const webVitalsMocks = vi.hoisted(() => ({
  onCLS: vi.fn(),
  onFID: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

vi.mock("web-vitals", () => ({
  onCLS: webVitalsMocks.onCLS,
  onFID: webVitalsMocks.onFID,
  onLCP: webVitalsMocks.onLCP,
  onTTFB: webVitalsMocks.onTTFB,
}));

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function metric(overrides: Partial<Metric> = {}): Metric {
  return {
    name: "LCP",
    value: 1234.56,
    delta: 1234.56,
    id: "v1-123",
    rating: "good",
    navigationType: "navigate",
    entries: [],
    ...overrides,
  };
}

const originalSendBeacon = Object.getOwnPropertyDescriptor(Navigator.prototype, "sendBeacon");

describe("webVitals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (originalSendBeacon) {
      Object.defineProperty(Navigator.prototype, "sendBeacon", originalSendBeacon);
    } else {
      Reflect.deleteProperty(Navigator.prototype, "sendBeacon");
    }
  });

  it("builds a payload from the metric and current path", () => {
    const payload = buildWebVitalsPayload(metric({ name: "CLS", value: 0.1, rating: "good" }));

    expect(payload).toMatchObject({
      name: "CLS",
      value: 0.1,
      delta: 1234.56,
      id: "v1-123",
      rating: "good",
      navigationType: "navigate",
      path: window.location.pathname,
    });
    expect(typeof payload.timestamp).toBe("number");
  });

  it("logs metrics to the console in development", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    reportWebVitals(metric({ name: "TTFB", value: 200 }));

    expect(info).toHaveBeenCalledTimes(1);
    expect(info.mock.calls[0][0]).toContain("[web-vitals] TTFB");
  });

  it("logs in production when no endpoint is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    reportWebVitals(metric());

    expect(info).toHaveBeenCalledTimes(1);
  });

  it("beacons metrics to the configured endpoint in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_WEB_VITALS_ENDPOINT", "https://analytics.example.com/vitals");
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(Navigator.prototype, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });

    reportWebVitals(metric({ name: "FID", value: 12 }));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toBe("https://analytics.example.com/vitals");
    expect(await readBlob(blob)).toContain('"name":"FID"');
  });

  it("falls back to fetch when sendBeacon is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_WEB_VITALS_ENDPOINT", "https://analytics.example.com/vitals");
    Reflect.deleteProperty(Navigator.prototype, "sendBeacon");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));

    reportWebVitals(metric({ name: "LCP", value: 900 }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://analytics.example.com/vitals");
  });

  it("registers all four Core Web Vitals", async () => {
    render(<WebVitalsReporter />);

    await waitFor(() => {
      expect(webVitalsMocks.onLCP).toHaveBeenCalledTimes(1);
      expect(webVitalsMocks.onFID).toHaveBeenCalledTimes(1);
      expect(webVitalsMocks.onCLS).toHaveBeenCalledTimes(1);
      expect(webVitalsMocks.onTTFB).toHaveBeenCalledTimes(1);
    });
  });
});
