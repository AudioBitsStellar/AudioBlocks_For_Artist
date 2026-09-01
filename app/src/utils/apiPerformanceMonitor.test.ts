import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ApiPerformanceMonitor,
  SLOW_THRESHOLD_MS,
  apiMonitor,
} from "./apiPerformanceMonitor";

describe("ApiPerformanceMonitor", () => {
  let monitor: ApiPerformanceMonitor;

  beforeEach(() => {
    monitor = new ApiPerformanceMonitor();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records a timing for a successful call and returns its result", async () => {
    const result = await monitor.measure("/api/albums", "GET", async () => "ok");
    expect(result).toBe("ok");
    expect(monitor.totalCalls).toBe(1);
  });

  it("still records a timing when the wrapped call throws, and re-throws", async () => {
    await expect(
      monitor.measure("/api/albums", "POST", async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(monitor.totalCalls).toBe(1);
  });

  it("does not log a fast call", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await monitor.measure("/api/fast", "GET", async () => "quick");
    expect(warn).not.toHaveBeenCalled();
  });

  it("logs a warning for a call slower than the threshold", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const nowSpy = vi.spyOn(performance, "now");
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(SLOW_THRESHOLD_MS + 500);

    await monitor.measure("/api/slow", "GET", async () => "eventually");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("/api/slow");
    expect(monitor.getSlowCalls()).toHaveLength(1);
  });

  it("computes P50 / P95 / P99 over recorded durations", async () => {
    const nowSpy = vi.spyOn(performance, "now");
    // 20 calls at 10, 20, ... 200 ms
    for (let i = 1; i <= 20; i++) {
      nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(i * 10);
      await monitor.measure(`/api/e${i}`, "GET", async () => i);
    }

    const pct = monitor.getPercentiles();
    expect(pct).not.toBeNull();
    expect(pct!.p50).toBeLessThanOrEqual(pct!.p95);
    expect(pct!.p95).toBeLessThanOrEqual(pct!.p99);
    expect(pct!.p99).toBe(200);
  });

  it("returns null percentiles before any call is recorded", () => {
    expect(monitor.getPercentiles()).toBeNull();
  });

  it("clear() empties the recorded entries", async () => {
    await monitor.measure("/api/x", "GET", async () => 1);
    monitor.clear();
    expect(monitor.totalCalls).toBe(0);
    expect(monitor.getPercentiles()).toBeNull();
  });

  it("exports a shared singleton", () => {
    expect(apiMonitor).toBeInstanceOf(ApiPerformanceMonitor);
  });
});
