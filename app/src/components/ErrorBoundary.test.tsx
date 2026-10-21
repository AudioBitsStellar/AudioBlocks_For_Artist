import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

let shouldThrow = true;

function FlakyWidget() {
  if (shouldThrow) throw new Error("widget failed");
  return <div>widget ok</div>;
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    shouldThrow = true;
    vi.restoreAllMocks();
  });

  it("renders a fallback with a retry action and logs the error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackTitle="Failed to load Overview">
        <FlakyWidget />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Failed to load Overview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });

  it("renders the children again when Try Again is pressed after the failure clears", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <FlakyWidget />
      </ErrorBoundary>
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(screen.getByText("widget ok")).toBeInTheDocument();
  });
});
