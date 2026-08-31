import { describe, it, expect } from "vitest";
import { isRetryableError, isUserRejection, getErrorMessage, classifyError } from "./errorRecovery";
import type { ApiError } from "@/api/axios";

function makeApiError(status: number, message = "error"): ApiError {
  return { status, message } as ApiError;
}

describe("isRetryableError", () => {
  it("treats status 0 (no network response) as retryable", () => {
    expect(isRetryableError(makeApiError(0))).toBe(true);
  });

  it.each([408, 429, 502, 503, 504])("treats status %i as retryable", (status) => {
    expect(isRetryableError(makeApiError(status))).toBe(true);
  });

  it.each([400, 401, 403, 404, 422])("treats status %i as terminal (not retryable)", (status) => {
    expect(isRetryableError(makeApiError(status))).toBe(false);
  });

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

  it("reads the status from an axios-style { response: { status } } error", () => {
    expect(isRetryableError({ response: { status: 503 }, message: "boom" })).toBe(true);
    expect(isRetryableError({ response: { status: 400 }, message: "bad" })).toBe(false);
  });
});

describe("isUserRejection", () => {
  it.each([
    "User rejected the request",
    "Request rejected",
    "User declined to sign",
    "Transaction was denied",
    "The user cancelled the operation",
  ])("recognises %j as a wallet rejection", (message) => {
    expect(isUserRejection(new Error(message))).toBe(true);
  });

  it("does not flag an ordinary failure as a rejection", () => {
    expect(isUserRejection(new Error("network error"))).toBe(false);
    expect(isUserRejection(makeApiError(500, "Internal Server Error"))).toBe(false);
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

describe("classifyError", () => {
  it("classifies a wallet rejection as user-rejected (and not retryable)", () => {
    const plan = classifyError(new Error("User rejected the transaction"));
    expect(plan.kind).toBe("user-rejected");
    expect(plan.userRejected).toBe(true);
    expect(plan.retryable).toBe(false);
    expect(plan.message).toBe("User rejected the transaction");
  });

  it("classifies a transient transport failure as retryable", () => {
    const plan = classifyError(makeApiError(503, "Service Unavailable"));
    expect(plan.kind).toBe("retryable");
    expect(plan.retryable).toBe(true);
    expect(plan.userRejected).toBe(false);
  });

  it("classifies a 4xx validation failure as terminal", () => {
    const plan = classifyError(makeApiError(422, "Validation failed"));
    expect(plan.kind).toBe("terminal");
    expect(plan.retryable).toBe(false);
    expect(plan.userRejected).toBe(false);
    expect(plan.message).toBe("Validation failed");
  });

  it("classifies an unknown value as terminal with a safe fallback message", () => {
    const plan = classifyError(null);
    expect(plan.kind).toBe("terminal");
    expect(plan.message).toBe("An unexpected error occurred");
  });
});
