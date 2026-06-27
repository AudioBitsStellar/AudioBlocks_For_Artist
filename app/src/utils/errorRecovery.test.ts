import { describe, it, expect } from "vitest";
import { isRetryableError, getErrorMessage } from "./errorRecovery";
import type { ApiError } from "@/api/axios";

function makeApiError(status: number, message = "error"): ApiError {
  return { status, message };
}

describe("isRetryableError", () => {
  it("treats status 0 (no network response) as retryable", () => {
    expect(isRetryableError(makeApiError(0))).toBe(true);
  });

  it.each([408, 429, 502, 503, 504])(
    "treats status %i as retryable",
    (status) => {
      expect(isRetryableError(makeApiError(status))).toBe(true);
    }
  );

  it.each([400, 401, 403, 404, 422])(
    "treats status %i as terminal (not retryable)",
    (status) => {
      expect(isRetryableError(makeApiError(status))).toBe(false);
    }
  );

  it("treats plain Error with 'network error' message as retryable", () => {
    expect(isRetryableError(new Error("Network Error"))).toBe(true);
  });

  it("treats plain Error with 'timeout' message as retryable", () => {
    expect(isRetryableError(new Error("timeout of 15000ms exceeded"))).toBe(true);
  });

  it("treats unknown non-network Error as terminal", () => {
    expect(isRetryableError(new Error("Unexpected token in JSON"))).toBe(false);
  });

  it("treats non-Error strings as terminal", () => {
    expect(isRetryableError("something went wrong")).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("extracts message from ApiError", () => {
    expect(getErrorMessage(makeApiError(500, "Internal Server Error"))).toBe(
      "Internal Server Error"
    );
  });

  it("extracts message from plain Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns string as-is", () => {
    expect(getErrorMessage("something failed")).toBe("something failed");
  });

  it("returns fallback for unknown types", () => {
    expect(getErrorMessage(null)).toBe("An unexpected error occurred");
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred");
    expect(getErrorMessage(42)).toBe("An unexpected error occurred");
  });
});
