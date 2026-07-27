import Cookies from "js-cookie";

const CSRF_TOKEN_COOKIE = "audioblocks_csrf_token";
const CSRF_TOKEN_HEADER = "X-CSRF-Token";

export function generateCSRFToken(): string {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return token;
}

export function getCSRFToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get(CSRF_TOKEN_COOKIE) || null;
}

export function setCSRFToken(token: string): void {
  if (typeof window === "undefined") return;
  Cookies.set(CSRF_TOKEN_COOKIE, token, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
}

export function refreshCSRFToken(): string {
  const newToken = generateCSRFToken();
  setCSRFToken(newToken);
  return newToken;
}

export function clearCSRFToken(): void {
  if (typeof window === "undefined") return;
  Cookies.remove(CSRF_TOKEN_COOKIE);
}

export function getCSRFTokenHeader(): Record<string, string> {
  const token = getCSRFToken();
  if (!token) {
    return {};
  }
  return {
    [CSRF_TOKEN_HEADER]: token,
  };
}

export const CSRF_HEADER_NAME = CSRF_TOKEN_HEADER;
