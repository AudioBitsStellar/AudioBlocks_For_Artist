"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { THEME_PREFERENCE_LABELS, type ThemePreference } from "@/utils/theme";

const OPTIONS: { value: ThemePreference; icon: typeof Sun; hint: string }[] = [
  {
    value: "light",
    icon: Sun,
    hint: "Always the light palette, whatever your device is set to.",
  },
  {
    value: "dark",
    icon: Moon,
    hint: "Always the dark palette, whatever your device is set to.",
  },
  {
    value: "system",
    icon: Monitor,
    hint: "Follow the light or dark setting configured on this device.",
  },
];

export default function AppearanceSettingsPage() {
  const { preference, resolvedTheme, isDark, setPreference } = useTheme();
  // The context starts on "system" and reads the stored choice after mount, so
  // showing it straight away would paint the wrong radio for a frame.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleSelect = (next: ThemePreference) => {
    setPreference(next);
    toast.success(`Appearance set to ${THEME_PREFERENCE_LABELS[next].toLowerCase()}.`);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Appearance</h2>
        <p className="text-sm text-text-muted">
          Choose how the artist portal looks. Your choice is saved on this device and applied before
          the page loads, so dark mode never flashes white.
        </p>
      </div>

      <fieldset className="rounded-2xl border border-border-subtle bg-surface p-6">
        <legend className="sr-only">Theme</legend>
        <p className="text-sm font-semibold text-text" id="theme-heading">
          Theme
        </p>
        <p className="mt-1 text-sm text-text-muted" id="theme-hint">
          Currently showing the {resolvedTheme} theme.
        </p>

        <div
          role="radiogroup"
          aria-labelledby="theme-heading"
          aria-describedby="theme-hint"
          className="mt-4 grid gap-3 sm:grid-cols-3"
        >
          {OPTIONS.map(({ value, icon: Icon, hint }) => {
            const isSelected = preference === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface-raised hover:border-secondary"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="theme-preference"
                    value={value}
                    checked={isSelected}
                    disabled={!isHydrated}
                    onChange={() => handleSelect(value)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <Icon size={16} aria-hidden="true" className="text-text-muted" />
                  <span className="text-sm font-semibold text-text">
                    {THEME_PREFERENCE_LABELS[value]}
                  </span>
                </span>
                <span className="text-xs text-text-muted">{hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <section
        aria-labelledby="theme-preview-heading"
        className="rounded-2xl border border-border-subtle bg-surface p-6"
      >
        <h3 id="theme-preview-heading" className="text-sm font-semibold text-text">
          Live preview
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          A sample card using the same tokens as the rest of the portal.
        </p>
        <div
          data-testid="theme-preview"
          data-theme-state={isDark ? "dark" : "light"}
          className="mt-4 rounded-xl border border-border bg-surface-raised p-4"
        >
          <p className="text-sm font-semibold text-text">Midnight Drive</p>
          <p className="mt-1 text-sm text-text-muted">Single · released 12 March 2026</p>
          <button
            type="button"
            className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Share track
          </button>
        </div>
      </section>
    </div>
  );
}
