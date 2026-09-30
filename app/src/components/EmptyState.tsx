"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  /** Icon element (use lucide-react icons) */
  icon?: ReactNode;
  /** Main heading */
  title: string;
  /** Descriptive message */
  message: string;
  /** Optional call-to-action button */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable empty state component for dashboard sections.
 * Shows a friendly message with optional CTA when there's no data.
 */
export function EmptyState({ icon, title, message, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="status"
      aria-label={title}
    >
      {icon && (
        <div className="mb-4 text-gray-400" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md mb-6">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
