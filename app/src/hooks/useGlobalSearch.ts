'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SearchItem,
  CategorizedResults,
  filterItems,
  categorizeResults,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from '@/utils/search';

export interface UseGlobalSearchOptions {
  items: SearchItem[];
  /** Debounce delay in ms (default 200). */
  debounceMs?: number;
}

export interface UseGlobalSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: CategorizedResults;
  recentSearches: string[];
  hasResults: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  selectResult: (item: SearchItem) => void;
  clearRecent: () => void;
}

const EMPTY_RESULTS: CategorizedResults = {
  tracks: [],
  albums: [],
  events: [],
  merch: [],
};

export function useGlobalSearch({
  items,
  debounceMs = 200,
}: UseGlobalSearchOptions): UseGlobalSearchReturn {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<CategorizedResults>(EMPTY_RESULTS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const filtered = filterItems(items, q);
        setResults(q.trim() ? categorizeResults(filtered) : EMPTY_RESULTS);
      }, debounceMs);
    },
    [items, debounceMs],
  );

  const hasResults = Object.values(results).some((arr) => arr.length > 0);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQueryState('');
    setResults(EMPTY_RESULTS);
  }, []);

  const selectResult = useCallback((item: SearchItem) => {
    addRecentSearch(item.name);
    setRecentSearches(getRecentSearches());
    close();
  }, [close]);

  const clearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    recentSearches,
    hasResults,
    isOpen,
    open,
    close,
    selectResult,
    clearRecent,
  };
}
