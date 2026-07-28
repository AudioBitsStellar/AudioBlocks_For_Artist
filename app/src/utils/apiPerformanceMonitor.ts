/** Threshold above which a call is considered slow and logged. */
export const SLOW_THRESHOLD_MS = 2_000;

export interface PerformanceEntry {
  endpoint: string;
  method: string;
  durationMs: number;
  timestamp: number;
  slow: boolean;
}

export interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Lightweight client-side API performance monitor — closes #163.
 *
 * Usage:
 *   const result = await apiMonitor.measure('/api/albums', 'GET', () => fetchAlbums());
 *
 * Slow calls (> 2 s) are automatically logged to console.warn.
 * Call apiMonitor.logSummary() at any point to print P50/P95/P99 statistics.
 */
export class ApiPerformanceMonitor {
  private entries: PerformanceEntry[] = [];

  /**
   * Wraps an async function, records its response time, and returns the result.
   * Timing is recorded even when the wrapped call throws.
   */
  async measure<T>(endpoint: string, method: string, fn: () => Promise<T>): Promise<T> {
    const start =
      typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      const result = await fn();
      this.record(endpoint, method, performance.now() - start);
      return result;
    } catch (err) {
      this.record(endpoint, method, performance.now() - start);
      throw err;
    }
  }

  private record(endpoint: string, method: string, durationMs: number): void {
    const slow = durationMs > SLOW_THRESHOLD_MS;
    this.entries.push({
      endpoint,
      method,
      durationMs,
      timestamp: Date.now(),
      slow,
    });

    if (slow) {
      console.warn(
        `[ApiPerformance] Slow call: ${method} ${endpoint} took ${durationMs.toFixed(0)} ms (threshold: ${SLOW_THRESHOLD_MS} ms)`,
      );
    }
  }

  /** Returns P50, P95, P99 over all recorded entries, or null when empty. */
  getPercentiles(): PercentileStats | null {
    if (this.entries.length === 0) return null;

    const sorted = [...this.entries]
      .map((e) => e.durationMs)
      .sort((a, b) => a - b);

    const at = (pct: number) =>
      sorted[Math.floor((sorted.length * pct) / 100)] ?? sorted[sorted.length - 1];

    return { p50: at(50), p95: at(95), p99: at(99) };
  }

  /** Returns only the entries that exceeded the slow threshold. */
  getSlowCalls(): PerformanceEntry[] {
    return this.entries.filter((e) => e.slow);
  }

  /** Prints a summary table to the development console. */
  logSummary(): void {
    const percentiles = this.getPercentiles();
    if (!percentiles) {
      console.log('[ApiPerformance] No calls recorded yet.');
      return;
    }

    const slowCount = this.getSlowCalls().length;
    console.group('[ApiPerformance] Summary');
    console.log(`Total calls : ${this.entries.length}`);
    console.log(
      `P50: ${percentiles.p50.toFixed(0)} ms  |  P95: ${percentiles.p95.toFixed(0)} ms  |  P99: ${percentiles.p99.toFixed(0)} ms`,
    );
    console.log(`Slow calls  : ${slowCount} (>${SLOW_THRESHOLD_MS} ms)`);
    if (slowCount > 0) {
      console.table(
        this.getSlowCalls().map((e) => ({
          endpoint: e.endpoint,
          method: e.method,
          'duration (ms)': e.durationMs.toFixed(0),
        })),
      );
    }
    console.groupEnd();
  }

  /** Resets all recorded entries (useful in tests). */
  clear(): void {
    this.entries = [];
  }

  get totalCalls(): number {
    return this.entries.length;
  }
}

/** Shared singleton — import this in service files. */
export const apiMonitor = new ApiPerformanceMonitor();
