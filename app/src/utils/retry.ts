import { toast } from 'sonner';

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Determines if an error is retryable based on its type and status code.
 * 
 * Retryable errors:
 * - Network errors (no response)
 * - 429 (Rate Limit)
 * - 503 (Service Unavailable)
 * 
 * Non-retryable errors:
 * - 400 (Bad Request)
 * - 401 (Unauthorized)
 * - 403 (Forbidden)
 * - 404 (Not Found)
 * - Other 4xx client errors
 */
export function isRetryableError(error: Error): boolean {
  const httpError = error as { response?: { status: number } };
  // Network errors (no response) are retryable
  if (!httpError.response) {
    return true;
  }

  const status = httpError.response?.status;

  // Retry on rate limit (429) and service unavailable (503)
  if (status === 429 || status === 503) {
    return true;
  }

  // Do not retry on client errors (4xx except 429)
  if (status >= 400 && status < 500 && status !== 429) {
    return false;
  }

  // Retry on 5xx server errors (except those explicitly handled)
  if (status >= 500) {
    return true;
  }

  return false;
}

/**
 * Calculates exponential backoff delay for a given attempt.
 * Uses the formula: baseDelay * (2 ^ (attempt - 1))
 * 
 * @param attempt - Current retry attempt (1-indexed)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @returns Delay in milliseconds
 */
export function calculateBackoff(attempt: number, baseDelay: number = 1000): number {
  return baseDelay * Math.pow(2, attempt - 1);
}

/**
 * Executes a function with automatic retry logic and exponential backoff.
 * 
 * @param fn - The async function to execute
 * @param config - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onRetry,
  } = config;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If this is not a retryable error, throw immediately
      if (!isRetryableError(error)) {
        throw lastError;
      }

      // If we've exhausted all retries, throw the last error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt + 1, baseDelay);

      // Show toast notification for retry
      toast.info(`Retrying... (Attempt ${attempt + 1}/${maxRetries})`, {
        duration: delay,
      });

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait for the backoff delay
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}
