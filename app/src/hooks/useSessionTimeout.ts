"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isTokenExpired, clearTokens, getStoredToken } from "@/services/authService";

/** Minutes before expiry to show the warning modal */
const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000;

/** Polling interval to check token state */
const CHECK_INTERVAL_MS = 30_000;

interface UseSessionTimeoutOptions {
  /** Called when the user chooses to extend the session */
  onRefresh?: () => Promise<boolean>;
  /** Called when the session has expired or the user chose to log out */
  onLogout?: () => void;
}

interface UseSessionTimeoutReturn {
  /** Whether the session expiry warning modal should be visible */
  showWarning: boolean;
  /** Seconds remaining until expiry (0 when expired) */
  secondsRemaining: number;
  /** Attempt to refresh the session */
  extendSession: () => Promise<void>;
  /** Log out immediately */
  logout: () => void;
}

/**
 * Monitors the auth token and fires a warning before it expires.
 *
 * Usage:
 * ```tsx
 * const { showWarning, secondsRemaining, extendSession, logout } =
 *   useSessionTimeout({ onRefresh: refreshToken, onLogout: router.push('/login') });
 * ```
 */
export function useSessionTimeout({
  onRefresh,
  onLogout,
}: UseSessionTimeoutOptions = {}): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  // Calculate seconds remaining until token expiry
  const getSecondsRemaining = useCallback((): number => {
    if (typeof window === "undefined") return 0;
    const expiry = localStorage.getItem("token_expiry");
    if (!expiry) return Infinity;
    return Math.max(0, Math.floor((Number(expiry) - Date.now()) / 1000));
  }, []);

  // Periodic check
  useEffect(() => {
    const interval = setInterval(() => {
      const token = getStoredToken();
      if (!token) {
        setShowWarning(false);
        return;
      }

      const secs = getSecondsRemaining();
      setSecondsRemaining(secs);

      if (secs === 0 && isTokenExpired()) {
        // Token already expired — clean up and notify
        clearTokens();
        setShowWarning(false);
        onLogoutRef.current?.();
      } else if (secs > 0 && secs * 1000 <= WARNING_BEFORE_EXPIRY_MS) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [getSecondsRemaining]);

  const extendSession = useCallback(async () => {
    if (!onRefresh) return;
    const success = await onRefresh();
    if (success) {
      setShowWarning(false);
    } else {
      clearTokens();
      onLogoutRef.current?.();
    }
  }, [onRefresh]);

  const logout = useCallback(() => {
    clearTokens();
    setShowWarning(false);
    onLogoutRef.current?.();
  }, []);

  return { showWarning, secondsRemaining, extendSession, logout };
}
