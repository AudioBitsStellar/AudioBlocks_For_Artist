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

const MOCK_FAN_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    type: "fan",
    participantId: "fan_001",
    participantName: "Tomothy Nguyen",
    lastMessage: "Love your latest track! When is the next album dropping?",
    lastMessageAt: "2025-07-20T18:30:00Z",
    unreadCount: 2,
    messages: [
      {
        id: 1,
        senderId: "fan_001",
        senderName: "Tomothy Nguyen",
        content: "Love your latest track!",
        timestamp: "2025-07-20T18:00:00Z",
        isFromArtist: false,
      },
      {
        id: 2,
        senderId: "fan_001",
        senderName: "Tomothy Nguyen",
        content: "When is the next album dropping?",
        timestamp: "2025-07-20T18:30:00Z",
        isFromArtist: false,
      },
    ],
  },
  {
    id: 2,
    type: "fan",
    participantId: "fan_002",
    participantName: "Evan Howard",
    lastMessage: "Thanks for the shoutout at the concert!",
    lastMessageAt: "2025-07-19T14:15:00Z",
    unreadCount: 0,
    messages: [
      {
        id: 3,
        senderId: "fan_002",
        senderName: "Evan Howard",
        content: "That concert was amazing!",
        timestamp: "2025-07-19T12:00:00Z",
        isFromArtist: false,
      },
      {
        id: 4,
        senderId: "artist",
        senderName: "You",
        content: "Thank you for coming!",
        timestamp: "2025-07-19T13:00:00Z",
        isFromArtist: true,
      },
      {
        id: 5,
        senderId: "fan_002",
        senderName: "Evan Howard",
        content: "Thanks for the shoutout at the concert!",
        timestamp: "2025-07-19T14:15:00Z",
        isFromArtist: false,
      },
    ],
  },
  {
    id: 3,
    type: "fan",
    participantId: "fan_003",
    participantName: "Victoria Robertson",
    lastMessage: "Will you be touring near Lagos?",
    lastMessageAt: "2025-07-18T09:45:00Z",
    unreadCount: 1,
    messages: [
      {
        id: 6,
        senderId: "fan_003",
        senderName: "Victoria Robertson",
        content: "Will you be touring near Lagos?",
        timestamp: "2025-07-18T09:45:00Z",
        isFromArtist: false,
      },
    ],
  },
];

const MOCK_ARTIST_CONVERSATIONS: Conversation[] = [
  {
    id: 101,
    type: "artist",
    participantId: "artist_001",
    participantName: "Jaden Cole",
    lastMessage: "I've got a verse ready whenever you want to link up on the collab.",
    lastMessageAt: "2025-07-21T16:20:00Z",
    unreadCount: 1,
    messages: [
      {
        id: 101,
        senderId: "artist_001",
        senderName: "Jaden Cole",
        content: "Hey! Loved the new single. Any interest in a collab?",
        timestamp: "2025-07-21T15:50:00Z",
        isFromArtist: false,
      },
      {
        id: 102,
        senderId: "artist",
        senderName: "You",
        content: "Definitely, I've been wanting to work with you for a while.",
        timestamp: "2025-07-21T16:05:00Z",
        isFromArtist: true,
      },
      {
        id: 103,
        senderId: "artist_001",
        senderName: "Jaden Cole",
        content: "I've got a verse ready whenever you want to link up on the collab.",
        timestamp: "2025-07-21T16:20:00Z",
        isFromArtist: false,
      },
    ],
  },
  {
    id: 102,
    type: "artist",
    participantId: "artist_002",
    participantName: "Mara Voss",
    lastMessage: "Sent over the stems for the remix, let me know what you think.",
    lastMessageAt: "2025-07-20T11:05:00Z",
    unreadCount: 0,
    messages: [
      {
        id: 104,
        senderId: "artist_002",
        senderName: "Mara Voss",
        content: "Would you be open to featuring on my next EP?",
        timestamp: "2025-07-20T10:40:00Z",
        isFromArtist: false,
      },
      {
        id: 105,
        senderId: "artist",
        senderName: "You",
        content: "For sure, send over what you've got and I'll take a listen.",
        timestamp: "2025-07-20T10:55:00Z",
        isFromArtist: true,
      },
      {
        id: 106,
        senderId: "artist_002",
        senderName: "Mara Voss",
        content: "Sent over the stems for the remix, let me know what you think.",
        timestamp: "2025-07-20T11:05:00Z",
        isFromArtist: false,
      },
    ],
  },
  {
    id: 103,
    type: "artist",
    participantId: "artist_003",
    participantName: "Dexter Alaba",
    lastMessage: "Are you playing the Lagos showcase next month?",
    lastMessageAt: "2025-07-17T08:30:00Z",
    unreadCount: 1,
    messages: [
      {
        id: 107,
        senderId: "artist_003",
        senderName: "Dexter Alaba",
        content: "Are you playing the Lagos showcase next month?",
        timestamp: "2025-07-17T08:30:00Z",
        isFromArtist: false,
      },
    ],
  },
];

const ALL_CONVERSATIONS: Conversation[] = [...MOCK_FAN_CONVERSATIONS, ...MOCK_ARTIST_CONVERSATIONS];

export function getConversations(type: ConversationType): Conversation[] {
  return ALL_CONVERSATIONS.filter((c) => c.type === type);
}

export function getConversation(id: number): Conversation | undefined {
  return ALL_CONVERSATIONS.find((c) => c.id === id);
}

export function getTotalUnreadCount(): number {
  return ALL_CONVERSATIONS.reduce((sum, c) => sum + c.unreadCount, 0);
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
  const conversation = ALL_CONVERSATIONS.find((c) => c.id === payload.conversationId);
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
