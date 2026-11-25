import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getCSRFToken, getCSRFTokenHeader, refreshCSRFToken } from "@/utils/csrfToken";
import { isRetryableError, calculateBackoff } from "@/utils/retry";
import { apiMonitor } from "@/utils/apiPerformanceMonitor";
import { API_PROXY_BASE_URL, endSession } from "@/api/session";
import { newRequestId, REQUEST_ID_HEADER, requestIdFromHeaders } from "@/api/requestId";
import { clearQueryCache } from "@/api/queryClientInstance";

/**
 * Ends the browser session. The access token lives in an httpOnly cookie that
 * only the server can clear, so this asks the server to do it.
 *
 * Also drops cached dashboard data (#576) and instructs the active service
 * worker to purge its runtime cache (#582) so a sign-out or forced 401 can
 * never leave the previous artist's data behind for whoever signs in next.
 */
export function clearSession(): void {
  clearQueryCache();
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      navigator.serviceWorker.controller?.postMessage({ type: "CLEAR_RUNTIME_CACHE" });
    } catch {
      // Non-fatal: SW may not be registered or active in this environment.
    }
  }
  void endSession();
}

/**
 * Credential endpoints where a 401 means a wrong password or code. Treating it
 * as an expired session would redirect to /login in the middle of the attempt.
 */
const CREDENTIAL_PATHS = [
  "/auth/login",
  "/auth/login-email",
  "/auth/register-email",
  "/auth/2fa/validate",
  "/auth/2fa/verify",
  "/auth/2fa/disable",
];

function isCredentialRequest(url?: string): boolean {
  if (!url) return false;
  return CREDENTIAL_PATHS.includes(url.split("?")[0]);
}

// Normalized error shape exposed to callers / React Query
export class ApiError extends Error {
  status: number;
  code?: string;
  retryAfterMs?: number;

  constructor(message: string, status: number, code?: string, retryAfterMs?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

const MAX_TIMEOUT = 2_147_483_647;

/** Parse Retry-After as either delay-seconds or an HTTP date. */
export function parseRetryAfterMs(value: unknown, now: number = Date.now()): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const header = String(value).trim();
  if (!header) return undefined;

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);

  const retryAt = Date.parse(header);
  if (!Number.isFinite(retryAt)) return undefined;
  return Math.max(0, retryAt - now);
}

function formatRetryDelay(delayMs: number): string {
  if (delayMs < 1000) return "less than a second";
  const seconds = Math.ceil(delayMs / 1000);
  return seconds === 1 ? "1 second" : `${seconds} seconds`;
}

function waitForRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    const wait = (remaining: number) => {
      const currentDelay = Math.min(remaining, MAX_TIMEOUT);
      setTimeout(() => {
        const nextRemaining = remaining - currentDelay;
        if (nextRemaining > 0) wait(nextRemaining);
        else resolve();
      }, currentDelay);
    };
    wait(delayMs);
  });
}

export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axErr = error as AxiosError<{ message?: string; error?: string; code?: string }>;
    const data = axErr.response?.data;
    const status = axErr.response?.status ?? 0;
    const message = data?.message ?? data?.error ?? axErr.message;
    const code = data?.code;
    const retryAfterHeader =
      axErr.response?.headers?.["retry-after"] ?? axErr.response?.headers?.["Retry-After"];
    const retryAfterMs = status === 429 ? parseRetryAfterMs(retryAfterHeader) : undefined;
    return new ApiError(message, status, code, retryAfterMs);
  }
  if (error instanceof Error) {
    return new ApiError(error.message, 0);
  }
  return new ApiError("Unknown error", 0);
}

// Guard against firing concurrent redirects / clears for 401
let redirecting = false;

/** Reset the in-flight redirect flag — call this in test teardown. */
export function resetRedirectState(): void {
  redirecting = false;
}

/** Per-request config fields this module stamps onto the axios config. */
type TrackedConfig = InternalAxiosRequestConfig & {
  _retryCount?: number;
  /** Opt-in for automatic retry on a non-idempotent method (#574). */
  retry?: boolean;
  /** Set once a request is replayed after the proxy refreshed the session. */
  _sessionRetried?: boolean;
  /** High-resolution timestamp set when the request left the client (#163). */
  _perfStart?: number;
  /** Correlation id sent as `x-request-id`, reused across retries (OBS-04). */
  _requestId?: string;
};

const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Records the round-trip time of one attempt with the API performance monitor. */
function recordTiming(config: TrackedConfig | undefined): void {
  if (!config || typeof config._perfStart !== "number") return;
  const endpoint = config.url ?? "unknown";
  const method = (config.method ?? "GET").toUpperCase();
  apiMonitor.record(endpoint, method, now() - config._perfStart);
}

