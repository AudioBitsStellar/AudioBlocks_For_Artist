import { featureFlags } from "@/lib/featureFlags";
import { loadMock } from "@/__mocks__/loadMock";
import { getUnreadTotal as getFanUnreadTotal } from "@/services/fanMessagingService";
import { notifyInboxUnreadChanged } from "@/services/inboxEvents";

export type ConversationType = "fan" | "artist";

export interface Message {
  id: number;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isFromArtist: boolean;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
}

export interface SendMessagePayload {
  conversationId: number;
  content: string;
}

let conversations: Conversation[] = [];
let mockConversationsLoad: Promise<void> | null = null;

/**
 * Fills the in-memory conversation list from `src/__mocks__/messages` when
 * mock mode is on. Readers kick it off on first use and the navigation
 * badges re-read through the inbox-unread event once it lands.
 */
export function loadMockConversations(): Promise<void> {
  if (!featureFlags.useMockMessages) return Promise.resolve();
  mockConversationsLoad ??= loadMock("messages").then(
    ({ MOCK_FAN_CONVERSATIONS, MOCK_ARTIST_CONVERSATIONS }) => {
      // Cloned because read state and sent messages are written in place.
      conversations = structuredClone([...MOCK_FAN_CONVERSATIONS, ...MOCK_ARTIST_CONVERSATIONS]);
      notifyInboxUnreadChanged();
    }
  );
  return mockConversationsLoad;
}

export function getConversations(type: ConversationType): Conversation[] {
  void loadMockConversations();
  return conversations.filter((c) => c.type === type);
}

export function getConversation(id: number): Conversation | undefined {
  void loadMockConversations();
  return conversations.find((c) => c.id === id);
}

/**
 * Unread total shown on the navigation badges (#146).
 *
 * The Messages page's Fans tab is the fan inbox backed by
 * `fanMessagingService` (#419), not this module's legacy fan mocks, so fan
 * unread comes from that store (muted threads excluded, matching the inbox).
 * The Artists tab still reads this module, so its unread is added here.
 */
export function getTotalUnreadCount(): number {
  const artistUnread = getConversations("artist").reduce((sum, c) => sum + c.unreadCount, 0);
  return getFanUnreadTotal() + artistUnread;
}

/** Marks an Artists-tab conversation read when it is opened (#146). */
export function markConversationRead(id: number): Conversation | undefined {
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) return undefined;
  if (conversation.unreadCount !== 0) {
    conversation.unreadCount = 0;
    notifyInboxUnreadChanged();
  }
  return conversation;
}

export function sendMessage(payload: SendMessagePayload): Message {
  const newMessage: Message = {
    id: Date.now(),
    senderId: "artist",
    senderName: "You",
    content: payload.content,
    timestamp: new Date().toISOString(),
    isFromArtist: true,
  };
  const conversation = conversations.find((c) => c.id === payload.conversationId);
  if (conversation) {
    conversation.messages.push(newMessage);
    conversation.lastMessage = payload.content;
    conversation.lastMessageAt = newMessage.timestamp;
  }
  return newMessage;
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatConversationDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
