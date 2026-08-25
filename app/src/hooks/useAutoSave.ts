"use client";

import { useCallback, useEffect, useRef } from "react";

const DEBOUNCE_MS = 500;
const INTERVAL_MS = 30000;
const STORAGE_PREFIX = "draft:";

export function useAutoSave<T extends Record<string, unknown>>(
  key: string,
  data: T,
  isSubmitting: boolean
) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const dataRef = useRef(data);
  const hasRestored = useRef(false);
  const isSubmittingRef = useRef(isSubmitting);

  dataRef.current = data;
  isSubmittingRef.current = isSubmitting;

  const save = useCallback(() => {
    if (isSubmittingRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataRef.current));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, [storageKey]);

  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // silently ignore
    }
  }, [storageKey]);

  // Debounced save on data change
  useEffect(() => {
    const timer = setTimeout(save, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [save, data]);

  // Periodic save as fallback
  useEffect(() => {
    const interval = setInterval(save, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [save]);

  const restore = useCallback((): T | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as T;
      hasRestored.current = true;
      return parsed;
    } catch {
      return null;
    }
  }, [storageKey]);

  return { restore, clearSavedData, hasRestored: hasRestored.current };
}
