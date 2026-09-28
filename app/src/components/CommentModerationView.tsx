"use client";

import { useMemo, useState } from "react";
import { Flag, MessageSquare, Search, Trash2, EyeOff, Eye, CheckCircle2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import type { DashboardComment } from "@/services/commentService";
import {
  MODERATION_STATUS_LABELS,
  type ModerationMap,
  type ModerationStatus,
} from "@/services/commentModerationService";
import { sanitize } from "@/utils/sanitize";

type FilterKey = "all" | ModerationStatus;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" },
  { key: "flagged", label: "Flagged" },
  { key: "removed", label: "Removed" },
];

interface CommentModerationViewProps {
  comments: DashboardComment[];
  moderation: ModerationMap;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onModerate: (ids: string[], status: ModerationStatus) => void;
}

function statusOf(moderation: ModerationMap, id: string | number): ModerationStatus {
  return moderation[String(id)]?.status ?? "visible";
}

export default function CommentModerationView({
  comments,
  moderation,
  isLoading = false,
  isError = false,
  onRetry,
  onModerate,
}: CommentModerationViewProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return comments.filter((comment) => {
      const status = statusOf(moderation, comment.id);
      const matchesFilter = filter === "all" || status === filter;
      const matchesQuery =
        !term ||
        comment.name.toLowerCase().includes(term) ||
        comment.comment.toLowerCase().includes(term);
      return matchesFilter && matchesQuery;
    });
  }, [comments, moderation, filter, query]);

  const allSelected = visible.length > 0 && visible.every((c) => selected.includes(String(c.id)));

  const toggleAll = () => {
    setSelected(allSelected ? [] : visible.map((c) => String(c.id)));
  };

  const toggleOne = (id: string | number) => {
    const key = String(id);
    setSelected((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  };

  const applyBulk = (status: ModerationStatus) => {
    if (selected.length === 0) return;
    onModerate(selected, status);
    setSelected([]);
  };

  const actionButtons = (comment: DashboardComment) => {
    const status = statusOf(moderation, comment.id);
    const id = String(comment.id);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {status !== "visible" && (
          <button
            type="button"
            onClick={() => onModerate([id], "visible")}
            className="inline-flex items-center gap-1 rounded-full border border-[#2A2A2A] px-3 py-1 text-xs font-semibold text-[#A3A3A3] hover:text-white"
          >
            <Eye size={14} aria-hidden="true" /> Restore
          </button>
        )}
        {status === "visible" && (
          <button
            type="button"
            onClick={() => onModerate([id], "hidden")}
            className="inline-flex items-center gap-1 rounded-full border border-[#2A2A2A] px-3 py-1 text-xs font-semibold text-[#A3A3A3] hover:text-white"
          >
            <EyeOff size={14} aria-hidden="true" /> Hide
          </button>
        )}
        {status !== "flagged" && (
          <button
            type="button"
            onClick={() => onModerate([id], "flagged")}
            className="inline-flex items-center gap-1 rounded-full border border-[#2A2A2A] px-3 py-1 text-xs font-semibold text-[#A3A3A3] hover:text-white"
          >
            <Flag size={14} aria-hidden="true" /> Flag
          </button>
        )}
        {status !== "removed" && (
          <button
            type="button"
            onClick={() => onModerate([id], "removed")}
            className="inline-flex items-center gap-1 rounded-full border border-[#7F1D1D] px-3 py-1 text-xs font-semibold text-red-400 hover:text-red-300"
          >
            <Trash2 size={14} aria-hidden="true" /> Delete
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div role="status" className="py-16 text-center text-[#A3A3A3]">
        Loading comments…
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Unable to load comments"
        description="We could not fetch the comments for moderation."
        ctaLabel="Retry"
        onCta={onRetry}
      />
    );
  }

  if (comments.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No fan comments yet"
        description="Comments from fans on your songs will show up here so you can moderate them."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          role="tablist"
          aria-label="Filter comments by moderation status"
          className="flex flex-wrap gap-2"
        >
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === item.key
                  ? "border-[#D2045B] bg-[#D2045B] text-white"
                  : "border-[#2A2A2A] text-[#A3A3A3] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
          />
          <label htmlFor="moderation-search" className="sr-only">
            Search comments
          </label>
          <input
            id="moderation-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by fan or text"
            className="w-full rounded-full border border-[#2A2A2A] bg-[#161616] py-2 pl-9 pr-4 text-sm text-white placeholder-[#A3A3A3] focus:outline-none focus:border-[#D2045B]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2A2A2A] bg-[#161616] px-4 py-3">
        <label className="inline-flex items-center gap-2 text-sm text-[#A3A3A3]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            aria-label="Select all visible comments"
            className="h-4 w-4 accent-[#D2045B]"
          />
          Select all ({visible.length})
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span aria-live="polite" className="text-xs text-[#A3A3A3]">
            {selected.length} selected
          </span>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => applyBulk("visible")}
            className="inline-flex items-center gap-1 rounded-full border border-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-[#A3A3A3] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={14} aria-hidden="true" /> Approve
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => applyBulk("hidden")}
            className="inline-flex items-center gap-1 rounded-full border border-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-[#A3A3A3] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <EyeOff size={14} aria-hidden="true" /> Hide
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => applyBulk("flagged")}
            className="inline-flex items-center gap-1 rounded-full border border-[#2A2A2A] px-3 py-1.5 text-xs font-semibold text-[#A3A3A3] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Flag size={14} aria-hidden="true" /> Flag
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No comments match"
          description="Try another filter or clear the search box."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((comment) => {
            const key = String(comment.id);
            const status = statusOf(moderation, comment.id);
            return (
              <li
                key={key}
                className="rounded-2xl border border-[#2A2A2A] bg-[#161616] p-4"
                data-status={status}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(key)}
                      onChange={() => toggleOne(comment.id)}
                      aria-label={`Select comment from ${comment.name}`}
                      className="mt-1 h-4 w-4 accent-[#D2045B]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{sanitize(comment.name)}</p>
                      <p className="mt-1 text-sm text-[#A3A3A3]">{sanitize(comment.comment)}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-[#A3A3A3]">
                        {MODERATION_STATUS_LABELS[status]} · {comment.time}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pl-7">{actionButtons(comment)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { CommentModerationView };
