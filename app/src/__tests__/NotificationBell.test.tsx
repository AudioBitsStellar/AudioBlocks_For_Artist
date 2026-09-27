import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import NotificationBell from "@/components/NotificationBell";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  saveNotificationPreferences,
} from "@/services/notificationPreferences";

// Drive the real hook with mock data so no request leaves the test.
vi.mock("@/lib/featureFlags", () => ({
  featureFlags: { useMockNotifications: true },
}));

function renderBell(ui = <NotificationBell />) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <div>
        {ui}
        <p>Outside</p>
      </div>
    </QueryClientProvider>
  );
}

const getBell = () => screen.getByRole("button", { name: /^notifications/i });
const openDropdown = () => {
  act(() => {
    fireEvent.click(getBell());
  });
  return screen.getByRole("region", { name: "Notifications" });
};

beforeEach(() => {
  localStorage.clear();
});

describe("NotificationBell", () => {
  it("shows the unread count from mock notifications and starts closed", () => {
    renderBell();

    expect(getBell()).toHaveAccessibleName("Notifications (4 unread)");
    expect(getBell()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("opens a dropdown listing notifications newest first", () => {
    renderBell();
    const panel = openDropdown();

    expect(getBell()).toHaveAttribute("aria-expanded", "true");
    expect(panel).toHaveFocus();
    const items = within(panel).getAllByRole("listitem");
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent("Tomothy Nguyen started following you.");
    expect(within(panel).getAllByTestId("notification-unread-dot")).toHaveLength(4);
  });

  it("marks a notification as read when it is selected", () => {
    renderBell();
    const panel = openDropdown();
    const link = within(panel).getByRole("link", { name: /started following you/i });
    // jsdom can't navigate; stop the anchor's default action after onClick runs.
    link.addEventListener("click", (e) => e.preventDefault());

    act(() => {
      fireEvent.click(link);
    });

    expect(getBell()).toHaveAccessibleName("Notifications (3 unread)");
  });

  it("marks everything as read and disables the action afterwards", () => {
    renderBell();
    const panel = openDropdown();
    const markAll = within(panel).getByRole("button", { name: /mark all as read/i });

    act(() => {
      fireEvent.click(markAll);
    });

    expect(within(panel).queryAllByTestId("notification-unread-dot")).toHaveLength(0);
    expect(markAll).toBeDisabled();
    expect(getBell()).toHaveAccessibleName("Notifications");
    expect(within(getBell()).queryByTestId("notification-count")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the bell", () => {
    renderBell();
    openDropdown();

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
    expect(getBell()).toHaveFocus();
  });

  it("closes when clicking outside", () => {
    renderBell();
    openDropdown();

    act(() => {
      fireEvent.pointerDown(screen.getByText("Outside"));
    });

    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("links to the notification settings page", () => {
    renderBell();
    const panel = openDropdown();

    expect(within(panel).getByRole("link", { name: "Notification settings" })).toHaveAttribute(
      "href",
      "/dashboard/settings/notifications"
    );
  });

  it("hides kinds the artist muted for in-app delivery", () => {
    saveNotificationPreferences({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      newFan: { email: false, inApp: false },
    });
    renderBell();
    const panel = openDropdown();

    expect(within(panel).getAllByRole("listitem")).toHaveLength(5);
    expect(within(panel).queryByText(/started following you/i)).not.toBeInTheDocument();
    expect(getBell()).toHaveAccessibleName("Notifications (3 unread)");
  });

  it("shows an empty state when every kind is muted", () => {
    saveNotificationPreferences({
      newFan: { email: false, inApp: false },
      earnings: { email: false, inApp: false },
      eventReminder: { email: false, inApp: false },
      qualityCheck: { email: false, inApp: false },
    });
    renderBell();
    const panel = openDropdown();

    expect(within(panel).getByText(/all caught up/i)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: /mark all as read/i })).toBeDisabled();
  });

  it("respects an explicit notificationCount override", () => {
    renderBell(<NotificationBell notificationCount={null} />);

    expect(within(getBell()).queryByTestId("notification-count")).not.toBeInTheDocument();
  });

  it("open dropdown has no axe violations", async () => {
    const { container } = renderBell();
    openDropdown();

    expect(await axe(container)).toHaveNoViolations();
  });
});
