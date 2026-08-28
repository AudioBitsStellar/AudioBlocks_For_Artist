import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MessagesPage from "@/app/dashboard/messages/page";

beforeAll(() => {
  // jsdom doesn't implement scrollIntoView; MessageThread calls it to keep
  // the latest message in view.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("MessagesPage", () => {
  it("shows fan conversations by default", () => {
    render(<MessagesPage />);
    expect(screen.getAllByText("Tomothy Nguyen").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Jaden Cole")).toHaveLength(0);
  });

  it("switches to artist conversations when the Artists tab is selected", () => {
    render(<MessagesPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Artists" }));

    expect(screen.getAllByText("Jaden Cole").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Tomothy Nguyen")).toHaveLength(0);
  });

  it("marks the active tab via aria-selected", () => {
    render(<MessagesPage />);

    const fansTab = screen.getByRole("tab", { name: "Fans" });
    const artistsTab = screen.getByRole("tab", { name: "Artists" });
    expect(fansTab).toHaveAttribute("aria-selected", "true");
    expect(artistsTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(artistsTab);

    expect(fansTab).toHaveAttribute("aria-selected", "false");
    expect(artistsTab).toHaveAttribute("aria-selected", "true");
  });
});
