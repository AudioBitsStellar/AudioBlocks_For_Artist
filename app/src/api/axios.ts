import axios, { AxiosError, AxiosInstance } from "axios";
import Cookies from "js-cookie";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get("audioblocks_jwt") || localStorage.getItem("token") || null;
}

function clearSession(): void {
  Cookies.remove("audioblocks_jwt");
  localStorage.removeItem("token");
}

// Normalized error shape exposed to callers / React Query
export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export function extractApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axErr = error as AxiosError<{ message?: string; error?: string; code?: string }>;
    const data = axErr.response?.data;
    return {
      status: axErr.response?.status ?? 0,
      message: data?.message ?? data?.error ?? axErr.message,
      code: data?.code,
    };
  }
  if (error instanceof Error) {
    return { status: 0, message: error.message };
  }
  return { status: 0, message: "Unknown error" };
}

// Guard against firing concurrent redirects / clears for 401
let redirecting = false;

/** Reset the in-flight redirect flag — call this in test teardown. */
export function resetRedirectState(): void {
  redirecting = false;
}

export const createApiClient = async (): Promise<AxiosInstance> => {
  const apiClient = axios.create({
    baseURL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:3000/api",
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Read the token fresh on every request, not just at client creation time,
  // so a login that happens after this module loads is picked up.
  apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401 && typeof window !== "undefined") {
        if (!redirecting) {
          redirecting = true;
          clearSession();
          window.location.href = "/login";
        }
      }
      return Promise.reject(extractApiError(error));
    }
  );

  return apiClient;
};