export const createApiClient = async (): Promise<AxiosInstance> => {
  // Requests go to the same-origin proxy, which attaches the httpOnly access
  // token server-side (#521). Nothing auth-related is read in the browser.
  const apiClient = axios.create({
    baseURL: API_PROXY_BASE_URL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Add CSRF token for state-changing requests
    const method = config.method?.toUpperCase();
    if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrfHeaders = getCSRFTokenHeader();
      Object.assign(config.headers, csrfHeaders);
    }

    // Stamp the start time so the response / error interceptor can measure the
    // round trip (#163). Each retry attempt is timed separately.
    (config as TrackedConfig)._perfStart = now();

    // OBS-04: one correlation id per logical request. A retry replays this
    // config, so the id it already carries is kept rather than regenerated.
    const tracked = config as TrackedConfig;
    tracked._requestId = tracked._requestId ?? newRequestId();
    if (typeof config.headers?.set === "function") {
      config.headers.set(REQUEST_ID_HEADER, tracked._requestId);
    } else {
      Object.assign(config.headers, { [REQUEST_ID_HEADER]: tracked._requestId });
    }

    return config;
  });

  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      recordTiming(response.config as TrackedConfig);

      // Handle CSRF token refresh from server
      const newCsrfToken = response.headers["x-csrf-token"] as string | undefined;
      if (newCsrfToken && typeof newCsrfToken === "string") {
        refreshCSRFToken();
      }
      return response;
    },
    async (error: AxiosError) => {
      const config = error.config as TrackedConfig | undefined;

      recordTiming(config);

      // Handle CSRF token validation errors
      if (error.response?.status === 403 && typeof window !== "undefined") {
        const errorData = error.response.data as Record<string, unknown>;
        if (
          errorData?.code === "CSRF_TOKEN_INVALID" ||
          (typeof errorData?.message === "string" && errorData.message.includes("CSRF"))
        ) {
          refreshCSRFToken();
          return Promise.reject(extractApiError(error));
        }
      }

      if (error.response?.status === 401 && typeof window !== "undefined") {
        // The proxy renewed the session but could not replay a streamed upload.
        // Replay it once; the body is re-sendable on the client.
        if (
          error.response.headers["x-session-refreshed"] === "1" &&
          config &&
          !config._sessionRetried
        ) {
          config._sessionRetried = true;
          return apiClient(config);
        }

        if (!redirecting && !isCredentialRequest(config?.url)) {
          redirecting = true;
          clearSession();
          // Preserve the page the artist was on (#575) so a sign-in returns
          // them there instead of always landing on /dashboard.
          const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?returnTo=${returnTo}`;
          // Reset flag after redirect attempt
          setTimeout(() => {
            redirecting = false;
          }, 0);
        }
      }

      // Retry logic for transient failures
      if (isRetryableError(error) && config) {
        const maxRetries = error.response?.status === 429 ? 3 : 1;
        const retryCount = config._retryCount || 0;

        if (retryCount < maxRetries) {
          config._retryCount = retryCount + 1;
          const retryAfterHeader =
            error.response?.headers?.["retry-after"] ?? error.response?.headers?.["Retry-After"];
          const retryAfterMs =
            error.response?.status === 429 ? parseRetryAfterMs(retryAfterHeader) : undefined;
          const delay = retryAfterMs ?? calculateBackoff(retryCount + 1, 1000);

          // Show toast notification for retry
          if (typeof window !== "undefined") {
            const { toast } = await import("sonner");
            if (error.response?.status === 429) {
              toast.info(`Rate limit reached. Retrying in ${formatRetryDelay(delay)}.`, {
                duration: Math.min(delay, 10_000),
              });
            } else {
              toast.info(`Retrying request... (Attempt ${retryCount + 1}/${maxRetries})`, {
                duration: delay,
              });
            }
          }

          // Wait for backoff delay
          await waitForRetry(delay);

          // Retry the request
          return apiClient(config);
        }

        if (error.response?.status === 429 && typeof window !== "undefined") {
          const retryAfterHeader =
            error.response.headers?.["retry-after"] ?? error.response.headers?.["Retry-After"];
          const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
          const message =
            retryAfterMs === undefined
              ? "Too many requests. Please try again later."
              : `Too many requests. Please try again in ${formatRetryDelay(retryAfterMs)}.`;
          const { toast } = await import("sonner");
          toast.error(message);
        }
      }

      return Promise.reject(extractApiError(error));
    }
  );

  return apiClient;
};
