"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

let activeLeaveGuardCount = 0;
const leaveGuardListeners = new Set<() => void>();

function notifyLeaveGuardListeners() {
  for (const listener of leaveGuardListeners) {
    listener();
  }
}

/**
 * Returns true whenever any mounted component currently holds an active
 * leave guard (for example, an in-progress track upload or mint).
 *
 * Used by {@link SessionProvider} so session-expiry prompts or auto-redirects
 * do not interrupt an active upload (#589).
 */
export function isLeaveGuardActive(): boolean {
  return activeLeaveGuardCount > 0;
}

/** Subscribe to changes in whether any leave guard is active. */
export function subscribeLeaveGuard(listener: () => void): () => void {
  leaveGuardListeners.add(listener);
  return () => {
    leaveGuardListeners.delete(listener);
  };
}

/**
 * Guards an in-progress operation (upload, mint) against accidental leaving.
 *
 * While `active`, closing or reloading the tab triggers the browser's native
 * prompt, and clicks on in-app links are held in `pendingHref` until the
 * caller confirms with `confirmLeave` or dismisses with `cancelLeave`.
 */
export function useLeaveGuard(active: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    activeLeaveGuardCount += 1;
    notifyLeaveGuardListeners();

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.origin !== window.location.origin) return;
      if (anchor.href === window.location.href) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(anchor.href);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);

    return () => {
      activeLeaveGuardCount = Math.max(0, activeLeaveGuardCount - 1);
      notifyLeaveGuardListeners();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      setPendingHref(null);
    };
  }, [active]);

  const confirmLeave = useCallback(() => {
    if (!pendingHref) return;

    const url = new URL(pendingHref);
    setPendingHref(null);
    router.push(`${url.pathname}${url.search}${url.hash}`);
  }, [pendingHref, router]);

  const cancelLeave = useCallback(() => setPendingHref(null), []);

  return { pendingHref, confirmLeave, cancelLeave };
}
