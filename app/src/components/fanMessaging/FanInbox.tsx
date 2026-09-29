"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  MessageSquare,
  PenSquare,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import EmptyState from "@/components/shared/EmptyState";
import NewFanMessageModal from "@/components/fanMessaging/NewFanMessageModal";
import {
  findConversations,
  formatFanMessageTime,
  getFanConversation,
  getUnreadTotal,
  markConversationRead,
  sendFanMessage,
  setConversationMuted,
} from "@/services/fanMessagingService";
import {
  groupMessagesByDay,
  MAX_MESSAGE_LENGTH,
  remainingCharacters,
  validateMessageDraft,
  type ConversationFilter,
  type FanConversation,
} from "@/utils/fanMessaging";

const FILTERS: { value: ConversationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "muted", label: "Muted" },
];

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date().toDateString();
  if (date.toDateString() === today) return "Today";
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  if (date.toDateString() === yesterday) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationRow({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: FanConversation;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
          isActive ? "bg-surface-raised" : "hover:bg-surface-raised"
        }`}
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-sunken">
          <UserRound size={18} aria-hidden="true" className="text-text-muted" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-text">{conversation.fanName}</span>
            <span className="flex-shrink-0 text-xs text-text-muted">
              {formatDayLabel(conversation.lastMessageAt)}
            </span>
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-text-muted">
              {conversation.lastMessage || "No messages yet"}
            </span>
            {conversation.isMuted ? (
              <BellOff size={14} aria-label="Muted" className="flex-shrink-0 text-text-subtle" />
            ) : (
              conversation.unreadCount > 0 && (
                <span className="ml-2 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-contrast">
                  {conversation.unreadCount}
                </span>
              )
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

function Thread({
  conversation,
  onBack,
  onChanged,
}: {
  conversation: FanConversation;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Recomputed on every render on purpose: the store mutates message arrays in
  // place, so their identity does not change when a reply is appended.
  const days = groupMessagesByDay(conversation.messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [days.length, conversation.messages.length]);

  const handleSend = () => {
    const errors = validateMessageDraft(draft, { isMuted: conversation.isMuted });
    if (errors.content) {
      setError(errors.content);
      return;
    }
    const result = sendFanMessage(conversation.id, draft);
    if (result.errors?.content) {
      setError(result.errors.content);
      return;
    }
    setDraft("");
    setError(null);
    onChanged();
  };

  const handleToggleMute = () => {
    const next = !conversation.isMuted;
    setConversationMuted(conversation.id, next);
    toast.success(next ? "Conversation muted." : "Conversation unmuted.");
    onChanged();
  };

  const remaining = remainingCharacters(draft);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{conversation.fanName}</p>
          <p className="text-xs text-text-muted">
            {conversation.isMuted ? "Muted — you can still read it" : "Fan conversation"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleMute}
          aria-pressed={conversation.isMuted}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {conversation.isMuted ? (
            <>
              <Bell size={14} aria-hidden="true" /> Unmute
            </>
          ) : (
            <>
              <BellOff size={14} aria-hidden="true" /> Mute
            </>
          )}
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
        {days.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            Say hello — this is the start of your conversation with {conversation.fanName}.
          </p>
        ) : (
          days.map((day) => (
            <section key={day.date} aria-label={day.label} className="space-y-3">
              <h3 className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-text-subtle">
                {day.label}
              </h3>
              {day.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isFromArtist ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      message.isFromArtist
                        ? "rounded-br-sm bg-primary text-primary-contrast"
                        : "rounded-bl-sm bg-surface-raised text-text"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {formatFanMessageTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border-subtle px-4 py-4 sm:px-6">
        <label htmlFor={`fan-reply-${conversation.id}`} className="sr-only">
          Reply to {conversation.fanName}
        </label>
        <div className="flex items-end gap-3">
          <textarea
            id={`fan-reply-${conversation.id}`}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              conversation.isMuted ? "Unmute to reply" : "Write a message… (Enter to send)"
            }
            rows={2}
            maxLength={MAX_MESSAGE_LENGTH}
            aria-describedby={error ? `fan-reply-error-${conversation.id}` : undefined}
            aria-invalid={error ? true : undefined}
            className="flex-1 resize-none rounded-xl border border-border bg-surface-sunken px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={conversation.isMuted}
            aria-label="Send message"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p
            id={`fan-reply-error-${conversation.id}`}
            role={error ? "alert" : undefined}
            className="text-xs text-error"
          >
            {error}
          </p>
          <p className="ml-auto text-xs text-text-subtle" aria-live="polite">
            {remaining} characters left
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Artist↔fan direct messaging inbox (#419).
 *
 * Owns search, the all/unread/muted filter, thread selection and the composer.
 * The artist↔artist inbox lives beside it on /dashboard/messages.
 */
export default function FanInbox() {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Read straight from the store on every render: `refresh` is the signal that
  // it changed, and the lists are small enough not to need memoising.
  const visible = findConversations(query, filter);
  const unread = getUnreadTotal();
  const selected = selectedId === null ? undefined : getFanConversation(selectedId);

  const handleSelect = (conversation: FanConversation) => {
    markConversationRead(conversation.id);
    setSelectedId(conversation.id);
    setIsThreadOpen(true);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter conversations" className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => {
            const isActive = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-border bg-surface text-text-muted hover:text-text"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <PenSquare size={16} aria-hidden="true" />
          New message
        </button>
      </div>

      <p role="status" className="text-xs text-text-muted">
        {unread === 0
          ? "You are all caught up."
          : `${unread} unread message${unread === 1 ? "" : "s"}.`}
      </p>

      <div className="flex h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-border-subtle bg-surface lg:h-[600px] lg:min-h-0">
        <div
          className={`w-full shrink-0 overflow-y-auto border-r border-border-subtle lg:block lg:w-80 ${
            isThreadOpen ? "hidden" : "block"
          }`}
        >
          <div className="border-b border-border-subtle p-3">
            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <label htmlFor="fan-inbox-search" className="sr-only">
                Search conversations
              </label>
              <input
                id="fan-inbox-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search messages"
                className="w-full rounded-full border border-border bg-surface-sunken py-2 pl-9 pr-4 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No conversations found"
              description={
                query
                  ? "No fan or message matches your search."
                  : "Start a new message to reach out to your fans."
              }
              ctaLabel="New message"
              onCta={() => setIsPickerOpen(true)}
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {visible.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === selectedId}
                  onSelect={() => handleSelect(conversation)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className={`min-w-0 flex-1 lg:block ${isThreadOpen ? "block" : "hidden"}`}>
          {selected ? (
            <Thread
              key={selected.id}
              conversation={selected}
              onBack={() => setIsThreadOpen(false)}
              onChanged={refresh}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <MessageSquare size={40} aria-hidden="true" className="mb-3 text-text-subtle" />
              <p className="font-semibold text-text">Select a conversation</p>
              <p className="mt-1 text-sm text-text-muted">
                Pick a fan from the list, or start a new message.
              </p>
            </div>
          )}
        </div>
      </div>

      <NewFanMessageModal
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onOpened={handleSelect}
      />
    </div>
  );
}
