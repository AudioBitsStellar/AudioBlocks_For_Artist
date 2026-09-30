"use client";

/**
 * Bottom tab bar for the dashboard on small screens (issue #422).
 *
 * The sidebar is a slide-over drawer below `md`, which means the primary
 * destinations need several taps to reach. This bar pins the five screens an
 * artist visits most, is hidden from assistive tech on `md` and up (where the
 * permanent sidebar already lists everything), and reserves space at the
 * bottom of the page so it never covers content.
 */

import { BarChart3, Home, MessageSquare, Music, Tag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { subscribeToInboxUnread } from "@/services/inboxEvents";
import { getTotalUnreadCount } from "@/services/messageService";

const items = [
  { name: "Overview", icon: Home, href: "/dashboard/overview" },
  { name: "My Music", icon: Music, href: "/dashboard/my-music" },
  { name: "Merches", icon: Tag, href: "/dashboard/merches" },
  { name: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { name: "Messages", icon: MessageSquare, href: "/dashboard/messages" },
];

const MESSAGES_HREF = "/dashboard/messages";

export default function MobileNav() {
  const pathname = usePathname() ?? "";
  // Starts at 0 so server and client render the same markup; the real count
  // is read after mount and kept live via the inbox change event (#146).
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      try {
        setUnreadCount(getTotalUnreadCount());
      } catch {
        // Keep the last known count; navigation must never break.
      }
    };
    refresh();
    return subscribeToInboxUnread(refresh);
  }, []);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface)] md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.name} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] ${
                  isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                }`}
              >
                <span className="relative">
                  <Icon size={20} aria-hidden="true" />
                  {item.href === MESSAGES_HREF && unreadCount > 0 && (
                    <span
                      data-testid="mobile-nav-unread-badge"
                      className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[9px] font-bold leading-none text-[var(--primary-contrast)]"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                      <span className="sr-only"> unread messages</span>
                    </span>
                  )}
                </span>
                <span className="truncate">{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { MobileNav };
