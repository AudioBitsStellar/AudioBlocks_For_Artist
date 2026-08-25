import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TopHeader from "@/components/TopHeader";
import { RoleProvider } from "@/context/RoleContext";

// ---------- Helpers ----------

function renderTopHeader(
  ui: React.ReactNode,
  opts?: { wrapper?: "role-owner" | "role-viewer" | "none" }
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function BaseWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  function withRole(role: "owner" | "manager" | "viewer") {
    return ({ children }: { children: React.ReactNode }) => (
      <BaseWrapper>
        <RoleProvider initialRole={role}>{children}</RoleProvider>
      </BaseWrapper>
    );
  }
  const Wrapper =
    opts?.wrapper === "role-owner"
      ? withRole("owner")
      : opts?.wrapper === "role-viewer"
        ? withRole("viewer")
        : BaseWrapper;
  return render(<Wrapper>{ui}</Wrapper>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

// ---------- User info ----------

describe("TopHeader – user info display", () => {
  it("renders the default welcome heading with placeholder name", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    // default user name is "Pete Lisk"
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/Welcome, Pete Lisk/i);
  });

  it("renders an explicit user name override", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} userName="Ada Lovelace" />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/Welcome, Ada Lovelace/i);
  });

  it("renders a profile link to /dashboard/profile", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    const link = screen.getByRole("link", { name: /go to profile/i });
    expect(link).toHaveAttribute("href", "/dashboard/profile");
  });
});

// ---------- Notification badge ----------

describe("TopHeader – notification badge", () => {
  it("renders a dot (no count) when notificationCount is 0", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} notificationCount={0} />);

    const link = screen.getByRole("link", { name: /notifications/i });
    expect(within(link).getByTestId("notification-dot")).toBeInTheDocument();
    expect(within(link).queryByTestId("notification-count")).not.toBeInTheDocument();
  });

  it("renders the correct number when notificationCount is positive", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} notificationCount={3} />);

    const link = screen.getByRole("link", { name: /notifications/i });
    const count = within(link).getByTestId("notification-count");
    expect(count).toHaveTextContent("3");
  });

  it("caps the badge display at 99+ for large counts", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} notificationCount={150} />);

    const link = screen.getByRole("link", { name: /notifications/i });
    const count = within(link).getByTestId("notification-count");
    expect(count).toHaveTextContent("99+");
  });

  it("hides the badge entirely when notificationCount is null", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} notificationCount={null} />);

    const link = screen.getByRole("link", { name: /notifications/i });
    expect(within(link).queryByTestId("notification-dot")).not.toBeInTheDocument();
    expect(within(link).queryByTestId("notification-count")).not.toBeInTheDocument();
  });

  it("renders a dot when notificationCount is omitted (undefined)", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    const link = screen.getByRole("link", { name: /notifications/i });
    expect(within(link).getByTestId("notification-dot")).toBeInTheDocument();
  });

  it("navigates to /dashboard/settings/notifications when clicked", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} notificationCount={4} />);

    const link = screen.getByRole("link", { name: /notifications/i });
    expect(link).toHaveAttribute("href", "/dashboard/settings/notifications");
  });

  it("updates the aria-label with the count when present", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} notificationCount={7} />);
    expect(
      screen.getByRole("link", { name: /Notifications and settings \(7 new\)/i })
    ).toBeInTheDocument();
  });
});

// ---------- Theme toggle ----------

describe("TopHeader – theme toggle", () => {
  it("renders a theme toggle button", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    const toggle = screen.getByRole("button", { name: /switch to (dark|light) mode/i });
    expect(toggle).toBeInTheDocument();
  });

  it("toggles the html.dark class on click", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    const toggle = screen.getByRole("button", { name: /switch to dark mode/i });

    act(() => {
      fireEvent.click(toggle);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("toggles from dark back to light", () => {
    localStorage.setItem("theme", "dark");

    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    const toggle = screen.getByRole("button", { name: /switch to light mode/i });

    act(() => {
      fireEvent.click(toggle);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});

// ---------- Hamburger menu ----------

describe("TopHeader – hamburger menu", () => {
  it("renders the menu button and forwards click to handler", () => {
    const onMenuClick = vi.fn();
    renderTopHeader(<TopHeader onMenuClick={onMenuClick} />);

    const btn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(btn).toBeInTheDocument();

    act(() => {
      fireEvent.click(btn);
    });

    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it("reflects sidebarOpen state via aria-expanded", () => {
    const { rerender } = renderTopHeader(<TopHeader onMenuClick={() => {}} sidebarOpen={false} />);
    expect(screen.getByRole("button", { name: /open navigation menu/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );

    rerender(<TopHeader onMenuClick={() => {}} sidebarOpen={true} />);
    expect(screen.getByRole("button", { name: /open navigation menu/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
});

// ---------- Search bar ----------

describe("TopHeader – search bar", () => {
  it("renders a desktop search input", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);
    expect(screen.getAllByRole("searchbox", { name: /search/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("updates as the user types in the search input", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    const inputs = screen.getAllByRole("searchbox", { name: /search/i });
    const desktopInput = inputs.find((el) => el.getAttribute("placeholder")?.includes("artists"));
    expect(desktopInput).toBeTruthy();

    fireEvent.change(desktopInput!, { target: { value: "Beatles" } });
    expect((desktopInput as HTMLInputElement).value).toBe("Beatles");
  });
});

// ---------- Date/time ----------

describe("TopHeader – date and time display", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin to a deterministic instant so locale formatters render predictable text.
    vi.setSystemTime(new Date("2025-01-15T10:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a date and time string under the welcome heading", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    const dateParagraph = screen.getByText(/\|/).closest("p");
    expect(dateParagraph).not.toBeNull();

    const text = dateParagraph!.textContent ?? "";
    // The pinned-to-UTC instant renders some date in en-GB format plus the "|".
    expect(text).toMatch(/\|/);
    expect(text.length).toBeGreaterThan(5);
  });

  it("updates the displayed time when the minute boundary is crossed", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />);

    const beforeText = (screen.getByText(/\|/).closest("p")?.textContent ?? "").trim();

    // Advance past the 60s internal `updateDateTime` interval.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    const afterText = (screen.getByText(/\|/).closest("p")?.textContent ?? "").trim();

    // Both timestamps must render non-empty strings.
    expect(beforeText).not.toBe("");
    expect(afterText).not.toBe("");
    // And because we crossed a minute boundary, the rendered text must differ.
    expect(afterText).not.toBe(beforeText);
  });
});

// ---------- Role badge (RBAC – related to issue #173) ----------

describe("TopHeader – role badge", () => {
  it("does not throw when no RoleProvider is mounted (uses fallback)", () => {
    expect(() =>
      renderTopHeader(<TopHeader onMenuClick={() => {}} />, { wrapper: "none" })
    ).not.toThrow();
  });

  it("reflects role from context", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} />, { wrapper: "role-owner" });
    const badge = screen.getByTestId("role-badge");
    expect(badge).toHaveAttribute("data-role", "owner");
    expect(badge).toHaveTextContent(/owner/i);
  });

  it("respects an explicit userRole prop", () => {
    renderTopHeader(<TopHeader onMenuClick={() => {}} userRole="manager" />, {
      wrapper: "role-owner",
    });
    expect(screen.getByTestId("role-badge")).toHaveTextContent("manager");
  });
});
