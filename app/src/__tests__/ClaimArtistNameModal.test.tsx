import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import ClaimArtistNameModal from "@/components/common/modals/ClaimArtistNameModal";
import { fetchArtistHandleProfile } from "@/lib/claimArtistHandle";
import type { PublicArtistProfileResult } from "@/lib/claimArtistHandle";

const { save, push, profileQuery } = vi.hoisted(() => ({
  save: vi.fn(),
  push: vi.fn(),
  profileQuery: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/services/artistServices", () => ({
  default: () => ({
    useUpdateArtistProfile: () => ({ mutateAsync: save }),
    useGetArtistProfile: profileQuery,
  }),
}));
vi.mock("@/lib/claimArtistHandle", async (original) => ({
  ...(await original<typeof import("@/lib/claimArtistHandle")>()),
  fetchArtistHandleProfile: vi.fn(),
}));
const lookup = vi.mocked(fetchArtistHandleProfile);
const change = (name: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: "Artist handle" }), {
    target: { value: name },
  });
const debounce = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
};
const available = async () => {
  change("Solo.Sound");
  await debounce();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  lookup.mockReset().mockResolvedValue({ status: "not-found" });
  save.mockReset().mockResolvedValue({ success: true });
  profileQuery.mockReturnValue({ data: { user: { id: "12345678-1234-1234-1234-123456789abc" } } });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ClaimArtistNameModal", () => {
  it("does not offer a broken handle URL when the artist ID is unavailable", async () => {
    profileQuery.mockReturnValue({ data: undefined });
    const close = vi.fn();
    render(<ClaimArtistNameModal open onOpenChange={close} />);
    await available();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    });
    expect(screen.queryByRole("button", { name: "View public profile" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(close).toHaveBeenCalledWith(false);
    expect(push).not.toHaveBeenCalled();
  });
  it("debounces and announces a taken name, preventing progression", async () => {
    lookup.mockResolvedValue({
      status: "ok",
      profile: { id: "1", handle: "existing", name: "Existing" },
    });
    render(<ClaimArtistNameModal open onOpenChange={vi.fn()} />);
    change("ex");
    change("existing");
    expect(screen.getByText("Checking availability...")).toHaveAttribute("aria-live", "polite");
    expect(lookup).not.toHaveBeenCalled();
    await debounce();
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith("existing", expect.any(AbortSignal));
    expect(screen.getByText("Username taken")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("uses public-route normalization and invalidates availability immediately on edit", async () => {
    render(<ClaimArtistNameModal open onOpenChange={vi.fn()} />);
    change(" @Solo.Sound ");
    await debounce();
    expect(lookup).toHaveBeenLastCalledWith("Solo.Sound", expect.any(AbortSignal));
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    change("Solo.Sound");
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    change("Other");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.queryByText("Username available")).not.toBeInTheDocument();
    change("<invalid>");
    await debounce();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("ignores and aborts stale requests even if they finish last", async () => {
    const old = deferred<PublicArtistProfileResult>();
    lookup.mockReturnValueOnce(old.promise).mockResolvedValueOnce({
      status: "ok",
      profile: { id: "2", handle: "taken", name: "Taken" },
    });
    render(<ClaimArtistNameModal open onOpenChange={vi.fn()} />);
    change("first");
    await debounce();
    const signal = lookup.mock.calls[0][1]!;
    change("taken");
    await debounce();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      old.resolve({ status: "not-found" });
    });
    expect(screen.getByText("Username taken")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it.each(["unavailable", "rejection"])(
    "offers a retry for %s rather than declaring the handle available",
    async (mode) => {
      if (mode === "rejection") lookup.mockRejectedValueOnce(new Error("network"));
      else lookup.mockResolvedValueOnce({ status: "unavailable" });
      render(<ClaimArtistNameModal open onOpenChange={vi.fn()} />);
      change("handle");
      await debounce();
      expect(screen.getByText("Could not check availability. Please try again.")).toHaveAttribute(
        "aria-live",
        "polite"
      );
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Retry availability check" }));
      });
      expect(screen.getByText("Username available")).toBeInTheDocument();
    }
  );

  it("saves only the normalized username and waits for success before showing completion", async () => {
    const pending = deferred<unknown>();
    save.mockReturnValueOnce(pending.promise);
    const close = vi.fn();
    render(<ClaimArtistNameModal open onOpenChange={close} />);
    await available();
    const complete = screen.getByRole("button", { name: "Complete" });
    fireEvent.click(complete);
    fireEvent.click(complete);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ username: "Solo.Sound" });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.queryByText("Artist handle saved")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(screen.getByRole("heading", { name: "Artist handle saved" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View public profile" }));
    expect(close).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith("/artist/12345678-1234-1234-1234-123456789abc");
  });

  it("handles a save-time 409 and requires a different handle", async () => {
    save.mockRejectedValueOnce({ status: 409, message: "Conflict" });
    render(<ClaimArtistNameModal open onOpenChange={vi.fn()} />);
    await available();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    });
    expect(screen.getByText("Username taken")).toBeInTheDocument();
    expect(screen.getByText(/Someone claimed this handle/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await debounce();
    expect(lookup).toHaveBeenCalledTimes(1);
    change("another");
    await debounce();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("retains the form after a failed save and allows retry", async () => {
    save.mockRejectedValueOnce({ status: 500 });
    render(<ClaimArtistNameModal open onOpenChange={vi.fn()} />);
    await available();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    });
    expect(
      screen.getByText("Your handle could not be saved. Please try again.")
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    });
    expect(screen.getByText("Artist handle saved")).toBeInTheDocument();
  });

  it("cleans up a closed session and ignores late save completion", async () => {
    const pending = deferred<unknown>();
    save.mockReturnValueOnce(pending.promise);
    const close = vi.fn();
    const { rerender } = render(<ClaimArtistNameModal open onOpenChange={close} />);
    await available();
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    rerender(<ClaimArtistNameModal open={false} onOpenChange={close} />);
    rerender(<ClaimArtistNameModal open onOpenChange={close} />);
    await act(async () => {
      pending.resolve({ success: true });
    });
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("has accessible search, confirmation and success states", async () => {
    vi.useRealTimers();
    render(<ClaimArtistNameModal open onOpenChange={vi.fn()} />);
    expect((await axe(document.body)).violations).toEqual([]);
    change("Solo.Sound");
    await screen.findByText("Username available");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Claim Your Artist Name" })).toHaveFocus();
    expect((await axe(document.body)).violations).toEqual([]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    });
    expect((await axe(document.body)).violations).toEqual([]);
  });

  it("closes with Escape", () => {
    const close = vi.fn();
    render(<ClaimArtistNameModal open onOpenChange={close} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(close).toHaveBeenCalledWith(false);
  });
});
