"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { useTagSuggestions } from "@/hooks/useTagSuggestions";

export interface GenreChoice {
  /** What the genre field stores. */
  value: string;
  label: string;
}

interface AiTagSuggestionsProps {
  title: string;
  description: string;
  /** The genres the form accepts. Suggestions outside this list are not offered. */
  genreOptions: readonly GenreChoice[];
  currentGenre: string;
  onAcceptGenre: (value: string) => void;
  /** Leave out when the form has no tag field: only genres are then suggested. */
  acceptedTags?: readonly string[];
  onAcceptTag?: (tag: string) => void;
  disabled?: boolean;
}

const chipClass =
  "inline-flex items-center overflow-hidden rounded-full border border-[#885FA8]/50 bg-[#885FA8]/10 text-xs text-white";
const chipButtonClass =
  "inline-flex items-center gap-1 px-2.5 py-1 hover:bg-[#885FA8]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:opacity-50";

/**
 * AI tag and genre suggestions for the upload form (#542). Nothing is applied
 * until the artist accepts a chip; each chip can also be dismissed. When the
 * AI feature is unavailable, or has nothing to offer, this renders nothing.
 */
export default function AiTagSuggestions({
  title,
  description,
  genreOptions,
  currentGenre,
  onAcceptGenre,
  acceptedTags,
  onAcceptTag,
  disabled = false,
}: AiTagSuggestionsProps) {
  const { tags, genres, isLoading, unavailable } = useTagSuggestions(title, description, !disabled);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = (key: string) => setDismissed((current) => new Set(current).add(key));

  const genreChips = genres
    .map((suggestion) =>
      genreOptions.find(
        (option) =>
          option.label.toLowerCase() === suggestion.toLowerCase() ||
          option.value.toLowerCase() === suggestion.toLowerCase()
      )
    )
    .filter((option): option is GenreChoice => !!option)
    .filter(
      (option, index, all) => all.findIndex((other) => other.value === option.value) === index
    )
    .filter((option) => option.value !== currentGenre && !dismissed.has(`genre:${option.value}`));

  const tagChips = onAcceptTag
    ? tags.filter((tag) => !acceptedTags?.includes(tag) && !dismissed.has(`tag:${tag}`))
    : [];

  if (unavailable || (!isLoading && genreChips.length === 0 && tagChips.length === 0)) return null;

  return (
    <section
      aria-label="AI suggestions"
      className="rounded-lg border border-[#2A2A2A] bg-[#111111] p-3"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#C9A7E0]">
        <Sparkles size={14} aria-hidden="true" />
        AI suggestions
        <span className="font-normal text-[#A3A3A3]">— nothing is added until you accept it</span>
      </p>
      {isLoading ? (
        <p className="mt-2 text-xs text-[#A3A3A3]" role="status">
          Looking for suggestions…
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {genreChips.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#A3A3A3]">Genre</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {genreChips.map((option) => (
                  <li key={option.value} className={chipClass}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onAcceptGenre(option.value)}
                      aria-label={`Use suggested genre ${option.label}`}
                      className={chipButtonClass}
                    >
                      <Check size={12} aria-hidden="true" />
                      {option.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(`genre:${option.value}`)}
                      aria-label={`Dismiss suggested genre ${option.label}`}
                      className={`${chipButtonClass} border-l border-[#885FA8]/40`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tagChips.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#A3A3A3]">Tags</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {tagChips.map((tag) => (
                  <li key={tag} className={chipClass}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onAcceptTag?.(tag)}
                      aria-label={`Add suggested tag ${tag}`}
                      className={chipButtonClass}
                    >
                      <Check size={12} aria-hidden="true" />#{tag}
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(`tag:${tag}`)}
                      aria-label={`Dismiss suggested tag ${tag}`}
                      className={`${chipButtonClass} border-l border-[#885FA8]/40`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export { AiTagSuggestions };
