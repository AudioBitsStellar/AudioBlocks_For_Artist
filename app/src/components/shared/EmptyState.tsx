"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Primary heading */
  title: string;
  /** Supporting description text */
  description: string;
  /** Label for the call-to-action button */
  ctaLabel?: string;
  /** Click handler for the CTA button */
  onCta?: () => void;
  /**
   * Where the CTA navigates instead of calling `onCta`. Use this when there is
   * no router to call into — a server-rendered route, or a section loaded
   * dynamically — since a handler cannot be passed across a client boundary.
   */
  ctaHref?: string;
}

/**
 * Reusable empty-state placeholder shown when a dashboard section has no data.
 *
 * Displays an icon, heading, description, and an optional call-to-action that
 * guides the artist toward the relevant creation flow — a handler for in-page
 * actions, or a link to the page that creates the thing.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      role="status"
      aria-label={title}
    >
      <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-text-muted" aria-hidden="true" />
      </div>
      <h3 className="text-text text-lg font-semibold mb-2">{title}</h3>
      <p className="text-text-muted text-sm max-w-sm mb-6">{description}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="px-5 py-2.5 bg-primary text-primary-contrast rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="px-5 py-2.5 bg-primary text-primary-contrast rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export { EmptyState };
