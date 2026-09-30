/**
 * Store for artist↔fan direct messaging (#419).
 *
 * Mirrors `messageService.ts` (plain in-memory collections plus `localStorage`
 * for anything the artist changes) so the fan inbox can be wired into the
 * dashboard without a backend round-trip. Swap the module-level state for API
 * calls once the messaging endpoints exist — the pure logic in
 * `utils/fanMessaging.ts` stays as-is.
 */

import { notifyInboxUnreadChanged } from "@/services/inboxEvents";
import {
  filterConversations,
  groupMessagesByDay,
  startableFans,
  totalUnread,
  validateMessageDraft,
  type ConversationFilter,
  type FanConversation,
  type FanMessage,
  type FanProfile,
  type MessageDay,
  type MessageDraftErrors,
} from "@/utils/fanMessaging";

const STORAGE_KEY = "audioblocks:fan-conversations:v1";

const FANS: FanProfile[] = [
  {
    id: "fan_001",
    displayName: "Tomothy Nguyen",
    handle: "@tomothy",
    isFollower: true,
    joinedAt: "2025-11-02T09:00:00Z",
  },
  {
    id: "fan_002",
    displayName: "Evan Howard",
    handle: "@evanhoward",
    isFollower: true,
    joinedAt: "2025-12-14T17:20:00Z",
  },
  {
    id: "fan_003",
    displayName: "Victoria Robertson",
    handle: "@vicrobertson",
    isFollower: false,
    joinedAt: "2026-01-08T21:05:00Z",
  },
  {
    id: "fan_004",
    displayName: "Marcus Adeyemi",
    handle: "@marcusplays",
    isFollower: true,
    joinedAt: "2026-02-19T08:45:00Z",
  },
  {
    id: "fan_005",
    displayName: "Sofia Marino",
    handle: "@sofiamarino",
    isFollower: false,
    joinedAt: "2026-03-27T13:30:00Z",
  },
];

const SEED_CONVERSATIONS: FanConversation[] = [
  {
    id: 1,
    fanId: "fan_001",
    fanName: "Tomothy Nguyen",
    lastMessage: "Love your latest track! When is the next album dropping?",
    lastMessageAt: "2026-09-20T18:30:00Z",
    unreadCount: 2,
    isMuted: false,
    messages: [
      {
        id: 1,
        senderId: "fan_001",
        content: "Love your latest track!",
        timestamp: "2026-09-20T18:00:00Z",
        isFromArtist: false,
      },
      {
        id: 2,
        senderId: "fan_001",
        content: "When is the next album dropping?",
        timestamp: "2026-09-20T18:30:00Z",
        isFromArtist: false,
      },
    ],
  },
  {
    id: 2,
    fanId: "fan_002",
    fanName: "Evan Howard",
    lastMessage: "Thanks for the shoutout at the concert!",
    lastMessageAt: "2026-09-19T14:15:00Z",
    unreadCount: 0,
    isMuted: false,
    messages: [
      {
        id: 3,
        senderId: "fan_002",
        content: "That concert was amazing!",
        timestamp: "2026-09-19T12:00:00Z",
        isFromArtist: false,
      },
      {
        id: 4,
        senderId: "artist",
        content: "Thank you for coming!",
        timestamp: "2026-09-19T13:00:00Z",
        isFromArtist: true,
      },
      {
        id: 5,
        senderId: "fan_002",
        content: "Thanks for the shoutout at the concert!",
        timestamp: "2026-09-19T14:15:00Z",
        isFromArtist: false,
      },
    ],
  },
  {
    id: 3,
    fanId: "fan_003",
    fanName: "Victoria Robertson",
    lastMessage: "Will you be touring near Lagos?",
    lastMessageAt: "2026-09-18T09:45:00Z",
    unreadCount: 1,
    isMuted: false,
    messages: [
      {
        id: 6,
        senderId: "fan_003",
        content: "Will you be touring near Lagos?",
        timestamp: "2026-09-18T09:45:00Z",
        isFromArtist: false,
      },
    ],
  },
  {
    id: 4,
    fanId: "fan_004",
    fanName: "Marcus Adeyemi",
    lastMessage: "Sent you the stems for our collab.",
    lastMessageAt: "2026-09-17T20:10:00Z",
    unreadCount: 0,
    isMuted: true,
    messages: [
      {
        id: 7,
        senderId: "artist",
        content: "Sent you the stems for our collab.",
        timestamp: "2026-09-17T20:10:00Z",
        isFromArtist: true,
      },
    ],
  },
];

