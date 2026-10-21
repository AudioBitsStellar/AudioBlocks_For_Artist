import { describe, it, expect, afterEach, vi } from "vitest";
import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster, toast } from "sonner";
import Toast from "@/components/shared/Toast";
import {
  TOAST_DURATIONS,
  showToast,
  useHandleError,
  useHandleSuccess,
  useToast,
} from "@/hooks/useToastHandler";

// sonner doesn't render its <ol> until there's at least one toast.
const toastList = () => screen.getByRole("region", { name: /notifications/i });

afterEach(() => {
  act(() => {
    toast.dismiss();
  });
});

describe("Toast", () => {
  it("announces errors assertively with role=alert", () => {
    render(<Toast variant="error" message="Upload failed" description="Network error" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveTextContent("Upload failed");
    expect(alert).toHaveTextContent("Network error");
  });

  it.each(["success", "info", "loading"] as const)(
    "announces %s politely with role=status",
    (v) => {
      render(<Toast variant={v} message="Saved" />);
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
      expect(screen.queryByRole("alert")).toBeNull();
    }
  );

  it("renders a dismiss button only when dismissible", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Toast variant="success" message="Saved" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss notification/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    rerender(<Toast variant="loading" message="Saving…" />);
    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
  });
});

describe("useToastHandler with the global Toaster", () => {
  it("renders success and error toasts with the right roles and stacks them", async () => {
    render(<Toaster />);
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success("Profile saved");
      result.current.error("Mint failed");
    });

    const list = await waitFor(() => toastList());
    expect(within(list).getByRole("status")).toHaveTextContent("Profile saved");
    expect(within(list).getByRole("alert")).toHaveTextContent("Mint failed");
    expect(list.querySelectorAll("[data-sonner-toast]")).toHaveLength(2);
  });

  it("replaces a toast that shares an id instead of stacking a duplicate", async () => {
    render(<Toaster />);
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.loading("Uploading…", { id: "upload" });
    });
    await screen.findByText("Uploading…");

    act(() => {
      result.current.error("Failed to upload chunk.", undefined, { id: "upload" });
      result.current.error("Upload failed: timeout", undefined, { id: "upload" });
    });

    await screen.findByText("Upload failed: timeout");
    expect(screen.queryByText("Uploading…")).toBeNull();
    expect(screen.queryByText("Failed to upload chunk.")).toBeNull();
    expect(toastList().querySelectorAll("[data-sonner-toast]")).toHaveLength(1);
  });

  it("auto-dismisses after the duration", async () => {
    render(<Toaster />);
    act(() => {
      showToast("success", "Song uploaded", { duration: 50 });
    });
    await screen.findByText("Song uploaded");
    await waitFor(() => expect(screen.queryByText("Song uploaded")).toBeNull(), {
      timeout: 2000,
    });
  });

  it("dismisses from the close button", async () => {
    render(<Toaster />);
    act(() => {
      showToast("info", "Draft restored");
    });
    await userEvent.click(await screen.findByRole("button", { name: /dismiss notification/i }));
    await waitFor(() => expect(screen.queryByText("Draft restored")).toBeNull());
  });

  it("returns ids from showToast and loading() that dismiss() accepts", async () => {
    render(<Toaster />);
    const { result } = renderHook(() => useToast());

    let id: string | number = "";
    act(() => {
      id = result.current.loading("Minting…");
    });
    await screen.findByText("Minting…");
    expect(id).toBeTruthy();

    act(() => {
      result.current.dismiss(id);
    });
    await waitFor(() => expect(screen.queryByText("Minting…")).toBeNull());
  });

  it("uses per-variant default durations", () => {
    const spy = vi.spyOn(toast, "custom");
    showToast("success", "a");
    showToast("error", "b");
    showToast("loading", "c", { id: "x" });
    expect(spy.mock.calls.map(([, opts]) => opts)).toEqual([
      { id: undefined, duration: TOAST_DURATIONS.success, dismissible: true },
      { id: undefined, duration: TOAST_DURATIONS.error, dismissible: true },
      { id: "x", duration: Infinity, dismissible: false },
    ]);
    spy.mockRestore();
  });
});

describe("useHandleError message mapping", () => {
  const cases: Array<[Parameters<ReturnType<typeof useHandleError>>[0], string]> = [
    ["plain string", "plain string"],
    [{ message: "x", status: 400 }, "Invalid request. Please check your input."],
    [{ message: "x", status: 401 }, "Authentication required. Please log in."],
    [{ message: "x", status: 403 }, "Access denied. You don't have permission."],
    [{ message: "x", status: 404 }, "Resource not found."],
    [{ message: "x", status: 422 }, "Validation failed. Please check your input."],
    [{ message: "x", status: 500 }, "Server error. Please try again later."],
    [{ message: "Teapot", status: 418 }, "Teapot"],
    [{ message: "" }, "An error occurred"],
  ];

  it.each(cases)("maps %j", (error, expected) => {
    const spy = vi.spyOn(toast, "custom");
    const { result } = renderHook(() => useHandleError());
    result.current(error);
    const render = spy.mock.calls[0][0] as (id: string | number) => React.ReactElement;
    expect((render(1).props as { message: string }).message).toBe(expected);
    spy.mockRestore();
  });

  it("prefers a custom message and falls back for success", () => {
    const spy = vi.spyOn(toast, "custom");
    renderHook(() => useHandleError()).result.current({ message: "x", status: 500 }, "Custom");
    renderHook(() => useHandleSuccess()).result.current();
    const messages = spy.mock.calls.map(
      ([fn]) => ((fn as (id: number) => React.ReactElement)(1).props as { message: string }).message
    );
    expect(messages).toEqual(["Custom", "Operation completed successfully"]);
    spy.mockRestore();
  });
});
