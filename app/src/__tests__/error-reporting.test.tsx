import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import AppError from "@/app/error";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("app error reporting", () => {
  it("reports render failures to Sentry", async () => {
    const error = Object.assign(new Error("Unexpected render failure"), { digest: "error-id" });

    render(<AppError error={error} reset={vi.fn()} />);

    await waitFor(() => expect(Sentry.captureException).toHaveBeenCalledWith(error));
  });
});
