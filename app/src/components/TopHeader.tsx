'use client';

import { Search, Bell, Menu, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/utils/date';
import { useRole } from '@/hooks/useRole';
import { ROLE_BADGE_STYLES, type Role } from '@/types/role';

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

export default function TopHeader({
  onMenuClick,
  sidebarOpen = false,
  userName,
  userRole,
  notificationCount,
}: TopHeaderProps) {
  const { info: roleInfo, role: contextRole } = useRole();
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [isDark, setIsDark] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
  );

  // Decide which role to render: explicit prop wins, otherwise context.
  const activeRole: Role = userRole ?? contextRole ?? roleInfo.role;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(formatDate(now, 'full'));
      setCurrentTime(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZoneName: 'short',
        }).format(now),
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const notifLabel =
    typeof notificationCount === 'number' && notificationCount > 0
      ? `Notifications and settings (${notificationCount} new)`
      : 'Notifications and settings';

  return (
    <header className="sticky top-0 z-30 bg-surface dark:bg-background flex-shrink-0 border-b border-border-subtle dark:border-border">
      {/* Main row */}
      <div className="h-16 sm:h-20 flex items-center justify-between px-4 md:px-8">

        {/* LEFT */}
        <div className="flex items-center gap-3 sm:gap-4">

          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
            className="md:hidden text-text p-1 -ml-1 rounded focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Menu size={26} />
          </button>

          {/* Welcome */}
          <div>
            <h2 className="text-text text-base sm:text-lg md:text-xl font-bold leading-tight">
              {userName ? `Welcome, ${userName}` : 'Welcome, Pete Lisk'}
            </h2>
            <p className="text-text-muted text-xs sm:text-sm mt-0.5">
              {currentDate} | {currentTime}
            </p>
          </div>
        </div>

        {/* CENTER - Search (hidden on mobile, shown md+) */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
              size={20}
            />
            <input
              type="search"
              placeholder="Search by artists, songs or albums"
              aria-label="Search"
              className="w-full bg-surface-raised dark:bg-background dark:border dark:border-border-subtle rounded-lg pl-12 pr-4 py-3 text-text placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Role badge – issue #173 */}
          <span
            data-testid="role-badge"
            data-role={activeRole}
            aria-label={`Role: ${activeRole}`}
            className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${ROLE_BADGE_STYLES[activeRole]}`}
          >
            {activeRole}
          </span>

          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            className="text-text hover:text-text-muted transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isDark ? <Sun size={22} /> : <Moon size={22} />}
          </button>

          <Link
            href="/dashboard/settings/notifications"
            aria-label={notifLabel}
            className="relative text-text hover:text-text-muted transition-colors"
          >
            <Bell size={24} strokeWidth={2} />
            {notificationCount !== null &&
              (typeof notificationCount === 'number' && notificationCount > 0 ? (
                <span
                  data-testid="notification-count"
                  className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-primary rounded-full border-2 border-surface dark:border-background text-[10px] font-bold text-text-inverted flex items-center justify-center"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              ) : (
                <span
                  data-testid="notification-dot"
                  className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-surface dark:border-background"
                />
              ))}
          </Link>

          <Link
            href="/dashboard/profile"
            aria-label="Go to profile"
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-border hover:border-border-subtle transition-colors"
          >
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-text-inverted"
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

      {/* Mobile search row (shown on sm only) */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            size={16}
          />
          <input
            type="search"
            placeholder="Search artists, songs or albums"
            aria-label="Search"
            className="w-full bg-surface-raised dark:bg-background dark:border dark:border-border-subtle rounded-lg pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </header>
  );
}
