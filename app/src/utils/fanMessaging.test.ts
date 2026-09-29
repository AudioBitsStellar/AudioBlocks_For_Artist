import { describe, expect, it } from "vitest";
import {
  canSendMessage,
  filterConversations,
  groupMessagesByDay,
  MAX_MESSAGE_LENGTH,
  remainingCharacters,
  searchFans,
  startableFans,
  totalUnread,
  validateMessageDraft,
  type FanConversation,
  type FanProfile,
} from "./fanMessaging";

const FANS: FanProfile[] = [
  {
    id: "fan_1",
    displayName: "Tomothy Nguyen",
    handle: "@tomothy",
    isFollower: true,
    joinedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "fan_2",
    displayName: "Evan Howard",
    handle: "@evanhoward",
    isFollower: true,
    joinedAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "fan_3",
    displayName: "Sofia Marino",
    handle: "@sofia",
    isFollower: false,
    joinedAt: "2026-01-03T00:00:00Z",
  },
];

const CONVERSATIONS: FanConversation[] = [
  {
    id: 1,
    fanId: "fan_1",
    fanName: "Tomothy Nguyen",
    lastMessage: "When is the next album dropping?",
    lastMessageAt: "2026-09-20T18:30:00Z",
    unreadCount: 2,
    isMuted: false,
    messages: [
      {
        id: 1,
        senderId: "fan_1",
        content: "hello there",
        timestamp: "2026-09-20T18:00:00Z",
        isFromArtist: false,
      },
    ],
  },
  {
    id: 2,
    fanId: "fan_2",
    fanName: "Evan Howard",
    lastMessage: "Thanks for the shoutout!",
    lastMessageAt: "2026-09-19T14:15:00Z",
    unreadCount: 0,
    isMuted: true,
    messages: [
      {
        id: 2,
        senderId: "artist",
        content: "See you there",
        timestamp: "2026-09-19T14:00:00Z",
        isFromArtist: true,
      },
    ],
  },
];

describe("validateMessageDraft", () => {
  it("accepts a normal reply", () => {
    expect(validateMessageDraft("Thanks for listening!")).toEqual({});
    expect(canSendMessage("  padded  ")).toBe(true);
  });

  it("rejects empty and whitespace-only drafts", () => {
    expect(validateMessageDraft("").content).toMatch(/before sending/i);
    expect(validateMessageDraft("   \n ").content).toMatch(/before sending/i);
    expect(canSendMessage("  ")).toBe(false);
  });

  it("rejects drafts over the character limit", () => {
    const tooLong = "a".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(validateMessageDraft(tooLong).content).toMatch(new RegExp(`${MAX_MESSAGE_LENGTH}`));
    expect(canSendMessage("a".repeat(MAX_MESSAGE_LENGTH))).toBe(true);
  });

  it("refuses to send into a muted conversation", () => {
    expect(validateMessageDraft("hi", { isMuted: true }).content).toMatch(/Unmute/i);
    expect(canSendMessage("hi", { isMuted: true })).toBe(false);
  });
});

describe("remainingCharacters", () => {
  it("counts down and never goes negative", () => {
    expect(remainingCharacters("hello")).toBe(MAX_MESSAGE_LENGTH - 5);
    expect(remainingCharacters("a".repeat(MAX_MESSAGE_LENGTH + 50))).toBe(0);
  });
});

describe("searchFans", () => {
  it("matches name or handle case-insensitively", () => {
    expect(searchFans(FANS, "evan").map((f) => f.id)).toEqual(["fan_2"]);
    expect(searchFans(FANS, "@SOFIA").map((f) => f.id)).toEqual(["fan_3"]);
  });

  it("puts followers first and sorts the rest by name", () => {
    expect(searchFans(FANS, "").map((f) => f.id)).toEqual(["fan_2", "fan_1", "fan_3"]);
  });
});

describe("filterConversations", () => {
  it("sorts newest first", () => {
    expect(filterConversations(CONVERSATIONS).map((c) => c.id)).toEqual([1, 2]);
  });

  it("filters by unread and muted", () => {
    expect(filterConversations(CONVERSATIONS, { filter: "unread" }).map((c) => c.id)).toEqual([1]);
    expect(filterConversations(CONVERSATIONS, { filter: "muted" }).map((c) => c.id)).toEqual([2]);
  });

  it("searches the preview, the name and older message bodies", () => {
    expect(filterConversations(CONVERSATIONS, { query: "album" }).map((c) => c.id)).toEqual([1]);
    expect(filterConversations(CONVERSATIONS, { query: "hello there" }).map((c) => c.id)).toEqual([
      1,
    ]);
    expect(filterConversations(CONVERSATIONS, { query: "nothing matches" })).toEqual([]);
  });
});

describe("totalUnread", () => {
  it("ignores muted conversations", () => {
    expect(totalUnread(CONVERSATIONS)).toBe(2);
    expect(
      totalUnread([...CONVERSATIONS, { ...CONVERSATIONS[0], id: 9, isMuted: true, unreadCount: 5 }])
    ).toBe(2);
  });
});

describe("groupMessagesByDay", () => {
  const now = new Date("2026-09-21T10:00:00Z");

  it("groups by UTC day, oldest first, with readable labels", () => {
    const days = groupMessagesByDay(
      [
        {
          id: 3,
          senderId: "fan_1",
          content: "third",
          timestamp: "2026-09-21T09:00:00Z",
          isFromArtist: false,
        },
        {
          id: 1,
          senderId: "fan_1",
          content: "first",
          timestamp: "2026-09-19T09:00:00Z",
          isFromArtist: false,
        },
        {
          id: 2,
          senderId: "artist",
          content: "second",
          timestamp: "2026-09-20T09:00:00Z",
          isFromArtist: true,
        },
      ],
      now
    );

    expect(days.map((d) => d.date)).toEqual(["2026-09-19", "2026-09-20", "2026-09-21"]);
    expect(days[0].messages.map((m) => m.content)).toEqual(["first"]);
    expect(days[1].label).toBe("Yesterday");
    expect(days[1].messages.map((m) => m.content)).toEqual(["second"]);
    expect(days[2].label).toBe("Today");
  });

  it("returns nothing for an empty thread", () => {
    expect(groupMessagesByDay([], now)).toEqual([]);
  });
});

describe("startableFans", () => {
  it("only offers fans without an existing thread", () => {
    expect(startableFans(FANS, CONVERSATIONS).map((f) => f.id)).toEqual(["fan_3"]);
  });
});
