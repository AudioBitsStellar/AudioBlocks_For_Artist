import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getCSRFToken, getCSRFTokenHeader, refreshCSRFToken } from "@/utils/csrfToken";
import { isRetryableError, calculateBackoff } from "@/utils/retry";
import { apiMonitor } from "@/utils/apiPerformanceMonitor";
import { API_PROXY_BASE_URL, endSession } from "@/api/session";

/**
 * Ends the browser session. The access token lives in an httpOnly cookie that
 * only the server can clear, so this asks the server to do it.
 */
export function clearSession(): void {
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

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axErr = error as AxiosError<{ message?: string; error?: string; code?: string }>;
    const data = axErr.response?.data;
    const status = axErr.response?.status ?? 0;
    const message = data?.message ?? data?.error ?? axErr.message;
    const code = data?.code;
    return new ApiError(message, status, code);
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
  _retry?: number;
  _retryCount?: number;
  /** Set once a request is replayed after the proxy refreshed the session. */
  _sessionRetried?: boolean;
  /** High-resolution timestamp set when the request left the client (#163). */
  _perfStart?: number;
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
        if (error.response.headers["x-session-refreshed"] === "1" && config && !config._sessionRetried) {
          config._sessionRetried = true;
          return apiClient(config);
        }

        if (!redirecting && !isCredentialRequest(config?.url)) {
          redirecting = true;
          clearSession();
          window.location.href = "/login";
          // Reset flag after redirect attempt
          setTimeout(() => {
            redirecting = false;
          }, 0);
        }
      }

      // Retry logic for transient failures
      if (isRetryableError(error) && config && !config._retry) {
        config._retry = true;
        const maxRetries = 3;
        const retryCount = config._retryCount || 0;

        if (retryCount < maxRetries) {
          config._retryCount = retryCount + 1;
          const delay = calculateBackoff(retryCount + 1, 1000);

          // Show toast notification for retry
          if (typeof window !== "undefined") {
            const { toast } = await import("sonner");
            toast.info(`Retrying request... (Attempt ${retryCount + 1}/${maxRetries})`, {
              duration: delay,
            });
          }

          // Wait for backoff delay
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Retry the request
          return apiClient(config);
        }
      }

      return Promise.reject(extractApiError(error));
    }
  );

  return apiClient;
};
