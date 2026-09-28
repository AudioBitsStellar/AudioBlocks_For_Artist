import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardShortcuts from "@/components/DashboardShortcuts";
import {
  GOTO_PREFIX,
  GOTO_SHORTCUTS,
  SEQUENCE_TIMEOUT_MS,
  SHOW_HELP_KEY,
} from "@/utils/keyboardShortcuts";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

/** Types one keystroke into the page as the window would see it. */
function tap(key: string, init: KeyboardEventInit = {}) {
  return fireEvent.keyDown(window, { key, ...init });
}

/** Types a `g` sequence. */
function goto(secondKey: string) {
  tap(GOTO_PREFIX);
  return tap(secondKey);
}

function field(): HTMLInputElement {
  const element = document.createElement("input");
  document.body.append(element);
  return element;
}

afterEach(() => {
  push.mockClear();
  vi.useRealTimers();
});

describe("DashboardShortcuts navigation (#462)", () => {
  it("goes to a section on a two-key sequence", () => {
    render(<DashboardShortcuts />);
    expect(goto("a")).toBe(false); // consumed, so the key reaches no field behind it
    expect(push).toHaveBeenCalledWith("/dashboard/analytics");
  });

  it("reaches every bound section", () => {
    render(<DashboardShortcuts />);
    for (const entry of GOTO_SHORTCUTS) {
      push.mockClear();
      goto(entry.key);
      expect(push).toHaveBeenCalledWith(entry.href);
    }
  });

  it("reads a shifted second key as the same shortcut", () => {
    render(<DashboardShortcuts />);
    goto("T");
    expect(push).toHaveBeenCalledWith("/dashboard/team");
  });

  it("drops a sequence whose second key is unbound, without saving it", () => {
    render(<DashboardShortcuts />);
    tap(GOTO_PREFIX);
    tap("z");
    tap("a"); // a stale `g` must not turn this into a jump to Analytics
    expect(push).not.toHaveBeenCalled();

    goto("a");
    expect(push).toHaveBeenCalledWith("/dashboard/analytics");
  });

  it("gives up on a sequence the artist abandoned", () => {
    vi.useFakeTimers();
    render(<DashboardShortcuts />);
    tap(GOTO_PREFIX);
    vi.advanceTimersByTime(SEQUENCE_TIMEOUT_MS + 1);
    tap("a");
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves keystrokes to a focused field", () => {
    render(<DashboardShortcuts />);
    const trackTitle = field();
    fireEvent.keyDown(trackTitle, { key: GOTO_PREFIX });
    fireEvent.keyDown(trackTitle, { key: "a" });
    expect(push).not.toHaveBeenCalled();
    trackTitle.remove();
  });

  it("leaves browser combinations such as ⌘K alone", () => {
    render(<DashboardShortcuts />);
    expect(tap("k", { metaKey: true })).toBe(true); // not prevented: TopHeader owns it
    expect(tap("g", { ctrlKey: true })).toBe(true);
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DashboardShortcuts shortcut list", () => {
  it("opens on ? and lists every section", async () => {
    render(<DashboardShortcuts />);
    expect(tap(SHOW_HELP_KEY, { shiftKey: true })).toBe(false);
    const dialog = await screen.findByRole("dialog");
    for (const entry of GOTO_SHORTCUTS) {
      expect(dialog).toHaveTextContent(entry.label);
    }
    expect(dialog).toHaveTextContent("Search");
  });

  it("closes on the same key", async () => {
    render(<DashboardShortcuts />);
    tap(SHOW_HELP_KEY);
    await screen.findByRole("dialog");
    tap(SHOW_HELP_KEY);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes on Escape, which the dialog itself answers", async () => {
    render(<DashboardShortcuts />);
    tap(SHOW_HELP_KEY);
    await screen.findByRole("dialog");
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it("gets out of the way when a sequence navigates", async () => {
    render(<DashboardShortcuts />);
    tap(SHOW_HELP_KEY);
    await screen.findByRole("dialog");
    goto("e");
    expect(push).toHaveBeenCalledWith("/dashboard/events");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("has a close control an artist can reach without the keyboard", async () => {
    render(<DashboardShortcuts />);
    tap(SHOW_HELP_KEY);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Close keyboard shortcuts" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
