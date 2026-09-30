import { describe, it, expect } from "vitest";
import { getUnreadTotal as getFanUnreadTotal } from "@/services/fanMessagingService";
import {
  getConversations,
  getConversation,
  getTotalUnreadCount,
  sendMessage,
} from "@/services/messageService";

describe("messageService", () => {
  it("returns only fan conversations for type 'fan'", () => {
    const conversations = getConversations("fan");
    expect(conversations.length).toBeGreaterThan(0);
    expect(conversations.every((c) => c.type === "fan")).toBe(true);
  });

  it("returns only artist conversations for type 'artist'", () => {
    const conversations = getConversations("artist");
    expect(conversations.length).toBeGreaterThan(0);
    expect(conversations.every((c) => c.type === "artist")).toBe(true);
  });

  it("keeps fan and artist conversations disjoint", () => {
    const fanIds = getConversations("fan").map((c) => c.id);
    const artistIds = getConversations("artist").map((c) => c.id);
    expect(fanIds.some((id) => artistIds.includes(id))).toBe(false);
  });

  it("finds a conversation of either type by id", () => {
    const fan = getConversations("fan")[0];
    const artist = getConversations("artist")[0];
    expect(getConversation(fan.id)?.type).toBe("fan");
    expect(getConversation(artist.id)?.type).toBe("artist");
  });

  it("counts fan-inbox unread plus Artists-tab unread (#146)", () => {
    // The Fans tab renders the fanMessagingService inbox, so the badge must
    // count that store (muted threads excluded), not this module's legacy
    // fan mocks, which the Messages page no longer shows.
    const artistUnread = getConversations("artist").reduce((sum, c) => sum + c.unreadCount, 0);
    expect(getTotalUnreadCount()).toBe(getFanUnreadTotal() + artistUnread);
  });

  it("appends a message to an artist conversation and updates its preview", () => {
    const artistConversation = getConversations("artist")[0];
    const previousCount = artistConversation.messages.length;

    const message = sendMessage({
      conversationId: artistConversation.id,
      content: "Let's finalize the collab this week.",
    });

    expect(message.isFromArtist).toBe(true);
    expect(message.content).toBe("Let's finalize the collab this week.");

    const updated = getConversation(artistConversation.id);
    expect(updated?.messages.length).toBe(previousCount + 1);
    expect(updated?.lastMessage).toBe("Let's finalize the collab this week.");
  });
});
