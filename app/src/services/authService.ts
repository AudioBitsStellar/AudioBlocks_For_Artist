import { AUTH_ENDPOINTS } from "@/api/api-endpoint";
import { usePost } from "@/api/queryClient";
import { useHandleError } from "@/hooks/useToastHandler";
import { getToken, clearSession } from "@/api/axios";
import { AuthResponse, LoginEmailPayload, RegisterEmailPayload } from "@/types";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
}

// ─── Token management ───────────────────────────────────────────────────────
// A JWT is well-formed enough to trust for display/storage purposes if it has
// the header.payload.signature shape — we never verify the signature here,
// that's the backend's job on every request.
const TOKEN_STORAGE_KEY = "token";
const TOKEN_EXPIRY_STORAGE_KEY = "token_expiry";

function isWellFormedToken(token: string): boolean {
  return typeof token === "string" && token.trim().length > 0 && token.split(".").length === 3;
}

/** Persist a token (and, if given, when it expires) for later requests. */
export function storeToken(token: string, expiresInSeconds?: number): void {
  if (typeof window === "undefined" || !token) return;

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  if (expiresInSeconds !== undefined) {
    localStorage.setItem(TOKEN_EXPIRY_STORAGE_KEY, String(Date.now() + expiresInSeconds * 1000));
  } else {
    localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
  }
}

/** The current token, or null if missing/corrupted. */
export function getStoredToken(): string | null {
  const token = getToken();
  if (!token || !isWellFormedToken(token)) return null;
  return token;
}

/** False when no expiry was ever recorded — we can't tell, so assume valid. */
export function isTokenExpired(): boolean {
  if (typeof window === "undefined") return true;

  const expiry = localStorage.getItem(TOKEN_EXPIRY_STORAGE_KEY);
  if (!expiry) return false;
  return Date.now() >= Number(expiry);
}

/** Logout cleanup: clears the token, its expiry, and the auth cookie. */
export function clearTokens(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_EXPIRY_STORAGE_KEY);
  clearSession();
}

/**
 * Returns the current token if it's still valid, otherwise calls `refresh`
 * to obtain a new one. Clears everything and returns null if refresh fails.
 */
export async function refreshAccessToken(
  refresh: () => Promise<{ token: string; expiresIn?: number }>
): Promise<string | null> {
  const current = getStoredToken();
  if (current && !isTokenExpired()) return current;

  try {
    const { token, expiresIn } = await refresh();
    storeToken(token, expiresIn);
    return token;
  } catch {
    clearTokens();
    return null;
  }
}

const useAuthServices = () => {
  const handleError = useHandleError();

  const useRegisterEmail = () =>
    usePost<ApiEnvelope<never> & AuthResponse, RegisterEmailPayload>(
      AUTH_ENDPOINTS.REGISTER_EMAIL,
      {
        onError: (error) => handleError(error.message || "Failed to register."),
      }
    );

  const useLoginEmail = () =>
    usePost<ApiEnvelope<never> & AuthResponse, LoginEmailPayload>(
      AUTH_ENDPOINTS.LOGIN_EMAIL,
      {
        onError: (error) => handleError(error.message || "Failed to log in."),
      }
    );

  return { useRegisterEmail, useLoginEmail };
};

export default useAuthServices;
