"use client";

import { useEffect, useState } from "react";

export const DASHBOARD_SEARCH_EVENT = "dashboard:search";
export const KEYBOARD_SHORTCUTS_STORAGE_KEY = "dashboard-keyboard-shortcuts-enabled";

interface UseKeyboardShortcutsOptions {
  onUpload: () => void;
}

/**
 * Registers the dashboard-wide action shortcuts and persists the user's
 * enable/disable preference. Search is broadcast so the shared header can open
 * its search UI without coupling this hook to the header component.
 */
export function useKeyboardShortcuts({ onUpload }: UseKeyboardShortcutsOptions) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(KEYBOARD_SHORTCUTS_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(KEYBOARD_SHORTCUTS_STORAGE_KEY, String(enabled));
    } catch {
      // Shortcuts remain usable when browser storage is unavailable.
    }
  }, [enabled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented || event.altKey || event.shiftKey) return;
      if (!event.metaKey && !event.ctrlKey) return;

      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        window.dispatchEvent(new Event(DASHBOARD_SEARCH_EVENT));
        return;
      }

      if (key === "u") {
        event.preventDefault();
        onUpload();
        return;
      }

      if (key === "s") {
        const target = event.target;
        const form = target instanceof Element ? target.closest("form") : null;
        if (!form || !(form instanceof HTMLFormElement)) return;

        event.preventDefault();
        form.requestSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onUpload]);

  return { enabled, setEnabled };
}

export default useKeyboardShortcuts;
