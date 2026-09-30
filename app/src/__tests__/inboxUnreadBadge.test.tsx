import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileNav from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import {
  INBOX_UNREAD_CHANGED_EVENT,
  notifyInboxUnreadChanged,
  subscribeToInboxUnread,
} from "@/services/inboxEvents";
import * as fanMessaging from "@/services/fanMessagingService";
import * as messageService from "@/services/messageService";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/overview",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

beforeEach(() => {
  fanMessaging.resetFanMessaging();
  window.localStorage?.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("inbox unread events (#146)", () => {
  it("notifies subscribers and stops after unsubscribe", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToInboxUnread(onChange);
    notifyInboxUnreadChanged();
    expect(onChange).toHaveBeenCalledTimes(1);

    // Cross-tab changes arrive as a storage event.
    window.dispatchEvent(new StorageEvent("storage"));
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    notifyInboxUnreadChanged();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("reading a fan conversation lowers the total and notifies the badges", () => {
    const listener = vi.fn();
    window.addEventListener(INBOX_UNREAD_CHANGED_EVENT, listener);
    try {
      const unreadThread = fanMessaging.findConversations("", "unread")[0];
      expect(unreadThread, "seed data should contain an unread fan thread").toBeDefined();
      const before = messageService.getTotalUnreadCount();
      // Captured first: findConversations returns the live store object.
      const threadUnread = unreadThread.unreadCount;

      fanMessaging.markConversationRead(unreadThread.id);

      expect(messageService.getTotalUnreadCount()).toBe(before - threadUnread);
      expect(listener).toHaveBeenCalled();
    } finally {
      window.removeEventListener(INBOX_UNREAD_CHANGED_EVENT, listener);
    }
  });

  it("opening an Artists-tab conversation marks it read and notifies once", () => {
    const artist = messageService.getConversations("artist").find((c) => c.unreadCount > 0);
    expect(artist, "seed data should contain an unread artist thread").toBeDefined();
    const listener = vi.fn();
    window.addEventListener(INBOX_UNREAD_CHANGED_EVENT, listener);
    try {
      const before = messageService.getTotalUnreadCount();
      const unread = artist!.unreadCount;

      messageService.markConversationRead(artist!.id);
      expect(messageService.getTotalUnreadCount()).toBe(before - unread);
      expect(listener).toHaveBeenCalledTimes(1);

      // Already read: no redundant notification.
      messageService.markConversationRead(artist!.id);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(INBOX_UNREAD_CHANGED_EVENT, listener);
    }
  });
});

describe("navigation unread badges (#146)", () => {
  it("MobileNav shows the unread count with screen-reader context", () => {
    vi.spyOn(messageService, "getTotalUnreadCount").mockReturnValue(4);
    render(<MobileNav />);
    const badge = screen.getByTestId("mobile-nav-unread-badge");
    expect(badge).toHaveTextContent("4 unread messages");
  });

  it("MobileNav hides the badge at zero and caps large counts", () => {
    const spy = vi.spyOn(messageService, "getTotalUnreadCount").mockReturnValue(0);
    render(<MobileNav />);
    expect(screen.queryByTestId("mobile-nav-unread-badge")).not.toBeInTheDocument();

    spy.mockReturnValue(150);
    act(() => notifyInboxUnreadChanged());
    expect(screen.getByTestId("mobile-nav-unread-badge")).toHaveTextContent(/^99\+/);
  });

  it("MobileNav updates live when the unread count changes", () => {
    const spy = vi.spyOn(messageService, "getTotalUnreadCount").mockReturnValue(3);
    render(<MobileNav />);
    expect(screen.getByTestId("mobile-nav-unread-badge")).toHaveTextContent("3");

    spy.mockReturnValue(1);
    act(() => notifyInboxUnreadChanged());
    expect(screen.getByTestId("mobile-nav-unread-badge")).toHaveTextContent("1");
  });

  it("Sidebar badge updates live instead of only on mount", () => {
    const spy = vi.spyOn(messageService, "getTotalUnreadCount").mockReturnValue(3);
    render(<Sidebar open={true} onClose={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();

    spy.mockReturnValue(1);
    act(() => notifyInboxUnreadChanged());
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
