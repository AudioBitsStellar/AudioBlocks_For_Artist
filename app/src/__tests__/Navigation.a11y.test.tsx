/**
 * Accessibility tests for the primary navigation surfaces (issue #190).
 *
 * Covers Sidebar, TopHeader and Breadcrumb:
 *   - ARIA landmarks, navigation roles and heading hierarchy
 *   - List markup and `aria-current` on breadcrumbs
 *   - Keyboard traversal through every navigation control
 *   - axe-core audits for WCAG violations
 *
 * `toHaveNoViolations` is registered globally in src/test/setup.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RoleProvider } from "@/context/RoleContext";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import Breadcrumb from "@/components/Breadcrumb";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/overview",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/services/messageService", () => ({
  getTotalUnreadCount: () => 0,
}));

vi.mock("@/services/inboxEvents", () => ({
  subscribeToInboxUnread: () => () => {},
}));

vi.mock("@/lib/analytics", () => ({
  analytics: { navItemClicked: vi.fn() },
}));

vi.mock("@/utils/jwt", () => ({
  isAdminSession: () => false,
  getRoleFromToken: () => null,
  getDisplayNameFromToken: () => "Test Artist",
}));

vi.mock("@/services/notificationService", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

function renderTopHeader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RoleProvider initialRole="owner">
        <TopHeader onMenuClick={vi.fn()} />
      </RoleProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Sidebar accessibility", () => {
  it("exposes navigation landmarks and an accessible name", async () => {
    const { container } = render(<Sidebar open={false} onClose={vi.fn()} />);

    expect(screen.getByRole("navigation", { name: "Sidebar navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("keeps the inner navigation landmark when the mobile drawer is open", async () => {
    const { container } = render(<Sidebar open={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Sidebar navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("moves focus through every navigation item with the keyboard", () => {
    render(<Sidebar open={true} onClose={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const links = within(nav).getAllByRole("link");
    expect(links.length).toBeGreaterThan(1);

    links[0].focus();
    expect(links[0]).toHaveFocus();

    fireEvent.keyDown(links[0], { key: "ArrowDown" });
    expect(links[1]).toHaveFocus();

    fireEvent.keyDown(links[1], { key: "ArrowUp" });
    expect(links[0]).toHaveFocus();

    fireEvent.keyDown(links[0], { key: "End" });
    expect(links[links.length - 1]).toHaveFocus();

    fireEvent.keyDown(links[links.length - 1], { key: "Home" });
    expect(links[0]).toHaveFocus();
  });

  it("makes every navigation control reachable with Tab", async () => {
    const user = userEvent.setup();
    render(<Sidebar open={true} onClose={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const links = within(nav).getAllByRole("link");

    links[0].focus();
    expect(links[0]).toHaveFocus();

    await user.tab();
    expect(links[1]).toHaveFocus();
  });
});

describe("TopHeader accessibility", () => {
  it("exposes a banner landmark and a level-two heading", async () => {
    const { container } = renderTopHeader();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("moves through the header controls with Tab", async () => {
    const user = userEvent.setup();
    renderTopHeader();

    const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
    const searchButton = screen.getByRole("button", { name: /open search/i });

    await user.tab();
    expect(menuButton).toHaveFocus();

    await user.tab();
    expect(searchButton).toHaveFocus();
  });

  it("activates the menu control from the keyboard", async () => {
    const user = userEvent.setup();
    const onMenuClick = vi.fn();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <RoleProvider initialRole="owner">
          <TopHeader onMenuClick={onMenuClick} />
        </RoleProvider>
      </QueryClientProvider>
    );

    const menuButton = screen.getByRole("button", { name: /open navigation menu/i });
    menuButton.focus();
    await user.keyboard("{Enter}");

    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });
});

describe("Breadcrumb accessibility", () => {
  const items = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Music", href: "/dashboard/my-music" },
    { label: "Album", isActive: true },
  ];

  it("uses navigation/list markup and marks the current page", async () => {
    const { container } = render(<Breadcrumb items={items} />);

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("list")).toBeInTheDocument();
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Album")).toHaveAttribute("aria-current", "page");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("makes links and action crumbs keyboard reachable and activatable", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Album", onClick: onSelect, isActive: true },
        ]}
      />
    );

    const link = screen.getByRole("link", { name: "Dashboard" });
    const action = screen.getByRole("button", { name: "Album" });

    await user.tab();
    expect(link).toHaveFocus();

    await user.tab();
    expect(action).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
