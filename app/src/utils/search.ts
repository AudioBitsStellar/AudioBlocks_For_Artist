/**
 * Global search utility for filtering across tracks, albums, events, and merch.
 * Provides type-safe search functions with fuzzy matching capabilities.
 */

import { Album } from "@/types";
import { EventItem } from "@/services/eventsService";
import { MerchItem } from "@/services/merchService";

/**
 * Represents a track/song item for search purposes
 */
export interface SearchableTrack {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  album?: string;
}

/**
 * Union type for all searchable items
 */
export type SearchableItem = SearchableTrack | Album | EventItem | MerchItem;

/**
 * Categorized search results
 */
export interface SearchResults {
  tracks: SearchableTrack[];
  albums: Album[];
  events: EventItem[];
  merch: MerchItem[];
}

/**
 * Normalizes a string for case-insensitive fuzzy matching.
 * @param str - The string to normalize
 * @returns Lowercase trimmed string
 */
function normalize(str: string | undefined): string {
  return (str || "").toLowerCase().trim();
}

/**
 * Checks if a normalized text contains all words from the query.
 * @param text - The text to search in (already normalized)
 * @param queryWords - Array of normalized query words
 * @returns True if all query words are found
 */
function matchesAllWords(text: string, queryWords: string[]): boolean {
  return queryWords.every((word) => text.includes(word));
}

/**
 * Searches tracks by title, artist, genre, or album.
 * @param tracks - Array of tracks to search
 * @param query - Search query string
 * @returns Filtered tracks matching the query
 */
export function searchTracks(
  tracks: SearchableTrack[],
  query: string
): SearchableTrack[] {
  if (!query.trim()) return tracks;

  const queryWords = normalize(query).split(/\s+/).filter(Boolean);
  
  return tracks.filter((track) => {
    const searchText = [
      normalize(track.title),
      normalize(track.artist),
      normalize(track.genre),
      normalize(track.album),
    ].join(" ");

    return matchesAllWords(searchText, queryWords);
  });
}

/**
 * Searches albums by title.
 * @param albums - Array of albums to search
 * @param query - Search query string
 * @returns Filtered albums matching the query
 */
export function searchAlbums(albums: Album[], query: string): Album[] {
  if (!query.trim()) return albums;

  const queryWords = normalize(query).split(/\s+/).filter(Boolean);

  return albums.filter((album) => {
    const searchText = normalize(album.title);
    return matchesAllWords(searchText, queryWords);
  });
}

/**
 * Searches events by title.
 * @param events - Array of events to search
 * @param query - Search query string
 * @returns Filtered events matching the query
 */
export function searchEvents(events: EventItem[], query: string): EventItem[] {
  if (!query.trim()) return events;

  const queryWords = normalize(query).split(/\s+/).filter(Boolean);

  return events.filter((event) => {
    const searchText = normalize(event.title);
    return matchesAllWords(searchText, queryWords);
  });
}

/**
 * Searches merch items by title or detail.
 * @param merchItems - Array of merch items to search
 * @param query - Search query string
 * @returns Filtered merch items matching the query
 */
export function searchMerch(
  merchItems: MerchItem[],
  query: string
): MerchItem[] {
  if (!query.trim()) return merchItems;

  const queryWords = normalize(query).split(/\s+/).filter(Boolean);

  return merchItems.filter((item) => {
    const searchText = [normalize(item.title), normalize(item.detail)].join(" ");
    return matchesAllWords(searchText, queryWords);
  });
}

/**
 * Performs a global search across all categories.
 * @param data - Object containing arrays of all searchable items
 * @param query - Search query string
 * @returns Categorized search results
 */
export function globalSearch(
  data: {
    tracks?: SearchableTrack[];
    albums?: Album[];
    events?: EventItem[];
    merch?: MerchItem[];
  },
  query: string
): SearchResults {
  return {
    tracks: searchTracks(data.tracks || [], query),
    albums: searchAlbums(data.albums || [], query),
    events: searchEvents(data.events || [], query),
    merch: searchMerch(data.merch || [], query),
  };
}

/**
 * Gets the total count of results across all categories.
 * @param results - Categorized search results
 * @returns Total number of results
 */
export function getTotalResults(results: SearchResults): number {
  return (
    results.tracks.length +
    results.albums.length +
    results.events.length +
    results.merch.length
  );
}

/**
 * LocalStorage key for recent searches
 */
const RECENT_SEARCHES_KEY = "audioBlocks:recentSearches";
const MAX_RECENT_SEARCHES = 5;

/**
 * Saves a search query to recent searches in localStorage.
 * @param query - The search query to save
 */
export function saveRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;

  try {
    const recent = getRecentSearches();
    const normalized = query.trim();
    
    // Remove if already exists (to move it to the top)
    const filtered = recent.filter((q) => q !== normalized);
    
    // Add to the beginning and limit to MAX_RECENT_SEARCHES
    const updated = [normalized, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    // Silently fail if localStorage is unavailable
    console.warn("Failed to save recent search:", error);
  }
}

/**
 * Retrieves recent searches from localStorage.
 * @returns Array of recent search queries (most recent first)
 */
export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to load recent searches:", error);
    return [];
  }
}

/**
 * Clears all recent searches from localStorage.
 */
export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.warn("Failed to clear recent searches:", error);
  }
}
