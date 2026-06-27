import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import axios from "axios";
import Cookies from "js-cookie";

// -- Module mocks --------------------------------------------------------
vi.mock("@dynamic-labs/sdk-react-core", () => ({
  useDynamicContext: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("axios");
vi.mock("js-cookie");

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Auth } from "./useAuth";

// Helper: build a minimal dynamic context
function makeDynamicCtx(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    primaryWallet: null,
    handleLogOut: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAccount).mockReturnValue({ address: undefined } as any);
  vi.mocked(useDynamicContext).mockReturnValue(makeDynamicCtx() as any);
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
});

afterEach(() => {
  vi.restoreAllMocks();
});

// -----------------------------------------------------------------------

describe("Auth hook", () => {
  it("returns setShouldTriggerSignature, handleLogOut, loading", () => {
    const { result } = renderHook(() => Auth());
    expect(typeof result.current.setShouldTriggerSignature).toBe("function");
    expect(typeof result.current.handleLogOut).toBe("function");
    expect(result.current.loading).toBe(false);
  });

  it("does not fire signature flow when user / wallet / address are absent", async () => {
    const { result } = renderHook(() => Auth());
    await act(async () => {
      result.current.setShouldTriggerSignature(true);
    });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("sets audioblocks_jwt cookie and calls toast.success on successful login", async () => {
    const signMessage = vi.fn().mockResolvedValue("mock-sig");
    vi.mocked(useDynamicContext).mockReturnValue(
      makeDynamicCtx({
        user: { userId: "u1", email: "test@example.com" },
        primaryWallet: { signMessage },
      }) as any
    );
    vi.mocked(useAccount).mockReturnValue({ address: "0xABC" } as any);
    vi.mocked(axios.post).mockResolvedValue({
      data: { user: { token: "jwt-abc" }, message: "Logged in" },
    });

    const { result } = renderHook(() => Auth());

    await act(async () => {
      result.current.setShouldTriggerSignature(true);
    });

    // Wait for the async effect to settle
    await act(async () => {});

    expect(Cookies.set).toHaveBeenCalledWith("audioblocks_jwt", "jwt-abc");
    expect(toast.success).toHaveBeenCalledWith("Logged in");
  });

  it("registers and sets cookie when login returns 'user not found'", async () => {
    const signMessage = vi.fn().mockResolvedValue("mock-sig");
    vi.mocked(useDynamicContext).mockReturnValue(
      makeDynamicCtx({
        user: { userId: "u2", email: "new@example.com" },
        primaryWallet: { signMessage },
      }) as any
    );
    vi.mocked(useAccount).mockReturnValue({ address: "0xDEF" } as any);

    vi.mocked(axios.post)
      .mockRejectedValueOnce({
        response: { data: { message: "User not found" } },
      })
      .mockResolvedValueOnce({
        data: { user: { token: "reg-token" }, message: "Registered" },
      });

    const { result } = renderHook(() => Auth());

    await act(async () => {
      result.current.setShouldTriggerSignature(true);
    });
    await act(async () => {});

    expect(Cookies.set).toHaveBeenCalledWith("audioblocks_jwt", "reg-token");
    expect(toast.success).toHaveBeenCalledWith("Registered");
  });

  it("calls handleLogOut and toast.error on unexpected login failure", async () => {
    const signMessage = vi.fn().mockResolvedValue("mock-sig");
    const handleLogOut = vi.fn();
    vi.mocked(useDynamicContext).mockReturnValue(
      makeDynamicCtx({
        user: { userId: "u3", email: "err@example.com" },
        primaryWallet: { signMessage },
        handleLogOut,
      }) as any
    );
    vi.mocked(useAccount).mockReturnValue({ address: "0xERR" } as any);

    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { message: "Server error" } },
    });

    const { result } = renderHook(() => Auth());

    await act(async () => {
      result.current.setShouldTriggerSignature(true);
    });
    await act(async () => {});

    expect(handleLogOut).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Server error");
  });
});
