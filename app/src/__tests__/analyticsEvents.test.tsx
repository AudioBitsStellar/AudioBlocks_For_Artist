/**
 * Analytics coverage for the artist-portal events added in #464.
 *
 * Two layers, mirroring `src/lib/ANALYTICS.md`: the façade maps each typed
 * helper onto the right Segment event, and the components actually reach the
 * façade from their real handlers.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotificationBell from "@/components/NotificationBell";
import { Sidebar } from "@/components/Sidebar";
import { analytics } from "@/lib/analytics";

vi.mock("@/lib/featureFlags", () => ({
  featureFlags: { useMockNotifications: true },
}));

// Same stand-ins `Sidebar.test.tsx` uses: the sidebar is rendered outside a
// Next router here, so `usePathname` and the `next/*` components are stubbed.
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/overview" }));

vi.mock("next/link", () => ({
  __esModule: true,
  default: React.forwardRef(function MockLink(
    {
      children,
      href,
      onClick,
      ...props
    }: { children: React.ReactNode; href: string; onClick?: (event: unknown) => void },
    ref: React.Ref<HTMLAnchorElement>
  ) {
    return (
      <a
        ref={ref}
        href={href}
        onClick={(event) => {
          onClick?.(event);
          // jsdom can't navigate, and the anchors point at real dashboard routes.
          event.preventDefault();
        }}
        {...props}
      >
        {children}
      </a>
    );
  }),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const mockTrack = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "write-key-under-test");
  Object.assign(window, { analytics: { track: mockTrack } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as { analytics?: unknown }).analytics;
  mockTrack.mockClear();
});

describe("analytics façade", () => {
  it.each([
    ["uploadModeSelected", { mode: "album" as const }, "upload_mode_selected"],
    ["navItemClicked", { item: "Events", href: "/dashboard/events" }, "nav_item_clicked"],
    ["analyticsRangeChanged", { range: "last90days" as const }, "analytics_range_changed"],
    ["merchStockAdjusted", { itemId: 4, change: -2, newStock: 12 }, "merch_stock_adjusted"],
    ["notificationsPanelOpened", { unreadCount: 3 }, "notifications_panel_opened"],
    [
      "notificationClicked",
      { notificationId: "notif_1", kind: "earnings", hasLink: true },
      "notification_clicked",
    ],
    ["notificationsAllMarkedRead", { unreadCount: 2 }, "notifications_all_marked_read"],
  ] as const)("%s emits a %s event with its properties", (helper, props, eventName) => {
    (analytics[helper] as (input: typeof props) => void)(props);

    expect(mockTrack).toHaveBeenCalledWith(eventName, props);
  });

  it("stays silent when the write key is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WRITE_KEY", "");

    analytics.navItemClicked({ item: "Events", href: "/dashboard/events" });

    expect(mockTrack).not.toHaveBeenCalled();
  });
});

describe("NotificationBell", () => {
  const renderBell = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <NotificationBell />
      </QueryClientProvider>
    );
  };

  it("tracks opening the panel with the unread count at that moment", () => {
    renderBell();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    });

    expect(mockTrack).toHaveBeenCalledWith("notifications_panel_opened", { unreadCount: 3 });
  });

  it("tracks which kind of notification was clicked, without its text", () => {
    renderBell();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    });
    mockTrack.mockClear();

    act(() => {
      fireEvent.click(screen.getByText("Tomothy Nguyen started following you."));
    });

    const call = mockTrack.mock.calls.find(([event]) => event === "notification_clicked");
    expect(call?.[1]).toMatchObject({ kind: "newFan", hasLink: true });
    expect(JSON.stringify(call?.[1])).not.toContain("Tomothy");
  });

  it("tracks marking everything read", () => {
    renderBell();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    });
    mockTrack.mockClear();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /mark all as read/i }));
    });

    expect(mockTrack).toHaveBeenCalledWith("notifications_all_marked_read", { unreadCount: 3 });
  });
});

describe("Sidebar", () => {
  it("tracks nav clicks with the item and its destination", () => {
    render(<Sidebar open={false} onClose={vi.fn()} />);

    act(() => {
      fireEvent.click(screen.getByRole("link", { name: /events/i }));
    });

    expect(mockTrack).toHaveBeenCalledWith("nav_item_clicked", {
      item: "Events",
      href: "/dashboard/events",
    });
  });
});
