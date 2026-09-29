"use client";

import React, { useState, useCallback } from "react";
import { X, Tag as TagIcon, Plus } from "lucide-react";
import { PRESET_GENRES, GenreTagSelectorProps } from "@/types/genre";

export const GenreTagSelector: React.FC<GenreTagSelectorProps> = ({
  selectedGenre,
  selectedTags,
  onGenreChange,
  onTagsChange,
  maxTags = 10,
  disabled = false,
}) => {
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addTag = useCallback(
    (tagToOffer: string) => {
      const sanitized = tagToOffer.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (!sanitized) return;

      if (selectedTags.includes(sanitized)) {
        setError(`Tag "${sanitized}" is already added.`);
        return;
      }

      if (selectedTags.length >= maxTags) {
        setError(`Maximum limit of ${maxTags} tags reached.`);
        return;
      }

      setError(null);
      onTagsChange([...selectedTags, sanitized]);
      setTagInput("");
    },
    [selectedTags, maxTags, onTagsChange]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onTagsChange(selectedTags.filter((t) => t !== tagToRemove));
      setError(null);
    },
    [selectedTags, onTagsChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary Genre Selection */}
      <div>
        <label htmlFor="primary-genre-select" className="block text-sm font-medium text-gray-200 mb-1">
          Primary Genre <span className="text-pink-500">*</span>
        </label>
        <select
          id="primary-genre-select"
          value={selectedGenre}
          onChange={(e) => onGenreChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-[#18181B] border border-gray-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:opacity-50"
        >
          <option value="">Select a genre...</option>
          {PRESET_GENRES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {/* Secondary Tags Entry */}
      <div>
        <label htmlFor="tag-input" className="block text-sm font-medium text-gray-200 mb-1">
          Tags (Max {maxTags})
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <TagIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              id="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || selectedTags.length >= maxTags}
              placeholder="Add tag and press Enter..."
              className="w-full bg-[#18181B] border border-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={() => addTag(tagInput)}
            disabled={disabled || !tagInput.trim() || selectedTags.length >= maxTags}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

        {/* Selected Tags Chips */}
        <div className="flex flex-wrap gap-2 mt-3" aria-label="Selected Tags">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 text-pink-300 rounded-full text-xs font-medium border border-pink-500/20"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                aria-label={`Remove tag ${tag}`}
                className="hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
