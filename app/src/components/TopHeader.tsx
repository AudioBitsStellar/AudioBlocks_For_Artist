"use client";

import { Search, Menu, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/utils/date";
import { useRole } from "@/hooks/useRole";
import { DASHBOARD_SEARCH_EVENT } from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "@/context/ThemeContext";
import { ROLE_BADGE_STYLES, type Role } from "@/types/role";
import SearchModal from "./SearchModal";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell from "./NotificationBell";

interface TopHeaderProps {
  onMenuClick: () => void;
  sidebarOpen?: boolean;
  /** Optional override for the displayed user name (#172 test surface). */
  userName?: string;
  /** Optional override for the displayed role. Falls back to useRole().role. */
  userRole?: Role;
  /**
   * Optional notification badge override (#172). Defaults to the live unread
   * count from the notification dropdown.
   *  - `0`            : red dot rendered next to the bell
   *  - `number > 0`   : count badge (capped at `99+`)
   *  - `null`         : no badge at all
   */
  notificationCount?: number | null;
}

export default function TopHeader({
  onMenuClick,
  sidebarOpen = false,
  userName,
  userRole,
  notificationCount,
}: TopHeaderProps) {
  const { info: roleInfo, role: contextRole } = useRole();
  const { isDark, toggleTheme } = useTheme();
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const activeRole: Role = userRole ?? contextRole ?? roleInfo.role;

  // The dashboard shortcut hook broadcasts search requests to the shared header.
  useEffect(() => {
    const openSearch = () => setIsSearchOpen(true);
    window.addEventListener(DASHBOARD_SEARCH_EVENT, openSearch);
    return () => window.removeEventListener(DASHBOARD_SEARCH_EVENT, openSearch);
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(formatDate(now, "full"));
      setCurrentTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZoneName: "short",
        }).format(now)
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[var(--surface)] flex-shrink-0 border-b border-[var(--border-subtle)]">
      <div className="h-16 sm:h-20 flex items-center justify-between px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
            className="md:hidden text-[var(--text)] p-1 -ml-1 rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <Menu size={26} />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-[var(--text)] text-base sm:text-lg md:text-xl font-bold leading-tight">
              {userName ? `Welcome, ${userName}` : "Welcome, Pete Lisk"}
            </h2>
            {/* The time is dropped on the narrowest screens so the date never
                wraps and pushes the header taller than h-16. */}
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)] sm:text-sm">
              {currentDate}
              <span className="hidden sm:inline"> | {currentTime}</span>
            </p>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="relative w-full group"
            aria-label="Open search (⌘/Ctrl+K)"
            title="Search (⌘/Ctrl+K)"
          >
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors"
              size={20}
              aria-hidden="true"
            />
            <div className="w-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-lg pl-12 pr-4 py-3 text-[var(--text-subtle)] text-left group-hover:border-[var(--border)] transition-colors cursor-pointer">
              Search by artists, songs or albums
            </div>
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-1 px-2 py-1 bg-[var(--surface)] border border-[var(--border-subtle)] rounded text-[10px] text-[var(--text-subtle)] font-mono">
              <span>⌘ / Ctrl</span>K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher />

          <span
            data-testid="role-badge"
            data-role={activeRole}
            aria-label={`Role: ${activeRole}`}
            className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${ROLE_BADGE_STYLES[activeRole]}`}
          >
            {activeRole}
          </span>

          {/* Quick light/dark switch (#423). The full three-way choice lives in
              Settings → Appearance, which can also follow the OS. */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDark}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="text-[var(--text)] hover:text-[var(--text-muted)] transition-colors rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {isDark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
          </button>

          <NotificationBell notificationCount={notificationCount} />

          {/* The full-width search field is md+, so phones get an icon button
              (issue #422) to reach the same modal. Deliberately named "Search"
              rather than "Open search" so the two triggers stay individually
              addressable by accessible name. */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            title="Search"
            className="rounded p-1 text-[var(--text)] transition-colors hover:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] md:hidden"
          >
            <Search size={22} aria-hidden="true" />
          </button>

          <Link
            href="/dashboard/profile"
            aria-label="Go to profile"
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-[var(--border)] hover:border-[var(--border-subtle)] transition-colors"
          >
            <div className="w-full h-full bg-[var(--secondary)] flex items-center justify-center">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[var(--text-inverted)]"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}

export { TopHeader };
