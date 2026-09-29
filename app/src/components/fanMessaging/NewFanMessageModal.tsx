"use client";

import { useState } from "react";
import { Search, UserRound } from "lucide-react";
import Modal from "@/components/shared/Modal";
import {
  getFansWithoutConversation,
  openConversationWithFan,
} from "@/services/fanMessagingService";
import { searchFans, type FanConversation } from "@/utils/fanMessaging";

interface NewFanMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened: (conversation: FanConversation) => void;
}

/**
 * "New message" entry point for the fan inbox (#419). Lists the fans the artist
 * has not written to yet, with a search box, and opens (or re-opens) the
 * resulting thread.
 */
export default function NewFanMessageModal({
  open,
  onOpenChange,
  onOpened,
}: NewFanMessageModalProps) {
  const [query, setQuery] = useState("");

  // Recomputed on each render rather than memoised: starting a conversation
  // removes that fan from the candidate list, so a cached result would go stale.
  const candidates = searchFans(getFansWithoutConversation(), query);

  const handleSelect = (fanId: string) => {
    const conversation = openConversationWithFan(fanId);
    if (!conversation) return;
    setQuery("");
    onOpenChange(false);
    onOpened(conversation);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="New message" subtitle="Fans" size="lg">
      <div className="space-y-4">
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <label htmlFor="fan-picker-search" className="sr-only">
            Search fans
          </label>
          <input
            id="fan-picker-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search fans by name or handle"
            className="w-full rounded-full border border-border bg-surface-sunken py-2.5 pl-9 pr-4 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        {candidates.length === 0 ? (
          <p
            role="status"
            className="rounded-xl border border-border-subtle bg-surface p-4 text-sm text-text-muted"
          >
            {query
              ? `No fan matches “${query}”.`
              : "You have already messaged every fan in your directory."}
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-border-subtle overflow-y-auto rounded-xl border border-border-subtle">
            {candidates.map((fan) => (
              <li key={fan.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(fan.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-sunken">
                    <UserRound size={16} aria-hidden="true" className="text-text-muted" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text">
                      {fan.displayName}
                    </span>
                    <span className="block truncate text-xs text-text-muted">{fan.handle}</span>
                  </span>
                  {fan.isFollower && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Follower
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
