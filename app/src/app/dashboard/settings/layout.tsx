"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  DollarSign,
  Globe,
  Link2,
  Palette,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { useOptionalI18n } from "@/context/I18nContext";

const settingsNav = [
  { key: "settingsProfile", icon: User, href: "/dashboard/profile" },
  { key: "settingsNotifications", icon: Bell, href: "/dashboard/settings/notifications" },
  { key: "settingsSecurity", icon: ShieldCheck, href: "/dashboard/settings/security" },
  { key: "settingsVerification", icon: BadgeCheck, href: "/dashboard/settings/verification" },
  { key: "settingsWallet", icon: Wallet, href: "/dashboard/settings/wallet" },
  { key: "settingsLinkedAccounts", icon: Link2, href: "/dashboard/settings/linked-accounts" },
  { key: "settingsPayout", icon: DollarSign, href: "/dashboard/settings/payout" },
  { key: "settingsNetwork", icon: Globe, href: "/dashboard/settings/network" },
  { key: "settingsAppearance", icon: Palette, href: "/dashboard/settings/appearance" },
];

// English fallbacks when I18n is not yet mounted
const fallbackLabels: Record<string, string> = {
  settingsProfile: "Profile",
  settingsNotifications: "Notifications",
  settingsSecurity: "Security",
  settingsVerification: "Verification",
  settingsWallet: "Wallet",
  settingsLinkedAccounts: "Linked accounts",
  settingsPayout: "Payout",
  settingsNetwork: "Network",
  settingsAppearance: "Appearance",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const i18n = useOptionalI18n();

  // Get translated label or fallback to English
  const getLabel = (key: string): string => {
    if (i18n && i18n.t.header[key as keyof typeof i18n.t.header]) {
      return i18n.t.header[key as keyof typeof i18n.t.header];
    }
    return fallbackLabels[key] || key;
  };

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
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-border bg-surface text-text-muted hover:text-text hover:border-secondary"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {getLabel(item.key)}
            </Link>
          );
        })}
      </nav>

      <section className="space-y-6">{children}</section>
    </div>
  );
}
