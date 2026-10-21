import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import ErrorBoundary from "@/components/ErrorBoundary";

vi.mock("@sentry/nextjs", () => ({
  getClient: vi.fn(),
  captureException: vi.fn(),
}));

function Boom(): never {
  throw new Error("widget exploded");
}

describe("ErrorBoundary Sentry reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("reports caught errors with the boundary tag and component stack", () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);
    render(
      <ErrorBoundary fallbackTitle="Revenue chart">
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [error, context] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect((error as Error).message).toBe("widget exploded");
    expect(context).toMatchObject({
      tags: { boundary: "Revenue chart" },
      contexts: { react: { componentStack: expect.any(String) } },
    });
  });

  it("falls back to a generic boundary tag", () => {
    vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(vi.mocked(Sentry.captureException).mock.calls[0][1]).toMatchObject({
      tags: { boundary: "widget" },
    });
  });

  it("does nothing when Sentry is not initialised", () => {
    vi.mocked(Sentry.getClient).mockReturnValue(undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
