"use client";

import { Search, Bell, Menu, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/utils/date";
import { useRole } from "@/hooks/useRole";
import { ROLE_BADGE_STYLES, type Role } from "@/types/role";

interface TopHeaderProps {
  onMenuClick: () => void;
  sidebarOpen?: boolean;
  /** Optional override for the displayed user name (#172 test surface). */
  userName?: string;
  /** Optional override for the displayed role. Falls back to useRole().role. */
  userRole?: Role;
  /**
   * Optional notification count (#172).
   *  - `0`            : red dot rendered next to the bell
   *  - `number > 0`   : count badge (capped at `99+`)
   *  - `null`         : no badge at all
   *  - `undefined`    : red dot (default)
   */
  notificationCount?: number | null;
}

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;

  const savedTheme = window.localStorage.getItem("theme");
  if (savedTheme === "dark") return true;
  if (savedTheme === "light") return false;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function applyThemeVariables(isDark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.dataset.theme = isDark ? "dark" : "light";

  const variables = isDark
    ? {
        "--background": "#111111",
        "--surface": "#171717",
        "--surface-raised": "#222222",
        "--border": "#3f3f46",
        "--border-subtle": "#27272a",
        "--text": "#f4f4f5",
        "--text-muted": "#a1a1aa",
        "--text-subtle": "#71717a",
        "--text-inverted": "#ffffff",
        "--secondary": "#27272a",
        "--primary": "#d2045b",
      }
    : {
        "--background": "#ffffff",
        "--surface": "#ffffff",
        "--surface-raised": "#f4f4f5",
        "--border": "#d4d4d8",
        "--border-subtle": "#e4e4e7",
        "--text": "#18181b",
        "--text-muted": "#52525b",
        "--text-subtle": "#71717a",
        "--text-inverted": "#ffffff",
        "--secondary": "#52525b",
        "--primary": "#b0004b",
      };

  Object.entries(variables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

export default function TopHeader({
  onMenuClick,
  sidebarOpen = false,
  userName,
  userRole,
  notificationCount,
}: TopHeaderProps) {
  const { info: roleInfo, role: contextRole } = useRole();
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [isDark, setIsDark] = useState(getInitialDarkMode);

  const activeRole: Role = userRole ?? contextRole ?? roleInfo.role;

  useEffect(() => {
    applyThemeVariables(isDark);
    window.localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((current) => !current);
  };

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

  const notifLabel =
    typeof notificationCount === "number" && notificationCount > 0
      ? `Notifications and settings (${notificationCount} new)`
      : "Notifications and settings";

  return (
    <header className="sticky top-0 z-30 bg-[var(--surface)] flex-shrink-0 border-b border-[var(--border-subtle)]">
      <div className="h-16 sm:h-20 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
            className="md:hidden text-[var(--text)] p-1 -ml-1 rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <Menu size={26} />
          </button>

          <div>
            <h2 className="text-[var(--text)] text-base sm:text-lg md:text-xl font-bold leading-tight">
              {userName ? `Welcome, ${userName}` : "Welcome, Pete Lisk"}
            </h2>
            <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-0.5">
              {currentDate} | {currentTime}
            </p>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              size={20}
            />
            <input
              type="search"
              placeholder="Search by artists, songs or albums"
              aria-label="Search"
              className="w-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-lg pl-12 pr-4 py-3 text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span
            data-testid="role-badge"
            data-role={activeRole}
            aria-label={`Role: ${activeRole}`}
            className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${ROLE_BADGE_STYLES[activeRole]}`}
          >
            {activeRole}
          </span>

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

          <Link
            href="/dashboard/settings/notifications"
            aria-label={notifLabel}
            className="relative text-[var(--text)] hover:text-[var(--text-muted)] transition-colors"
          >
            <Bell size={24} strokeWidth={2} aria-hidden="true" />
            {notificationCount !== null &&
              (typeof notificationCount === "number" && notificationCount > 0 ? (
                <span
                  data-testid="notification-count"
                  className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-[var(--primary)] rounded-full border-2 border-[var(--surface)] text-[10px] font-bold text-[var(--text-inverted)] flex items-center justify-center"
                >
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              ) : (
                <span
                  data-testid="notification-dot"
                  className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--primary)] rounded-full border-2 border-[var(--surface)]"
                />
              ))}
          </Link>

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
    </header>
  );
}
