"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, MessageSquare, Send, User } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import FanInbox from "@/components/fanMessaging/FanInbox";
import {
  getConversations,
  sendMessage,
  formatMessageTime,
  formatConversationDate,
  markConversationRead,
  type Conversation,
  type ConversationType,
} from "@/services/messageService";

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  emptyMessage,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (c: Conversation) => void;
  emptyMessage: string;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <MessageSquare className="h-10 w-10 text-text-muted mb-3" aria-hidden="true" />
        <p className="text-text font-semibold">No messages yet</p>
        <p className="text-text-muted text-sm mt-1">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border-subtle">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c)}
            className={`w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-surface-raised transition-colors ${
              selectedId === c.id ? "bg-surface-raised" : ""
            }`}
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-surface-sunken flex items-center justify-center">
              <User className="h-5 w-5 text-text-muted" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-text text-sm font-semibold truncate">
                  {c.participantName}
                </span>
                <span className="text-text-muted text-xs flex-shrink-0 ml-2">
                  {formatConversationDate(c.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-text-muted text-xs truncate">{c.lastMessage}</p>
                {c.unreadCount > 0 && (
                  <span className="ml-2 flex-shrink-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-contrast">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MessageThread({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState(conversation.messages);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(conversation.messages);
    setDraft("");
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const msg = sendMessage({ conversationId: conversation.id, content: text });
    setMessages((prev) => [...prev, msg]);
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-4 sm:px-6">
        {/* Only reachable on small screens, where the thread takes over the
            whole pane and the conversation list is hidden (#422). */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="h-9 w-9 rounded-full bg-surface-sunken flex items-center justify-center">
          <User className="h-4 w-4 text-text-muted" aria-hidden="true" />
        </div>
        <span className="text-text font-semibold">{conversation.participantName}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 sm:px-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isFromArtist ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.isFromArtist
                  ? "bg-primary text-primary-contrast rounded-br-sm"
                  : "bg-surface-raised text-text rounded-bl-sm"
              }`}
            >
              <p>{msg.content}</p>
              <p
                className={`text-[10px] mt-1 ${
                  msg.isFromArtist ? "text-right opacity-70" : "text-text-muted"
                }`}
              >
                {formatMessageTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border-subtle px-4 py-4 flex items-end gap-3 sm:px-6">
        <label htmlFor={`artist-reply-${conversation.id}`} className="sr-only">
          Reply to {conversation.participantName}
        </label>
        <textarea
          id={`artist-reply-${conversation.id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send)"
          rows={2}
          maxLength={1000}
          className="flex-1 resize-none rounded-xl border border-border bg-surface-sunken px-4 py-3 text-sm text-text placeholder:text-text-subtle focus:border-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          aria-label="Send message"
          className="flex-shrink-0 h-11 w-11 rounded-full bg-primary flex items-center justify-center hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4 text-primary-contrast" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const TABS: { type: ConversationType; label: string }[] = [
  { type: "fan", label: "Fans" },
  { type: "artist", label: "Artists" },
];

export default function MessagesPage() {
  const [tab, setTab] = useState<ConversationType>("fan");
  // The fan inbox owns its own list and thread (#419); the artist inbox below
  // is the pre-existing read/send view.
  const artistConversations = getConversations("artist");
  const [selected, setSelected] = useState<Conversation | null>(
    artistConversations.length > 0 ? artistConversations[0] : null
  );
  // Below `lg` the two panes don't fit side by side, so the thread replaces
  // the list once a conversation is picked (#422). At `lg` and up both panes
  // are always visible and this flag is irrelevant.
  const [isThreadOpen, setIsThreadOpen] = useState(false);

  const handleTabChange = (type: ConversationType) => {
    setTab(type);
    const nextConversations = getConversations(type);
    setSelected(nextConversations.length > 0 ? nextConversations[0] : null);
    setIsThreadOpen(false);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Messages", isActive: true }]} />

      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Inbox</p>
        <h1 className="text-3xl font-bold text-text">Messages</h1>
      </div>

      <div
        className="flex items-center gap-2 overflow-x-auto border-b border-border"
        role="tablist"
      >
        {TABS.map(({ type, label }) => (
          <button
            key={type}
            id={`messages-tab-${type}`}
            onClick={() => handleTabChange(type)}
            role="tab"
            type="button"
            aria-selected={tab === type}
            aria-controls="messages-panel"
            className={`shrink-0 px-6 py-3 font-semibold transition-colors rounded-t-lg ${
              tab === type
                ? "bg-primary text-primary-contrast"
                : "bg-transparent text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "fan" ? (
        <div id="messages-panel" role="tabpanel" aria-labelledby="messages-tab-fan">
          <FanInbox />
        </div>
      ) : (
        <div
          id="messages-panel"
          role="tabpanel"
          aria-labelledby="messages-tab-artist"
          className="flex h-[70vh] min-h-[420px] overflow-hidden rounded-2xl border border-border-subtle bg-surface lg:h-[600px] lg:min-h-0"
        >
          <div
            className={`w-full shrink-0 overflow-y-auto border-r border-border-subtle lg:block lg:w-72 ${
              isThreadOpen ? "hidden" : "block"
            }`}
          >
            <ConversationList
              conversations={artistConversations}
              selectedId={selected?.id ?? null}
              onSelect={(conversation) => {
                markConversationRead(conversation.id);
                setSelected(conversation);
                setIsThreadOpen(true);
              }}
              emptyMessage="Artist messages will appear here."
            />
          </div>

          <div className={`min-w-0 flex-1 lg:block ${isThreadOpen ? "block" : "hidden"}`}>
            {selected ? (
              <MessageThread
                key={selected.id}
                conversation={selected}
                onBack={() => setIsThreadOpen(false)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <MessageSquare className="h-12 w-12 text-text-muted mb-3" aria-hidden="true" />
                <p className="text-text font-semibold">Select a conversation</p>
                <p className="text-text-muted text-sm mt-1">
                  Choose an artist from the list to read their messages.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
