import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DASHBOARD_SEARCH_EVENT,
  KEYBOARD_SHORTCUTS_STORAGE_KEY,
  useKeyboardShortcuts,
} from "@/hooks/useKeyboardShortcuts";

function Harness({ onUpload = vi.fn() }: { onUpload?: () => void }) {
  const { enabled, setEnabled } = useKeyboardShortcuts({ onUpload });
  return (
    <>
      <span>{enabled ? "enabled" : "disabled"}</span>
      <button onClick={() => setEnabled(false)}>Disable shortcuts</button>
    </>
  );
}

afterEach(() => {
  window.localStorage.clear();
});

describe("useKeyboardShortcuts", () => {
  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Command", { metaKey: true }],
  ])("opens global search with %s+K", (_modifier, modifier) => {
    const onSearch = vi.fn();
    window.addEventListener(DASHBOARD_SEARCH_EVENT, onSearch);
    render(<Harness />);

    const prevented = !fireEvent.keyDown(window, { key: "k", ...modifier });

    expect(prevented).toBe(true);
    expect(onSearch).toHaveBeenCalledOnce();
    window.removeEventListener(DASHBOARD_SEARCH_EVENT, onSearch);
  });

  it("submits only the form containing the focused control on Cmd/Ctrl+S", () => {
    const onUpload = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <>
        <Harness onUpload={onUpload} />
        <form onSubmit={onSubmit}>
          <input aria-label="Current form field" />
        </form>
      </>
    );
    const input = screen.getByRole("textbox", { name: "Current form field" });
    input.focus();

    const prevented = !fireEvent.keyDown(input, { key: "s", ctrlKey: true });

    expect(prevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("leaves the browser save action alone when no form is focused", () => {
    render(<Harness />);
    expect(fireEvent.keyDown(window, { key: "s", metaKey: true })).toBe(true);
  });

  it("opens the music upload workflow with Ctrl/Cmd+U", () => {
    const onUpload = vi.fn();
    render(<Harness onUpload={onUpload} />);

    expect(fireEvent.keyDown(window, { key: "u", ctrlKey: true })).toBe(false);
    expect(onUpload).toHaveBeenCalledOnce();
  });

  it("persists the disabled preference and leaves keys untouched", async () => {
    const { unmount } = render(<Harness />);
    await screen.findByText("enabled");
    fireEvent.click(screen.getByRole("button", { name: "Disable shortcuts" }));

    await waitFor(() =>
      expect(window.localStorage.getItem(KEYBOARD_SHORTCUTS_STORAGE_KEY)).toBe("false")
    );
    unmount();

    render(<Harness />);
    await screen.findByText("disabled");
    expect(fireEvent.keyDown(window, { key: "k", ctrlKey: true })).toBe(true);
  });

  it("does not hijack modified browser shortcuts it does not own", () => {
    render(<Harness />);
    expect(fireEvent.keyDown(window, { key: "p", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(window, { key: "s", ctrlKey: true, shiftKey: true })).toBe(true);
  });
});
