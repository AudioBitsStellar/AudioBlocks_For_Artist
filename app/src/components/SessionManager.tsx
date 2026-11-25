"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { refreshSession } from "@/api/session";
import { clearQueryCache } from "@/api/queryClientInstance";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import SessionWarningModal from "@/components/shared/SessionWarningModal";

interface SessionContextValue {
  /** Whether the session is still valid */
  isValid: boolean;
  /** Seconds until session expires (null if unknown) */
  expiresIn: number | null;
  /** Whether the warning modal is visible */
  showWarning: boolean;
  /** Attempt to extend the session by refreshing the token */
  extendSession: () => Promise<void>;
  /** Sign out and redirect to login */
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Single session-timeout provider mounted in the dashboard layout (#589).
 * Delegates expiry tracking and upload-guard coordination to
 * `useSessionTimeout` and renders the shared `SessionWarningModal`.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const router = useRouter();

  const handleLogoutRedirect = useCallback(() => {
    clearQueryCache(); // #576: don't leave this artist's dashboard data cached
    router.push("/login");
  }, [router]);

  const { showWarning, secondsRemaining, isRefreshing, extendSession, logout } = useSessionTimeout({
    onRefresh: refreshSession,
    onLogout: handleLogoutRedirect,
  });

  const isValid = secondsRemaining === null || secondsRemaining > 0;

  return (
    <SessionContext.Provider
      value={{
        isValid,
        expiresIn: secondsRemaining,
        showWarning,
        extendSession,
        logout,
      }}
    >
      {children}
      <SessionWarningModal
        isOpen={showWarning}
        secondsRemaining={secondsRemaining ?? 0}
        isRefreshing={isRefreshing}
        onExtend={extendSession}
        onLogout={logout}
      />
    </SessionContext.Provider>
  );
}
