"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User } from "lucide-react";

const settingsNav = [
  { name: "Profile", icon: User, href: "/dashboard/profile" },
  { name: "Notifications", icon: Bell, href: "/dashboard/settings/notifications" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Account</p>
        <h1 className="text-3xl font-bold text-text">Settings</h1>
      </header>

      <nav
        aria-label="Settings sections"
        className="flex flex-wrap gap-2 border-b border-border-subtle pb-3"
      >
        {settingsNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-border bg-surface text-text-muted hover:text-text hover:border-secondary"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <section className="space-y-6">{children}</section>
    </div>
  );
}
