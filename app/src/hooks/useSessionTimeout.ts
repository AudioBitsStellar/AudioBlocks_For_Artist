"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { endSession } from "@/api/session";
import { getSessionExpiryMs } from "@/utils/jwt";
import { isLeaveGuardActive, subscribeLeaveGuard } from "@/hooks/useLeaveGuard";

/** Show the warning modal 2 minutes before expiry (#589). */
export const WARNING_BEFORE_EXPIRY_MS = 2 * 60 * 1000;

/** Tick interval so the countdown updates smoothly each second. */
export const CHECK_INTERVAL_MS = 1_000;

export interface UseSessionTimeoutOptions {
  /** Called when the user chooses "Stay signed in" or a silent refresh runs during an upload. */
  onRefresh?: () => Promise<boolean>;
  /** Called when the session has expired or the user chose "Sign out". */
  onLogout?: () => void;
  /** Override warning threshold in ms (defaults to 2 minutes). */
  warningBeforeExpiryMs?: number;
}

export interface UseSessionTimeoutReturn {
  /** Whether the session expiry warning modal should be visible. */
  showWarning: boolean;
  /** Seconds remaining until expiry (0 when expired, null when unknown). */
  secondsRemaining: number | null;
  /** Whether a token refresh is currently in flight. */
  isRefreshing: boolean;
  /** Attempt to refresh the session; signs out if refresh fails. */
  extendSession: () => Promise<void>;
  /** Sign out immediately. */
  logout: () => void;
}

/**
 * Monitors the active session expiry (JWT `exp` claim with `token_expiry`
 * fallback), surfaces a live countdown warning ~2 minutes before expiry, and
 * defers interruption while a `useLeaveGuard` upload/mint is in progress.
 */
export function useSessionTimeout({
  onRefresh,
  onLogout,
  warningBeforeExpiryMs = WARNING_BEFORE_EXPIRY_MS,
}: UseSessionTimeoutOptions = {}): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefreshRef = useRef(onRefresh);
  const onLogoutRef = useRef(onLogout);
  const silentRefreshAttemptedForExpRef = useRef<number | null>(null);
  const expiredHandledRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
    onLogoutRef.current = onLogout;
  }, [onRefresh, onLogout]);

  const evaluate = useCallback(() => {
    if (typeof window === "undefined") return;

    const expiresAt = getSessionExpiryMs();
    if (expiresAt === null) {
      setShowWarning(false);
      setSecondsRemaining(null);
      expiredHandledRef.current = false;
      return;
    }

    const remainingMs = Math.max(0, expiresAt - Date.now());
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    setSecondsRemaining(remainingSeconds);

    // Coordinate with useLeaveGuard so active uploads/mints are never interrupted.
    if (isLeaveGuardActive()) {
      setShowWarning(false);
      if (
        remainingMs <= warningBeforeExpiryMs &&
        onRefreshRef.current &&
        silentRefreshAttemptedForExpRef.current !== expiresAt
      ) {
        silentRefreshAttemptedForExpRef.current = expiresAt;
        void onRefreshRef.current();
      }
      return;
    }

    if (remainingMs <= 0) {
      setShowWarning(false);
      if (!expiredHandledRef.current) {
        expiredHandledRef.current = true;
        void endSession();
        onLogoutRef.current?.();
      }
      return;
    }

    expiredHandledRef.current = false;
    setShowWarning(remainingMs <= warningBeforeExpiryMs);
  }, [warningBeforeExpiryMs]);

  useEffect(() => {
    evaluate();
    const interval = setInterval(evaluate, CHECK_INTERVAL_MS);
    const unsubscribeGuard = subscribeLeaveGuard(evaluate);
    return () => {
      clearInterval(interval);
      unsubscribeGuard();
    };
  }, [evaluate]);

  const extendSession = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const success = onRefreshRef.current ? await onRefreshRef.current() : false;
      if (success) {
        silentRefreshAttemptedForExpRef.current = null;
        expiredHandledRef.current = false;
        setShowWarning(false);
        evaluate();
      } else {
        setShowWarning(false);
        void endSession();
        onLogoutRef.current?.();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [evaluate]);

  const logout = useCallback(() => {
    setShowWarning(false);
    void endSession();
    onLogoutRef.current?.();
  }, []);

  return { showWarning, secondsRemaining, isRefreshing, extendSession, logout };
}
