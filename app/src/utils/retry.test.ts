import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRetryableError, calculateBackoff, withRetry } from './retry';

describe('retry utility', () => {
  describe('isRetryableError', () => {
    it('should return true for network errors (no response)', () => {
      const error = { message: 'Network Error' };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 429 (rate limit)', () => {
      const error = { response: { status: 429 } };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 503 (service unavailable)', () => {
      const error = { response: { status: 503 } };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 500 (server error)', () => {
      const error = { response: { status: 500 } };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for 400 (bad request)', () => {
      const error = { response: { status: 400 } };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 401 (unauthorized)', () => {
      const error = { response: { status: 401 } };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 403 (forbidden)', () => {
      const error = { response: { status: 403 } };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for 404 (not found)', () => {
      const error = { response: { status: 404 } };
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for other 4xx errors', () => {
      const error = { response: { status: 422 } };
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(calculateBackoff(1, 1000)).toBe(1000); // 1s
      expect(calculateBackoff(2, 1000)).toBe(2000); // 2s
      expect(calculateBackoff(3, 1000)).toBe(4000); // 4s
      expect(calculateBackoff(4, 1000)).toBe(8000); // 8s
    });

    it('should use custom base delay', () => {
      expect(calculateBackoff(1, 500)).toBe(500);
      expect(calculateBackoff(2, 500)).toBe(1000);
      expect(calculateBackoff(3, 500)).toBe(2000);
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue('success');

      const promise = withRetry(fn, { maxRetries: 2, baseDelay: 100 });
      
      // Fast-forward through first retry
      vi.advanceTimersByTime(100);
      
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue({ response: { status: 404 } });
      
      await expect(withRetry(fn)).rejects.toEqual({ response: { status: 404 } });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue({ response: { status: 503 } });
      
      const promise = withRetry(fn, { maxRetries: 2, baseDelay: 50 });
      
      // Fast-forward through all retries
      vi.advanceTimersByTime(50);
      vi.advanceTimersByTime(100);
      
      await expect(promise).rejects.toEqual({ response: { status: 503 } });
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn()
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValue('success');

      const promise = withRetry(fn, { maxRetries: 2, baseDelay: 100, onRetry });
      
      vi.advanceTimersByTime(100);
      
      await promise;
      expect(onRetry).toHaveBeenCalledWith(1, { response: { status: 429 } });
    });
  });
});
