/**
 * Pure helpers behind artist↔fan direct messaging (#419).
 *
 * Kept free of React and storage so the interesting parts — search, filtering,
 * day grouping, send validation — are unit-testable. The stateful store lives in
 * `services/fanMessagingService.ts`.
 */

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_QUICK_REPLY_LENGTH = 280;

/** Conversations the artist has chosen to mute, stored by conversation id. */
export type ConversationFilter = "all" | "unread" | "muted";

export interface FanProfile {
  id: string;
  displayName: string;
  handle: string;
  /** True when the fan follows the artist, which gates quick replies. */
  isFollower: boolean;
  joinedAt: string;
}

export interface FanMessage {
  id: number;
  senderId: string;
  content: string;
  timestamp: string;
  isFromArtist: boolean;
}

export interface FanConversation {
  id: number;
  fanId: string;
  fanName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isMuted: boolean;
  messages: FanMessage[];
}

export type MessageDraftErrors = Partial<Record<"content", string>>;

/**
 * Why a draft cannot be sent yet, or `null` when it is good to go.
 *
 * Deliberately refuses whitespace-only text and anything past
 * `MAX_MESSAGE_LENGTH`; the character budget is enforced here rather than only
 * by the textarea's `maxLength` so pasted text is caught too.
 */
export function validateMessageDraft(
  draft: string,
  options: { isMuted?: boolean } = {}
): MessageDraftErrors {
  const content = draft.trim();

  if (options.isMuted) {
    return { content: "Unmute this conversation before replying." };
  }
  if (!content) {
    return { content: "Write a message before sending." };
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return { content: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` };
  }
  return {};
}

export function canSendMessage(draft: string, options: { isMuted?: boolean } = {}): boolean {
  return Object.keys(validateMessageDraft(draft, options)).length === 0;
}

/** Remaining characters, floored at 0 so a long paste cannot show a negative. */
export function remainingCharacters(draft: string, limit = MAX_MESSAGE_LENGTH): number {
  return Math.max(0, limit - draft.trim().length);
}

/** Case-insensitive match across name, handle, preview and message bodies. */
function matches(query: string, ...fields: string[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => field.toLowerCase().includes(needle));
}

export function searchFans(fans: FanProfile[], query: string): FanProfile[] {
  const needle = query.trim().toLowerCase();
  const result = fans.filter((fan) => matches(needle, fan.displayName, fan.handle));
  return result.sort(
    (a, b) =>
      Number(b.isFollower) - Number(a.isFollower) || a.displayName.localeCompare(b.displayName)
  );
}

export function filterConversations(
  conversations: FanConversation[],
  options: { query?: string; filter?: ConversationFilter } = {}
): FanConversation[] {
  const { query = "", filter = "all" } = options;

  return conversations
    .filter((conversation) => {
      if (filter === "unread" && conversation.unreadCount === 0) return false;
      if (filter === "muted" && !conversation.isMuted) return false;
      return matches(
        query,
        conversation.fanName,
        conversation.lastMessage,
        ...conversation.messages.map((message) => message.content)
      );
    })
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export function totalUnread(conversations: FanConversation[]): number {
  return conversations
    .filter((conversation) => !conversation.isMuted)
    .reduce((sum, conversation) => sum + conversation.unreadCount, 0);
}

export interface MessageDay {
  /** `YYYY-MM-DD`, used as the React key and to keep groups stable. */
  date: string;
  label: string;
  messages: FanMessage[];
}

/** `YYYY-MM-DD` in UTC so grouping never shifts with the viewer's timezone. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function dayLabel(iso: string, now: Date = new Date()): string {
  const key = dayKey(iso);
  if (key === dayKey(now.toISOString())) return "Today";
  if (key === dayKey(new Date(now.getTime() - 86_400_000).toISOString())) return "Yesterday";
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Splits a thread into day-ordered groups, oldest first. */
export function groupMessagesByDay(messages: FanMessage[], now: Date = new Date()): MessageDay[] {
  const groups = new Map<string, FanMessage[]>();
  for (const message of [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    const key = dayKey(message.timestamp);
    const bucket = groups.get(key);
    if (bucket) bucket.push(message);
    else groups.set(key, [message]);
  }
  return [...groups.entries()].map(([date, dayMessages]) => ({
    date,
    label: dayLabel(dayMessages[0].timestamp, now),
    messages: dayMessages,
  }));
}

/** Fans that have not been written to yet, used to seed the "new message" flow. */
export function startableFans(fans: FanProfile[], conversations: FanConversation[]): FanProfile[] {
  const existing = new Set(conversations.map((conversation) => conversation.fanId));
  return fans.filter((fan) => !existing.has(fan.id));
}
