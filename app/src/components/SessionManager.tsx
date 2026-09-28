"use client";

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isTokenExpired, getStoredToken, clearTokens, storeToken } from "@/services/authService";

// ─── Configuration ──────────────────────────────────────────────────────────

/** How often to check token expiry (ms) */
const CHECK_INTERVAL_MS = 60_000; // 1 minute

/** Show warning this many seconds before expiry */
const WARNING_THRESHOLD_SECONDS = 300; // 5 minutes

// ─── Types ──────────────────────────────────────────────────────────────────

interface SessionState {
  /** Whether the session is still valid */
  isValid: boolean;
  /** Seconds until session expires (null if unknown) */
  expiresIn: number | null;
  /** Whether the warning modal should be shown */
  showWarning: boolean;
}

interface SessionContextValue extends SessionState {
  /** Attempt to extend the session by refreshing the token */
  extendSession: () => Promise<void>;
  /** Log out and redirect to login */
  logout: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface SessionProviderProps {
  children: ReactNode;
  /** Called when the token needs refreshing */
  onRefreshToken?: () => Promise<{ token: string; expiresIn?: number }>;
}

export function SessionProvider({ children, onRefreshToken }: SessionProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    isValid: true,
    expiresIn: null,
    showWarning: false,
  });

  /** Get seconds until expiry from localStorage */
  const getSecondsUntilExpiry = useCallback((): number | null => {
    if (typeof window === "undefined") return null;
    const expiry = localStorage.getItem("token_expiry");
    if (!expiry) return null;
    const expiryMs = Number(expiry);
    if (isNaN(expiryMs)) return null;
    return Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
  }, []);

  /** Check session validity */
  const checkSession = useCallback(() => {
    const token = getStoredToken();
    if (!token || isTokenExpired()) {
      setState({ isValid: false, expiresIn: 0, showWarning: false });
      clearTokens();
      router.push("/login");
      return;
    }

    const expiresIn = getSecondsUntilExpiry();
    const showWarning = expiresIn !== null && expiresIn <= WARNING_THRESHOLD_SECONDS;

    setState({ isValid: true, expiresIn, showWarning });
  }, [getSecondsUntilExpiry, router]);

  /** Attempt to extend the session */
  const extendSession = useCallback(async () => {
    if (!onRefreshToken) return;

    try {
      const { token, expiresIn } = await onRefreshToken();
      storeToken(token, expiresIn);
      setState((prev) => ({ ...prev, showWarning: false }));
    } catch {
      clearTokens();
      router.push("/login");
    }
  }, [onRefreshToken, router]);

  /** Log out */
  const logout = useCallback(() => {
    clearTokens();
    setState({ isValid: false, expiresIn: 0, showWarning: false });
    router.push("/login");
  }, [router]);

  // Periodic session check
  useEffect(() => {
    checkSession();
    const interval = setInterval(checkSession, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkSession]);

  return (
    <SessionContext.Provider value={{ ...state, extendSession, logout }}>
      {children}
      {state.showWarning && (
        <SessionWarningModal
          expiresIn={state.expiresIn ?? 0}
          onExtend={extendSession}
          onLogout={logout}
        />
      )}
    </SessionContext.Provider>
  );
}

// ─── Warning Modal ──────────────────────────────────────────────────────────

interface SessionWarningModalProps {
  expiresIn: number;
  onExtend: () => void;
  onLogout: () => void;
}

function SessionWarningModal({ expiresIn, onExtend, onLogout }: SessionWarningModalProps) {
  const minutes = Math.ceil(expiresIn / 60);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-warning-title"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 id="session-warning-title" className="text-lg font-semibold text-white mb-2">
          Session Expiring Soon
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Your session will expire in {minutes} minute{minutes !== 1 ? "s" : ""}.
          Any unsaved changes may be lost.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
          <button
            onClick={onExtend}
            className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
          >
            Extend Session
          </button>
        </div>
      </div>
    </div>
  );
}
