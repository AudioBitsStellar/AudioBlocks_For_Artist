"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  /** 1-based page currently shown. */
  page: number;
  /** How many items fit on one page. */
  pageSize: number;
  /** Items across every page, after search/filter has been applied. */
  totalItems: number;
  /** Called with the requested page; values are clamped before they are sent. */
  onPageChange: (page: number) => void;
  /** Accessible name for the `nav` landmark, e.g. "Track list pages". */
  ariaLabel: string;
  /** Noun used in the item counts, e.g. "tracks". */
  itemNoun?: string;
}

const BUTTON_CLASS =
  "flex items-center gap-1 rounded-lg border border-border-subtle px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Page controls for a long list (issue #427).
 *
 * Renders nothing when everything fits on a single page, so short catalogs keep
 * their existing layout. The page/range readout is a live region: paging through
 * a list changes what is on screen without moving focus, and a screen reader
 * user would otherwise get no confirmation that anything happened.
 */
export default function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  ariaLabel,
  itemNoun = "items",
}: PaginationProps) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));

  if (totalItems <= 0 || totalPages <= 1) return null;

  // Deleting the last row of the final page (or filtering down) can leave the
  // caller pointing past the end, so the visible page is clamped as well.
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const firstItem = (currentPage - 1) * safePageSize + 1;
  const lastItem = Math.min(currentPage * safePageSize, totalItems);

  const goToPage = (target: number) => {
    const next = Math.min(Math.max(1, target), totalPages);
    if (next !== currentPage) onPageChange(next);
  };

  return (
    <nav aria-label={ariaLabel} className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className={BUTTON_CLASS}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Previous
      </button>

      <p role="status" aria-live="polite" className="text-sm text-text-muted">
        Page {currentPage} of {totalPages} · {firstItem}–{lastItem} of {totalItems} {itemNoun}
      </p>

      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={BUTTON_CLASS}
      >
        Next
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}

export { Pagination };
