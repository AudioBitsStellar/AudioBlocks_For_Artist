/**
 * Global Search Modal Component
 * 
 * Provides a searchable interface for tracks, albums, events, and merch.
 * Features:
 * - Real-time filtering as you type
 * - Categorized results display
 * - Recent search history
 * - Keyboard navigation support
 * - Keyboard shortcut (Cmd/Ctrl + K) to open
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, X, Clock, Music, Disc, Calendar, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  globalSearch,
  getTotalResults,
  saveRecentSearch,
  getRecentSearches,
  clearRecentSearches,
  type SearchResults,
  type SearchableTrack,
} from "@/utils/search";
import useAlbumServices from "@/services/albumService";
import useEventsService from "@/services/eventsService";
import useMerchService from "@/services/merchService";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    tracks: [],
    albums: [],
    events: [],
    merch: [],
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch data from services
  const { data: albumsData } = useAlbumServices().useGetAlbums(isOpen);
  const { data: eventsData } = useEventsService().useGetEvents();
  const { data: merchData } = useMerchService().useGetMerches();

  // Load recent searches
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecentSearches(getRecentSearches());
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Perform search whenever query changes
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults({ tracks: [], albums: [], events: [], merch: [] });
      return;
    }

    const searchData = {
      tracks: [] as SearchableTrack[], // TODO: Add when tracks service is available
      albums: albumsData?.data || [],
      events: eventsData?.items || [],
      merch: merchData?.items || [],
    };

    const searchResults = globalSearch(searchData, query);
    setResults(searchResults);
  }, [query, albumsData, eventsData, merchData]);

  // Handle keyboard shortcuts (Escape to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      setRecentSearches(getRecentSearches());
    }
  }, []);

  const handleResultClick = useCallback(
    (type: "track" | "album" | "event" | "merch", id: string | number) => {
      const routes = {
        track: `/dashboard/music/${id}`,
        album: `/dashboard/albums/${id}`,
        event: `/dashboard/events/${id}`,
        merch: `/dashboard/merch/${id}`,
      };
      
      if (query.trim()) {
        saveRecentSearch(query);
      }
      
      router.push(routes[type]);
      onClose();
    },
    [query, router, onClose]
  );

  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    handleSearch(recentQuery);
  }, [handleSearch]);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  if (!isOpen) return null;

  const totalResults = getTotalResults(results);
  const showRecent = !query.trim() && recentSearches.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-20"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search dialog"
    >
      <div
        className="w-full max-w-2xl bg-[var(--surface)] rounded-lg shadow-2xl border border-[var(--border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-subtle)]">
          <Search
            className="text-[var(--text-muted)] flex-shrink-0"
            size={20}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by artists, songs, albums, events, or merch..."
            aria-label="Search input"
            className="flex-1 bg-transparent border-none outline-none text-[var(--text)] placeholder:text-[var(--text-subtle)] text-base"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close search"
            className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded ml-2"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto">
          {showRecent ? (
            /* Recent Searches */
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[var(--text-muted)] text-sm font-medium flex items-center gap-2">
                  <Clock size={16} aria-hidden="true" />
                  Recent Searches
                </h3>
                <button
                  onClick={handleClearRecent}
                  className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] text-xs"
                >
                  Clear
                </button>
              </div>
              <ul className="space-y-2">
                {recentSearches.map((recentQuery, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => handleRecentSearchClick(recentQuery)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-[var(--surface-raised)] text-[var(--text)] transition-colors"
                    >
                      {recentQuery}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : query.trim() && totalResults === 0 ? (
            /* No Results */
            <div className="p-8 text-center">
              <Search
                className="mx-auto mb-3 text-[var(--text-subtle)]"
                size={48}
                aria-hidden="true"
              />
              <h3 className="text-[var(--text)] font-medium mb-1">No results found</h3>
              <p className="text-[var(--text-muted)] text-sm">
                Try searching with different keywords
              </p>
            </div>
          ) : query.trim() ? (
            /* Search Results */
            <div className="divide-y divide-[var(--border-subtle)]">
              {/* Albums */}
              {results.albums.length > 0 && (
                <ResultSection
                  title="Albums"
                  icon={<Disc size={16} />}
                  count={results.albums.length}
                >
                  {results.albums.map((album) => (
                    <ResultItem
                      key={album.id}
                      title={album.title}
                      icon={<Disc size={18} />}
                      onClick={() => handleResultClick("album", album.id)}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Tracks */}
              {results.tracks.length > 0 && (
                <ResultSection
                  title="Tracks"
                  icon={<Music size={16} />}
                  count={results.tracks.length}
                >
                  {results.tracks.map((track) => (
                    <ResultItem
                      key={track.id}
                      title={track.title}
                      subtitle={track.artist}
                      icon={<Music size={18} />}
                      onClick={() => handleResultClick("track", track.id)}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Events */}
              {results.events.length > 0 && (
                <ResultSection
                  title="Events"
                  icon={<Calendar size={16} />}
                  count={results.events.length}
                >
                  {results.events.map((event) => (
                    <ResultItem
                      key={event.id}
                      title={event.title}
                      subtitle={`${event.date} • ${event.time}`}
                      icon={<Calendar size={18} />}
                      onClick={() => handleResultClick("event", event.id)}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Merch */}
              {results.merch.length > 0 && (
                <ResultSection
                  title="Merch"
                  icon={<ShoppingBag size={16} />}
                  count={results.merch.length}
                >
                  {results.merch.map((item) => (
                    <ResultItem
                      key={item.id}
                      title={item.title}
                      subtitle={item.price}
                      icon={<ShoppingBag size={18} />}
                      onClick={() => handleResultClick("merch", item.id)}
                    />
                  ))}
                </ResultSection>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[var(--surface-raised)] border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-subtle)]">
          <span>Press ESC to close</span>
          <span>
            {query.trim() && totalResults > 0 && `${totalResults} result${totalResults !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Helper Components */

interface ResultSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}

function ResultSection({ title, icon, count, children }: ResultSectionProps) {
  return (
    <div className="p-4">
      <h3 className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2">
        {icon}
        {title} ({count})
      </h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

interface ResultItemProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function ResultItem({ title, subtitle, icon, onClick }: ResultItemProps) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-[var(--surface-raised)] text-left transition-colors group"
      >
        <span className="text-[var(--text-muted)] group-hover:text-[var(--primary)]">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text)] font-medium truncate">{title}</p>
          {subtitle && (
            <p className="text-[var(--text-subtle)] text-sm truncate">{subtitle}</p>
          )}
        </div>
      </button>
    </li>
  );
}
