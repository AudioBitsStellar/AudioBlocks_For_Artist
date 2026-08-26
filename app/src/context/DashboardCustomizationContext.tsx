"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface DashboardWidget {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface DashboardTheme {
  accentColor: string;
  cardStyle: "default" | "compact" | "spacious";
  showMetrics: boolean;
}

interface DashboardCustomizationContextValue {
  widgets: DashboardWidget[];
  theme: DashboardTheme;
  toggleWidget: (id: string) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  setTheme: (theme: Partial<DashboardTheme>) => void;
  resetToDefaults: () => void;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "overview-cards", label: "Overview KPI Cards", visible: true, order: 0 },
  { id: "earnings", label: "Earnings & Royalties", visible: true, order: 1 },
  { id: "platform-revenue", label: "Platform Revenue Breakdown", visible: true, order: 2 },
  { id: "albums", label: "My Albums", visible: true, order: 3 },
  { id: "fans-engagement", label: "Fans Engagement", visible: true, order: 4 },
  { id: "transactions", label: "Transactions", visible: true, order: 5 },
  { id: "comments", label: "Comments", visible: true, order: 6 },
];

const DEFAULT_THEME: DashboardTheme = {
  accentColor: "#D2045B",
  cardStyle: "default",
  showMetrics: true,
};

const DashboardCustomizationContext = createContext<DashboardCustomizationContextValue | null>(null);

const STORAGE_KEY = "audioblocks-dashboard-customization";

function loadSaved(): { widgets: DashboardWidget[]; theme: DashboardTheme } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToDisk(widgets: DashboardWidget[], theme: DashboardTheme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ widgets, theme }));
  } catch {
    // Storage full or blocked — silently ignore.
  }
}

export function DashboardCustomizationProvider({ children }: { children: ReactNode }) {
  const saved = loadSaved();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(
    saved?.widgets ?? DEFAULT_WIDGETS
  );
  const [theme, setThemeState] = useState<DashboardTheme>(
    saved?.theme ?? DEFAULT_THEME
  );

  const toggleWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
      saveToDisk(next, theme);
      return next;
    });
  }, [theme]);

  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    setWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const reordered = next.map((w, i) => ({ ...w, order: i }));
      saveToDisk(reordered, theme);
      return reordered;
    });
  }, [theme]);

  const setTheme = useCallback((partial: Partial<DashboardTheme>) => {
    setThemeState((prev) => {
      const next = { ...prev, ...partial };
      saveToDisk(widgets, next);
      return next;
    });
  }, [widgets]);

  const resetToDefaults = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    setThemeState(DEFAULT_THEME);
    saveToDisk(DEFAULT_WIDGETS, DEFAULT_THEME);
  }, []);

  return (
    <DashboardCustomizationContext.Provider
      value={{ widgets, theme, toggleWidget, reorderWidgets, setTheme, resetToDefaults }}
    >
      {children}
    </DashboardCustomizationContext.Provider>
  );
}

export function useDashboardCustomization(): DashboardCustomizationContextValue {
  const ctx = useContext(DashboardCustomizationContext);
  if (!ctx) throw new Error("useDashboardCustomization must be used within DashboardCustomizationProvider");
  return ctx;
}
