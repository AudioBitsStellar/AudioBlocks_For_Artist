"use client";

import { useEffect, useRef, useState } from "react";
import useUploadServices from "@/services/uploadService";

export const SUGGESTION_DEBOUNCE_MS = 800;
/** Below this the backend has too little to go on. */
export const MIN_TITLE_LENGTH = 3;

export interface TagSuggestions {
  tags: string[];
  genres: string[];
}

export interface TagSuggestionsState extends TagSuggestions {
  isLoading: boolean;
  /** The AI feature is off or over budget for this session: show nothing. */
  unavailable: boolean;
}

const EMPTY: TagSuggestions = { tags: [], genres: [] };

/** Budget (429) and kill-switch (503) answers mean "not now", not "try again in a second". */
function isFeatureUnavailable(error: unknown): boolean {
  const err = error as { status?: number; response?: { status?: number }; message?: string };
  const status = err?.response?.status ?? err?.status;
  const message = (err?.message ?? "").toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    status === 403 ||
    /budget|quota|disabled|kill.?switch|not enabled/.test(message)
  );
}

/**
 * AI tag and genre suggestions for a draft (#542).
 *
 * Waits until the artist stops typing, asks once per distinct title and
 * description, and never re-asks for input it already has an answer to. Any
 * failure hides the suggestions; a budget or kill-switch answer hides them for
 * the rest of the session.
 */
export function useTagSuggestions(
  title: string,
  description: string,
  enabled = true
): TagSuggestionsState {
  const { useSuggestTags } = useUploadServices();
  const { mutateAsync } = useSuggestTags();
  const [suggestions, setSuggestions] = useState<TagSuggestions>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const cache = useRef(new Map<string, TagSuggestions>());
  const latestKey = useRef("");

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const key = `${trimmedTitle}\u0000${trimmedDescription}`;
  const ready = enabled && !unavailable && trimmedTitle.length >= MIN_TITLE_LENGTH;

  useEffect(() => {
    latestKey.current = key;
    if (!ready) {
      setSuggestions(EMPTY);
      setIsLoading(false);
      return;
    }
    const cached = cache.current.get(key);
    if (cached) {
      setSuggestions(cached);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await mutateAsync({
          title: trimmedTitle,
          description: trimmedDescription,
        } as never);
        const result: TagSuggestions = {
          tags: [
            ...new Set(
              (response?.data?.tags ?? [])
                .map((tag) => String(tag).trim().toLowerCase())
                .filter(Boolean)
            ),
          ],
          genres: [
            ...new Set(
              (response?.data?.genres ?? []).map((genre) => String(genre).trim()).filter(Boolean)
            ),
          ],
        };
        cache.current.set(key, result);
        if (latestKey.current === key) setSuggestions(result);
      } catch (error) {
        if (isFeatureUnavailable(error)) setUnavailable(true);
        // Any other failure just means no suggestions for this input.
        cache.current.set(key, EMPTY);
        if (latestKey.current === key) setSuggestions(EMPTY);
      } finally {
        if (latestKey.current === key) setIsLoading(false);
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [key, ready, mutateAsync, trimmedTitle, trimmedDescription]);

  return { ...suggestions, isLoading, unavailable };
}
