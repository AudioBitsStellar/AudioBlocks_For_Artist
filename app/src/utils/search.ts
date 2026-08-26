export type SearchCategory = "track" | "album" | "event" | "merch";

export interface SearchItem {
  id: string;
  name: string;
  category: SearchCategory;
  href: string;
  subtitle?: string;
}

export interface CategorizedResults {
  tracks: SearchItem[];
  albums: SearchItem[];
  events: SearchItem[];
  merch: SearchItem[];
}

const RECENT_SEARCHES_KEY = "audioblocks_recent_searches";
const MAX_RECENT = 8;

/** Filter items by query string (case-insensitive name/subtitle match). */
export function filterItems(items: SearchItem[], query: string): SearchItem[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return items.filter(
    (item) => item.name.toLowerCase().includes(q) || (item.subtitle ?? "").toLowerCase().includes(q)
  );
}

/** Group a flat list of SearchItems into CategorizedResults. */
export function categorizeResults(items: SearchItem[]): CategorizedResults {
  return {
    tracks: items.filter((i) => i.category === "track"),
    albums: items.filter((i) => i.category === "album"),
    events: items.filter((i) => i.category === "event"),
    merch: items.filter((i) => i.category === "merch"),
  };
}

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  const existing = getRecentSearches().filter((q) => q !== query);
  const updated = [query, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

export function clearRecentSearches(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }
}
