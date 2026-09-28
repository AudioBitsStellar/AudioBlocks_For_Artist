"use client";

import {
  Music,
  Calendar,
  Tag,
  Settings as SettingsIcon,
  Star,
  Home,
  X,
  BarChart3,
  MessageSquare,
  ShieldAlert,
  Users,
  Search,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getTotalUnreadCount } from "@/services/messageService";
import { isAdminSession } from "@/utils/jwt";

const navItems = [
  { name: "Overview", icon: Home, href: "/dashboard/overview" },
  { name: "My Music", icon: Music, href: "/dashboard/my-music" },
  { name: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { name: "Payouts", icon: Wallet, href: "/dashboard/payouts" },
  { name: "Events", icon: Calendar, href: "/dashboard/events" },
  { name: "Merches", icon: Tag, href: "/dashboard/merches" },
  { name: "Messages", icon: MessageSquare, href: "/dashboard/messages" },
  { name: "Collaborators", icon: Users, href: "/dashboard/collaborators" },
  { name: "Moderation", icon: ShieldAlert, href: "/dashboard/moderation" },
  { name: "Premium", icon: Star, href: "/dashboard/premium" },
  { name: "Settings", icon: SettingsIcon, href: "/dashboard/settings/notifications" },
];

/** Admin-only surfaces, appended to the nav for admin sessions (#420). */
const adminNavItems = [{ name: "Artist Search", icon: Search, href: "/admin/artists" }];

const legalLinks = [
  { name: "Privacy Center", href: "/privacy-center" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Cookies", href: "/cookies" },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  // Read after mount: the session token lives in cookies/localStorage, so the
  // admin role cannot be resolved during SSR.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(isAdminSession());
  }, []);

  const visibleNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleNavKeyDown = (event: React.KeyboardEvent<HTMLElement>, index: number) => {
    const total = visibleNavItems.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (index + 1) % total;
      navItemRefs.current[next]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const previous = (index - 1 + total) % total;
      navItemRefs.current[previous]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      navItemRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      navItemRefs.current[total - 1]?.focus();
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="sidebar-nav"
        role={open ? "dialog" : "navigation"}
        aria-modal={open ? true : undefined}
        aria-label="Sidebar navigation"
        className={`fixed left-0 top-0 z-50 flex h-full w-64 transform flex-col border-r border-transparent bg-surface transition-transform duration-300 ease-in-out dark:border-border-subtle dark:bg-background md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 md:hidden">
          <Image src="/logo.png" alt="AudioBlocks Logo" width={90} height={50} />
          <button
            type="button"
            className="cursor-pointer rounded-lg p-2 text-text hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X className="text-text" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden p-9 md:flex">
          <Link
            href="/"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="AudioBlocks Home"
          >
            <Image src="/logo.png" alt="AudioBlocks Logo" width={99} height={54} />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
          {visibleNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const unread = item.href === "/dashboard/messages" ? getTotalUnreadCount() : 0;

            return (
              <Link
                key={item.name}
                href={item.href}
                ref={(element) => {
                  navItemRefs.current[index] = element;
                }}
                onClick={() => {
                  analytics.navItemClicked({ item: item.name, href: item.href });
                  onClose();
                }}
                onKeyDown={(event) => handleNavKeyDown(event, index)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-text-muted hover:bg-surface-raised hover:text-text"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span className={`flex-1 ${isActive ? "font-medium" : ""}`}>{item.name}</span>
                {unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-contrast">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 p-4" aria-label="Legal links">
          {legalLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={onClose}
              className="block rounded-lg px-4 py-1 text-xs text-text-muted transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}

export { Sidebar };
