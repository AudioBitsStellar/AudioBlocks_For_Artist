import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { SessionProvider } from "@/components/SessionManager";
import { useLeaveGuard } from "@/hooks/useLeaveGuard";

const pushMock = vi.fn();
const refreshSessionMock = vi.fn();
const endSessionMock = vi.fn();
const clearQueryCacheMock = vi.fn();
const readSessionClaimsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/api/session", () => ({
  refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
  endSession: (...args: unknown[]) => endSessionMock(...args),
  readSessionClaims: () => readSessionClaimsMock(),
}));

vi.mock("@/api/queryClientInstance", () => ({
  clearQueryCache: () => clearQueryCacheMock(),
}));

function ActiveUploadHarness({ active }: { active: boolean }) {
  useLeaveGuard(active);
  return <div>{active ? "Uploading..." : "Idle"}</div>;
}

describe("SessionProvider / session-expiry warning (#589)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-24T12:00:00.000Z"));
    vi.clearAllMocks();
    localStorage.clear();
    readSessionClaimsMock.mockReturnValue(null);
    refreshSessionMock.mockResolvedValue(true);
    endSessionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the warning 2 minutes before JWT exp and counts down every second", () => {
    // Expires in 3 minutes (180 seconds)
    const expSeconds = Math.floor(Date.now() / 1000) + 180;
    readSessionClaimsMock.mockReturnValue({ exp: expSeconds });

    render(
      <SessionProvider>
        <div>Dashboard</div>
      </SessionProvider>
    );

    // At 3 minutes remaining, no warning yet
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Advance 59 seconds -> 121s remaining -> still no warning
    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Advance 1 more second -> 120s remaining -> warning appears
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByTestId("session-countdown")).toHaveTextContent("2m 00s");

    // Advance 5 seconds -> counts down to 1m 55s
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByTestId("session-countdown")).toHaveTextContent("1m 55s");
  });

  it("falls back to localStorage.token_expiry when JWT claims have no exp", () => {
    readSessionClaimsMock.mockReturnValue(null);
    localStorage.setItem("token_expiry", String(Date.now() + 90_000));

    render(
      <SessionProvider>
        <div>Dashboard</div>
      </SessionProvider>
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByTestId("session-countdown")).toHaveTextContent("1m 30s");
  });

  it("refreshes the session and dismisses the modal when clicking Stay signed in", async () => {
    const initialExp = Math.floor(Date.now() / 1000) + 60;
    readSessionClaimsMock.mockReturnValue({ exp: initialExp });
    refreshSessionMock.mockImplementation(async () => {
      // Simulate refreshed token with 30 minutes left
      readSessionClaimsMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1800 });
      return true;
    });

    render(
      <SessionProvider>
        <div>Dashboard</div>
      </SessionProvider>
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /stay signed in/i }));
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects to /login if Stay signed in fails to refresh", async () => {
    readSessionClaimsMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 60 });
    refreshSessionMock.mockResolvedValue(false);

    render(
      <SessionProvider>
        <div>Dashboard</div>
      </SessionProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /stay signed in/i }));
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(endSessionMock).toHaveBeenCalledTimes(1);
    expect(clearQueryCacheMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("ends session, clears cache, and redirects to /login when clicking Sign out", () => {
    readSessionClaimsMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 60 });

    render(
      <SessionProvider>
        <div>Dashboard</div>
      </SessionProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(endSessionMock).toHaveBeenCalledTimes(1);
    expect(clearQueryCacheMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("does not interrupt an active upload guarded by useLeaveGuard", () => {
    // Keep refresh failing so we can verify no modal/redirect happens during upload
    refreshSessionMock.mockResolvedValue(false);
    readSessionClaimsMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 60 });

    const { rerender } = render(
      <SessionProvider>
        <ActiveUploadHarness active={true} />
      </SessionProvider>
    );

    // Modal is suppressed while upload is active
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();

    // Even when time ticks past expiry during upload, do not kick the artist out
    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(pushMock).not.toHaveBeenCalled();

    // Once upload finishes, SessionProvider resumes enforcement
    rerender(
      <SessionProvider>
        <ActiveUploadHarness active={false} />
      </SessionProvider>
    );
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
