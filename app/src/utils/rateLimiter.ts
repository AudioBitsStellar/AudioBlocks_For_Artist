// Client-side rate limiting and debounce utilities for API service calls.

// ── Debounce ─────────────────────────────────────────────────────────────────

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delayMs: number,
): T & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  function debounced(...args: Parameters<T>) {
    lastArgs = args;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...(lastArgs as Parameters<T>));
      lastArgs = null;
    }, delayMs);
  }

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs !== null) {
        fn(...lastArgs);
        lastArgs = null;
      }
    }
  };

  return debounced as T & { cancel: () => void; flush: () => void };
}

// ── Throttle ─────────────────────────────────────────────────────────────────

export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  intervalMs: number,
): T & { cancel: () => void } {
  let lastRun = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const remaining = intervalMs - (now - lastRun);

    if (remaining <= 0) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      lastRun = now;
      fn(...args);
    } else if (timer === null) {
      timer = setTimeout(() => {
        lastRun = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  }

  throttled.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return throttled as T & { cancel: () => void };
}

// ── Token-bucket rate limiter ─────────────────────────────────────────────────
// Useful for preventing bursts of API calls (e.g. search-as-you-type, upload
// progress polling) from overwhelming the backend.

export interface RateLimiterOptions {
  maxTokens: number;
  refillIntervalMs: number;
  refillAmount?: number;
}

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillAmount: number;
  private readonly refillIntervalMs: number;
  private lastRefillTime: number;

  constructor({ maxTokens, refillIntervalMs, refillAmount }: RateLimiterOptions) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillAmount = refillAmount ?? maxTokens;
    this.refillIntervalMs = refillIntervalMs;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const periods = Math.floor(elapsed / this.refillIntervalMs);
    if (periods > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + periods * this.refillAmount);
      this.lastRefillTime = now - (elapsed % this.refillIntervalMs);
    }
  }

  tryConsume(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  msUntilNextToken(): number {
    this.refill();
    if (this.tokens > 0) return 0;
    const elapsed = Date.now() - this.lastRefillTime;
    return this.refillIntervalMs - elapsed;
  }

  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }
}

// ── withRateLimit ─────────────────────────────────────────────────────────────
// Wraps an async function so that calls exceeding the rate limit are dropped
// (returning undefined) rather than queued, preventing pile-ups.

export function withRateLimit<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  fn: T,
  limiter: RateLimiter,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined> {
  return async (...args: Parameters<T>) => {
    if (!limiter.tryConsume()) return undefined;
    return fn(...args);
  };
}