let conversations: FanConversation[] | null = null;
let nextMessageId = 1000;
let nextConversationId = 100;

/** Restores the artist's mute/archive choices across reloads, if stored. */
function load(): FanConversation[] {
  if (conversations) return conversations;
  if (typeof window === "undefined") {
    conversations = SEED_CONVERSATIONS;
    return conversations;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    conversations = raw
      ? (JSON.parse(raw) as FanConversation[])
      : SEED_CONVERSATIONS.map((conversation) => ({ ...conversation }));
  } catch {
    conversations = SEED_CONVERSATIONS.map((conversation) => ({ ...conversation }));
  }
  // Keep generated ids clear of anything already in the store, including ids
  // restored from localStorage on a later visit.
  const highestConversationId = conversations.reduce((max, c) => Math.max(max, c.id), 0);
  const highestMessageId = conversations.reduce(
    (max, c) => c.messages.reduce((inner, m) => Math.max(inner, m.id), max),
    0
  );
  nextConversationId = Math.max(nextConversationId, highestConversationId + 1);
  nextMessageId = Math.max(nextMessageId, highestMessageId + 1);
  return conversations;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations ?? []));
  } catch {
    // Storage full or blocked — the session keeps working in memory.
  }
  // Every mutation goes through here, so the nav badges stay in sync (#146).
  notifyInboxUnreadChanged();
}

/** Test seam: drops the memo so each spec starts from the seed data. */
export function resetFanMessaging(): void {
  conversations = null;
  nextMessageId = 1000;
  nextConversationId = 100;
}

export function getFans(): FanProfile[] {
  return FANS;
}

export function getFanConversations(): FanConversation[] {
  return load();
}

export function getFanConversation(id: number): FanConversation | undefined {
  return load().find((conversation) => conversation.id === id);
}

export function findConversations(
  query = "",
  filter: ConversationFilter = "all"
): FanConversation[] {
  return filterConversations(load(), { query, filter });
}

export function getUnreadTotal(): number {
  return totalUnread(load());
}

export function markConversationRead(id: number): FanConversation | undefined {
  const conversation = getFanConversation(id);
  if (!conversation) return undefined;
  conversation.unreadCount = 0;
  persist();
  return conversation;
}

export function setConversationMuted(id: number, isMuted: boolean): FanConversation | undefined {
  const conversation = getFanConversation(id);
  if (!conversation) return undefined;
  conversation.isMuted = isMuted;
  persist();
  return conversation;
}

/**
 * Opens a thread with a fan. Re-opening an existing thread returns it instead
 * of creating a duplicate, which is what the "New message" picker relies on.
 */
export function openConversationWithFan(fanId: string): FanConversation | undefined {
  const fan = FANS.find((entry) => entry.id === fanId);
  if (!fan) return undefined;

  const existing = load().find((conversation) => conversation.fanId === fanId);
  if (existing) {
    existing.unreadCount = 0;
    persist();
    return existing;
  }

  const created: FanConversation = {
    id: nextConversationId++,
    fanId: fan.id,
    fanName: fan.displayName,
    lastMessage: "",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    isMuted: false,
    messages: [],
  };
  load().unshift(created);
  persist();
  return created;
}

export function getFansWithoutConversation(): FanProfile[] {
  return startableFans(FANS, load());
}

/**
 * Appends the artist's reply. Returns the created message, or the validation
 * error when the draft is empty, too long, or the thread is muted.
 */
export function sendFanMessage(
  conversationId: number,
  draft: string
): { message?: FanMessage; errors?: MessageDraftErrors } {
  const conversation = getFanConversation(conversationId);
  if (!conversation) return { errors: { content: "This conversation is no longer available." } };

  const errors = validateMessageDraft(draft, { isMuted: conversation.isMuted });
  if (Object.keys(errors).length > 0) return { errors };

  const message: FanMessage = {
    id: nextMessageId++,
    senderId: "artist",
    content: draft.trim(),
    timestamp: new Date().toISOString(),
    isFromArtist: true,
  };
  conversation.messages.push(message);
  conversation.lastMessage = message.content;
  conversation.lastMessageAt = message.timestamp;
  persist();
  return { message };
}

export function getGroupedMessages(conversationId: number, now?: Date): MessageDay[] {
  return groupMessagesByDay(getFanConversation(conversationId)?.messages ?? [], now);
}

export function formatFanMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
