import { describe, expect, it, vi, beforeEach } from "vitest";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock("sonner", () => ({
  toast: { error: toastError, success: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

import { ApiError, extractApiError } from "@/api/axios";
import { newRequestId, requestIdFromHeaders } from "@/api/requestId";
import { useHandleError } from "@/hooks/useToastHandler";
import { renderHook, act } from "@testing-library/react";

// OBS-04: a failed request has to give the user something to quote. These
// tests pin the header name, the fallback chain (response echo, then the id
// the client sent) and the toast that shows it.

describe("newRequestId", () => {
  it("returns a distinct id per call", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newRequestId()));
    expect(ids.size).toBe(50);
  });

  it("is non-empty and safe to put in a header", () => {
    const id = newRequestId();
    expect(id.length).toBeGreaterThan(8);
    expect(id).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});

describe("requestIdFromHeaders", () => {
  it("reads the lower-case header axios exposes", () => {
    expect(requestIdFromHeaders({ "x-request-id": "abc-123" })).toBe("abc-123");
  });

  it("reads the upper-case form too", () => {
    expect(requestIdFromHeaders({ "X-Request-ID": "abc-123" })).toBe("abc-123");
  });

  it("returns undefined when the backend echoed nothing", () => {
    expect(requestIdFromHeaders({})).toBeUndefined();
    expect(requestIdFromHeaders(undefined)).toBeUndefined();
    expect(requestIdFromHeaders("nope")).toBeUndefined();
  });
});

describe("extractApiError", () => {
  function axiosError(headers: Record<string, string>, requestId?: string) {
    return {
      isAxiosError: true,
      message: "Request failed with status code 500",
      response: { status: 500, headers, data: { message: "Internal error" } },
      config: { _requestId: requestId },
    };
  }

  it("prefers the id the backend echoed", () => {
    const error = extractApiError(axiosError({ "x-request-id": "server-id" }, "client-id"));
    expect(error.requestId).toBe("server-id");
    expect(error).toBeInstanceOf(ApiError);
  });

  it("falls back to the id the client sent when the response was lost", () => {
    expect(extractApiError(axiosError({}, "client-id")).requestId).toBe("client-id");
  });

  it("leaves requestId undefined when there was no request at all", () => {
    expect(extractApiError(new Error("boom")).requestId).toBeUndefined();
  });
});

describe("useHandleError", () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it("shows the request id in the toast so support can find the call", () => {
    const { result } = renderHook(() => useHandleError());
    act(() => {
      result.current({ message: "Could not save", status: 500, requestId: "0b6f4d3e" });
    });
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0][0]).toBe(
      "Server error. Please try again later. (reference: 0b6f4d3e)"
    );
  });

  it("keeps the message unchanged when there is no id to show", () => {
    const { result } = renderHook(() => useHandleError());
    act(() => {
      result.current({ message: "Nope", status: 404 });
    });
    expect(toastError.mock.calls[0][0]).toBe("Resource not found.");
  });

  it("does not append a reference to a plain string message", () => {
    const { result } = renderHook(() => useHandleError());
    act(() => {
      result.current("Offline");
    });
    expect(toastError.mock.calls[0][0]).toBe("Offline");
  });
});
