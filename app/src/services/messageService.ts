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
  fanId: string;
  fanName: string;
  fanAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
}

export interface SendMessagePayload {
  conversationId: number;
  content: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    fanId: "fan_001",
    fanName: "Tomothy Nguyen",
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
    fanId: "fan_002",
    fanName: "Evan Howard",
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
    fanId: "fan_003",
    fanName: "Victoria Robertson",
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

export function getConversations(): Conversation[] {
  return MOCK_CONVERSATIONS;
}

export function getConversation(id: number): Conversation | undefined {
  return MOCK_CONVERSATIONS.find((c) => c.id === id);
}

export function getTotalUnreadCount(): number {
  return MOCK_CONVERSATIONS.reduce((sum, c) => sum + c.unreadCount, 0);
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
  const conversation = MOCK_CONVERSATIONS.find((c) => c.id === payload.conversationId);
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
