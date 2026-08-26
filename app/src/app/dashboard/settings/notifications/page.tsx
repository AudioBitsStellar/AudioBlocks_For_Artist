"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_EVENT_LABELS,
  type NotificationPreferences,
  type NotificationEventKey,
  type NotificationChannel,
  persistPreferencesToProfile,
} from "@/services/notificationPreferences";

type ToggleKey = `${NotificationEventKey}.${NotificationChannel}`;

function prefsEqual(a: NotificationPreferences, b: NotificationPreferences): boolean {
  return (Object.keys(a) as NotificationEventKey[]).every(
    (key) => a[key].email === b[key].email && a[key].inApp === b[key].inApp
  );
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success">("idle");
  const firstToggleRef = useRef<HTMLInputElement>(null);

  // Hydrate from localStorage on mount (SSR-safe). Done once so we always
  // paint the same defaults server- and client-side, then upgrade.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("audioblocks:notification-preferences:v1");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
        setPrefs({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed });
      }
    } catch {
      // ignore – keep defaults
    }
    setIsHydrated(true);
  }, []);

  const isDirty = useMemo(() => !prefsEqual(prefs, DEFAULT_NOTIFICATION_PREFERENCES), [prefs]);

  const handleToggle = (event: NotificationEventKey, channel: NotificationChannel) => {
    setPrefs((prev) => ({
      ...prev,
      [event]: { ...prev[event], [channel]: !prev[event][channel] },
    }));
  };

  const handleReset = () => {
    setPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
    // Clear any "saved" announcement so it can't linger after a Reset.
    setSaveStatus("idle");
    // Move focus to the first toggle so screen readers announce the reset.
    firstToggleRef.current?.focus();
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side validation: at least one channel enabled per event makes
    // sense — if none is enabled, focus the first toggle and announce it.
    const allDisabled = (Object.keys(prefs) as NotificationEventKey[]).every(
      (key) => !prefs[key].email && !prefs[key].inApp
    );
    if (allDisabled) {
      firstToggleRef.current?.focus();
      toast.error("Enable at least one channel for each event.");
      return;
    }

    if (!isDirty) {
      toast.info("No changes to save.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const result = await persistPreferencesToProfile(prefs);
      if (!result.success) throw new Error("Save rejected by profile service.");
      setSaveStatus("success");
      toast.success("Notification preferences saved.");
    } catch (err) {
      toast.error("Failed to save preferences. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const eventKeys = Object.keys(NOTIFICATION_EVENT_LABELS) as NotificationEventKey[];

  return (
    <form
      onSubmit={handleSave}
      className="space-y-8"
      aria-labelledby="notification-prefs-heading"
      noValidate
    >
      <div className="space-y-4">
        <div>
          <h2 id="notification-prefs-heading" className="text-xl font-semibold text-text">
            Notification preferences
          </h2>
          <p className="text-sm text-text-muted">
            Choose how you want to hear from us for each kind of event. Changes are saved locally so
            you don't lose them on this device.
          </p>
        </div>

        <div
          role="group"
          aria-label="Notification channels table"
          className="rounded-2xl border border-border-subtle bg-surface"
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-subtle text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th scope="col" className="px-6 py-4">
                  Event
                </th>
                <th scope="col" className="px-6 py-4 text-center">
                  Email
                </th>
                <th scope="col" className="px-6 py-4 text-center">
                  In-app
                </th>
              </tr>
            </thead>
            <tbody>
              {eventKeys.map((key, eventIndex) => {
                const label = NOTIFICATION_EVENT_LABELS[key];
                const emailId: ToggleKey = `${key}.email`;
                const inAppId: ToggleKey = `${key}.inApp`;
                return (
                  <tr key={key} className="border-b border-border-subtle last:border-b-0">
                    <th scope="row" className="px-6 py-5 align-top">
                      <div className="font-semibold text-text">{label.title}</div>
                      <p className="font-normal text-text-muted">{label.description}</p>
                    </th>
                    <td className="px-6 py-5 text-center">
                      <label
                        htmlFor={emailId}
                        className="inline-flex cursor-pointer items-center justify-center rounded-full focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface"
                      >
                        <input
                          ref={eventIndex === 0 ? firstToggleRef : undefined}
                          id={emailId}
                          name={emailId}
                          type="checkbox"
                          role="switch"
                          aria-label={`Email notifications for ${label.title}`}
                          aria-describedby={`${emailId}-hint`}
                          checked={prefs[key].email}
                          onChange={() => handleToggle(key, "email")}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`relative inline-block h-6 w-11 rounded-full border transition-colors ${
                            prefs[key].email
                              ? "border-primary bg-primary"
                              : "border-border bg-surface-raised"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 inline-block h-5 w-5 transform rounded-full bg-primary-contrast transition-transform ${
                              prefs[key].email ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </label>
                      <span id={`${emailId}-hint`} className="sr-only">
                        Toggle email delivery for {label.title}.
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <label
                        htmlFor={inAppId}
                        className="inline-flex cursor-pointer items-center justify-center rounded-full focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface"
                      >
                        <input
                          id={inAppId}
                          name={inAppId}
                          type="checkbox"
                          role="switch"
                          aria-label={`In-app notifications for ${label.title}`}
                          aria-describedby={`${inAppId}-hint`}
                          checked={prefs[key].inApp}
                          onChange={() => handleToggle(key, "inApp")}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`relative inline-block h-6 w-11 rounded-full border transition-colors ${
                            prefs[key].inApp
                              ? "border-primary bg-primary"
                              : "border-border bg-surface-raised"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 inline-block h-5 w-5 transform rounded-full bg-primary-contrast transition-transform ${
                              prefs[key].inApp ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </label>
                      <span id={`${inAppId}-hint`} className="sr-only">
                        Toggle in-app alerts for {label.title}.
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p aria-live="polite" className="text-xs text-text-muted">
            {isHydrated ? (isDirty ? "Unsaved changes." : "Up to date.") : "Loading preferences…"}
          </p>
          {saveStatus === "success" && (
            <p role="status" aria-live="polite" className="text-xs font-semibold text-success">
              Preferences saved successfully.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text"
          >
            Reset to defaults
          </button>
          <button
            type="submit"
            disabled={!isDirty || isSaving}
            aria-disabled={!isDirty || isSaving}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-contrast shadow-[0_8px_24px_rgba(210,4,91,0.35)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </div>
    </form>
  );
}
