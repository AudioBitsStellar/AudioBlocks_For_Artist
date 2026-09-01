import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { getCSRFToken, getCSRFTokenHeader, refreshCSRFToken } from "@/utils/csrfToken";
import { isRetryableError, calculateBackoff } from "@/utils/retry";
import { apiMonitor } from "@/utils/apiPerformanceMonitor";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get("audioblocks_jwt") || localStorage.getItem("token") || null;
}

export function clearSession(): void {
  Cookies.remove("audioblocks_jwt");
  localStorage.removeItem("token");
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
  /** High-resolution timestamp set when the request left the client (#163). */
  _perfStart?: number;
};

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

/** Records the round-trip time of one attempt with the API performance monitor. */
function recordTiming(config: TrackedConfig | undefined): void {
  if (!config || typeof config._perfStart !== "number") return;
  const endpoint = config.url ?? "unknown";
  const method = (config.method ?? "GET").toUpperCase();
  apiMonitor.record(endpoint, method, now() - config._perfStart);
}

export const createApiClient = async (): Promise<AxiosInstance> => {
  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api",
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Read the token fresh on every request, not just at client creation time,
  // so a login that happens after this module loads is picked up.
  apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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
        if (!redirecting) {
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
