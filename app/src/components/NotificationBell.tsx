"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, CheckCheck, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { formatDate } from "@/utils/date";
import type { NotificationEventKey } from "@/services/notificationPreferences";
import { useNotifications, type ArtistNotification } from "@/services/notificationService";
import MockDataBadge from "./MockDataBadge";

interface NotificationBellProps {
  /**
   * Optional badge override (#172). When omitted the badge shows the live
   * unread count.
   *  - `0`            : red dot rendered next to the bell
   *  - `number > 0`   : count badge (capped at `99+`)
   *  - `null`         : no badge at all
   */
  notificationCount?: number | null;
}

const KIND_ICONS: Record<NotificationEventKey, LucideIcon> = {
  newFan: UserPlus,
  earnings: Wallet,
  eventReminder: CalendarClock,
};

export default function NotificationBell({ notificationCount }: NotificationBellProps) {
  const { notifications, unreadCount, isLoading, isError, refetch, markAsRead, markAllAsRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const headingId = useId();

  const badgeCount = notificationCount === undefined ? unreadCount : notificationCount;

  useEffect(() => {
    if (!isOpen) return;

    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const buttonLabel =
    typeof badgeCount === "number" && badgeCount > 0
      ? `Notifications (${badgeCount} unread)`
      : "Notifications";

  const handleSelect = (notification: ArtistNotification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.href) setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={buttonLabel}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="relative block text-[var(--text)] hover:text-[var(--text-muted)] transition-colors rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <Bell size={24} strokeWidth={2} aria-hidden="true" />
        {badgeCount !== null &&
          (badgeCount > 0 ? (
            <span
              data-testid="notification-count"
              className="absolute -top-0.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[var(--primary)] rounded-full border-2 border-[var(--surface)] text-[10px] font-bold text-[var(--text-inverted)] flex items-center justify-center"
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : (
            notificationCount === 0 && (
              <span
                data-testid="notification-dot"
                className="absolute top-0 right-0 w-3 h-3 bg-[var(--primary)] rounded-full border-2 border-[var(--surface)]"
              />
            )
          ))}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          tabIndex={-1}
          className="absolute right-0 top-full mt-3 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-2xl focus:outline-none"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3
              id={headingId}
              className="flex items-center text-sm font-semibold text-[var(--text)]"
            >
              Notifications
              <MockDataBadge label="notifications" />
            </h3>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] rounded px-1 py-0.5 hover:underline disabled:text-[var(--text-subtle)] disabled:no-underline disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <CheckCheck size={14} aria-hidden="true" />
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p role="status" className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                Loading notifications…
              </p>
            ) : isError ? (
              <div role="alert" className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                <p>Couldn&apos;t load notifications.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 text-[var(--primary)] font-medium hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul aria-label="Notification list">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <NotificationItem notification={notification} onSelect={handleSelect} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-3 border-t border-[var(--border-subtle)] text-center">
            <Link
              href="/dashboard/settings/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: ArtistNotification;
  onSelect: (notification: ArtistNotification) => void;
}) {
  const Icon = KIND_ICONS[notification.kind];
  const className = `flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:bg-[var(--surface-raised)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] ${
    notification.read ? "" : "bg-[var(--surface-raised)]/50"
  }`;

  const content = (
    <>
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--primary)]">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`truncate text-sm text-[var(--text)] ${notification.read ? "font-medium" : "font-semibold"}`}
          >
            {notification.title}
          </span>
          {!notification.read && (
            <span
              data-testid="notification-unread-dot"
              className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--primary)]"
            >
              <span className="sr-only">Unread</span>
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
          {notification.message}
        </span>
        <time
          dateTime={notification.createdAt}
          className="mt-1 block text-[11px] text-[var(--text-subtle)]"
        >
          {formatDate(notification.createdAt, "relative")}
        </time>
      </span>
    </>
  );

  if (notification.href) {
    return (
      <Link href={notification.href} onClick={() => onSelect(notification)} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onSelect(notification)} className={className}>
      {content}
    </button>
  );
}

export { NotificationBell };
