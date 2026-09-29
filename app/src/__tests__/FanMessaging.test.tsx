import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import FanInbox from "@/components/fanMessaging/FanInbox";
import { resetFanMessaging } from "@/services/fanMessagingService";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  resetFanMessaging();
  localStorage.clear();
});

describe("FanInbox (#419)", () => {
  it("lists fan conversations newest first and reports the unread total", () => {
    render(<FanInbox />);

    const rows = screen.getAllByRole("button", { name: /Nguyen|Howard|Robertson|Adeyemi/ });
    expect(rows[0]).toHaveTextContent("Tomothy Nguyen");
    expect(screen.getByText(/3 unread messages/i)).toBeInTheDocument();
  });

  it("filters to unread conversations only", () => {
    render(<FanInbox />);

    fireEvent.click(screen.getByRole("button", { name: "Unread" }));

    expect(screen.getByText("Tomothy Nguyen")).toBeInTheDocument();
    expect(screen.queryByText("Evan Howard")).not.toBeInTheDocument();
  });

  it("searches message bodies, not just names", () => {
    render(<FanInbox />);

    fireEvent.change(screen.getByLabelText("Search conversations"), {
      target: { value: "touring near Lagos" },
    });

    expect(screen.getByText("Victoria Robertson")).toBeInTheDocument();
    expect(screen.queryByText("Evan Howard")).not.toBeInTheDocument();
  });

  it("opens a thread, clears its unread badge and sends a reply", () => {
    render(<FanInbox />);

    fireEvent.click(screen.getByRole("button", { name: /Tomothy Nguyen/ }));
    expect(screen.getByText(/1 unread message\./)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Reply to Tomothy Nguyen"), {
      target: { value: "Album drops in October!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByText("Album drops in October!")).toBeInTheDocument();
    expect(screen.getByLabelText("Reply to Tomothy Nguyen")).toHaveValue("");
  });

  it("refuses to send a blank message and explains why", () => {
    render(<FanInbox />);

    fireEvent.click(screen.getByRole("button", { name: /Tomothy Nguyen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/write a message/i);
  });

  it("starts a brand new conversation from the fan picker", () => {
    render(<FanInbox />);

    fireEvent.click(screen.getByRole("button", { name: "New message" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Sofia Marino")).toBeInTheDocument();
    expect(within(dialog).queryByText("Tomothy Nguyen")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByText("Sofia Marino"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/start of your conversation with Sofia Marino/i)).toBeInTheDocument();
  });

  it("mutes a thread and locks the composer until it is unmuted", () => {
    render(<FanInbox />);

    fireEvent.click(screen.getByRole("button", { name: /Victoria Robertson/ }));
    fireEvent.click(screen.getByRole("button", { name: "Mute" }));

    expect(screen.getByRole("button", { name: "Unmute" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(screen.getByLabelText("Reply to Victoria Robertson")).toHaveAttribute(
      "placeholder",
      "Unmute to reply"
    );
  });
});
