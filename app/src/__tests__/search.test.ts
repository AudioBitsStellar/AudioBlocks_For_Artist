import { describe, it, expect, beforeEach } from "vitest";
import {
  filterItems,
  categorizeResults,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  SearchItem,
} from "@/utils/search";

const items: SearchItem[] = [
  {
    id: "1",
    name: "Midnight Vibes",
    category: "track",
    href: "/dashboard/my-music/1",
    subtitle: "Afrobeats",
  },
  { id: "2", name: "Summer Anthology", category: "album", href: "/dashboard/my-music/albums/2" },
  { id: "3", name: "Live at Lagos", category: "event", href: "/dashboard/events/3" },
  { id: "4", name: "Artist Hoodie", category: "merch", href: "/dashboard/merches/4" },
  {
    id: "5",
    name: "Midnight Rain",
    category: "track",
    href: "/dashboard/my-music/5",
    subtitle: "R&B",
  },
];

describe("filterItems", () => {
  it("returns empty array for empty query", () => {
    expect(filterItems(items, "")).toHaveLength(0);
    expect(filterItems(items, "   ")).toHaveLength(0);
  });

  it("matches by name case-insensitively", () => {
    const results = filterItems(items, "midnight");
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.id)).toEqual(["1", "5"]);
  });

  it("matches by subtitle", () => {
    const results = filterItems(items, "afrobeats");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("returns empty array when nothing matches", () => {
    expect(filterItems(items, "xyznotfound")).toHaveLength(0);
  });
});

describe("categorizeResults", () => {
  it("groups items by category", () => {
    const categorized = categorizeResults(items);
    expect(categorized.tracks).toHaveLength(2);
    expect(categorized.albums).toHaveLength(1);
    expect(categorized.events).toHaveLength(1);
    expect(categorized.merch).toHaveLength(1);
  });

  it("returns empty arrays for categories with no matches", () => {
    const trackOnly = items.filter((i) => i.category === "track");
    const categorized = categorizeResults(trackOnly);
    expect(categorized.albums).toHaveLength(0);
    expect(categorized.events).toHaveLength(0);
    expect(categorized.merch).toHaveLength(0);
  });
});

describe("recent searches", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no searches stored", () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it("stores and retrieves recent searches", () => {
    addRecentSearch("midnight");
    addRecentSearch("summer");
    const recent = getRecentSearches();
    expect(recent[0]).toBe("summer");
    expect(recent[1]).toBe("midnight");
  });

  it("deduplicates and moves existing term to front", () => {
    addRecentSearch("midnight");
    addRecentSearch("summer");
    addRecentSearch("midnight");
    const recent = getRecentSearches();
    expect(recent[0]).toBe("midnight");
    expect(recent.filter((r) => r === "midnight")).toHaveLength(1);
  });

  it("caps history at 8 entries", () => {
    for (let i = 0; i < 10; i++) addRecentSearch(`search-${i}`);
    expect(getRecentSearches()).toHaveLength(8);
  });

  it("clears all recent searches", () => {
    addRecentSearch("midnight");
    clearRecentSearches();
    expect(getRecentSearches()).toHaveLength(0);
  });
});
