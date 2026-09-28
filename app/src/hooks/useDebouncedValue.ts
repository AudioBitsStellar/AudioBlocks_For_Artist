"use client";

import { useEffect, useState } from "react";

/**
 * Returns `value` after it has stopped changing for `delayMs`.
 *
 * Used for search-as-you-type inputs so a request is issued once the user
 * pauses instead of on every keystroke (e.g. the admin artist directory from
 * issue #420). A `delayMs` of `0` returns the value on the next render, which
 * keeps the hook usable in tests without timers.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value);
      return;
    }

    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}

export default useDebouncedValue;
